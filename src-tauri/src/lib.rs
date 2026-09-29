use tauri::Manager;
use tauri::State;
use tauri::Emitter;
use std::sync::{Arc, Mutex};
use std::process::{Command, Child};
use std::io::{BufReader, BufRead};
use std::fs;
use serde_json::Value;
use std::time::Duration;

struct ProcessState(Arc<Mutex<Option<Child>>>);

fn get_executable_sidecar_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let bin_dir = app_dir.join("bin");

    let mole_dir = bin_dir.join("mole");
    if mole_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&mole_dir) {
            for entry in entries.flatten() {
                let mole_bin = entry.path().join("bin").join("mole");
                if mole_bin.exists() {
                    return Ok(mole_bin);
                }
            }
        }
    }

    let bin_path = bin_dir.join("mo");
    if bin_path.exists() {
        return Ok(bin_path);
    }

    Err("El motor de limpieza no está instalado.".to_string())
}

#[tauri::command]
fn detener_proceso(state: State<'_, ProcessState>) -> Result<(), String> {
    let mut process_state = state.0.lock().map_err(|_| "Fallo al adquirir el candado del proceso.")?;
    if let Some(mut child) = process_state.take() {
        let _ = child.kill();
    }
    Ok(())
}

fn escape_arg(arg: &str) -> String {
    format!("'{}'", arg.replace("'", "'\\''"))
}

fn escape_applescript(arg: &str) -> String {
    arg.replace("\\", "\\\\").replace("\"", "\\\"")
}

#[tauri::command]
async fn run_mole_scan(app: tauri::AppHandle, module: String) -> Result<String, String> {
    let allowed_modules = ["clean", "uninstall", "purge", "optimize", "analyze"];
    if !allowed_modules.contains(&module.as_str()) {
        return Err("Módulo no permitido por razones de seguridad.".into());
    }

    let sidecar_path = get_executable_sidecar_path(&app)?;
    let path_str = sidecar_path.to_string_lossy();

    let cmd_str = format!("{} {} --dry-run", escape_arg(&path_str), escape_arg(&module));
    let script = format!("do shell script \"{}\" with administrator privileges", escape_applescript(&cmd_str));

    let output = Command::new("osascript")
        .current_dir("/") 
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| e.to_string())?;
        
    if output.status.success() {
        Ok(String::from_utf8(output.stdout).unwrap_or_default())
    } else {
        Err(String::from_utf8(output.stderr).unwrap_or_default())
    }
}

#[tauri::command]
async fn ejecutar_con_logs(
    app: tauri::AppHandle,
    state: State<'_, ProcessState>,
    module: String,
    targets: Vec<String>
) -> Result<(), String> {
    let allowed_modules = ["clean", "uninstall", "purge", "optimize", "analyze"];
    if !allowed_modules.contains(&module.as_str()) {
        return Err("Módulo no permitido por razones de seguridad.".into());
    }

    for target_path in &targets {
        if target_path.contains("..") {
            return Err("Posible Path Traversal detectado. Abortando.".into());
        }
    }

    let sidecar_path = get_executable_sidecar_path(&app)?;
    let path_str = sidecar_path.to_string_lossy();

    let mut safe_args = vec![escape_arg(&module)];
    for t in targets {
        safe_args.push(escape_arg(&t));
    }
    let args_joined = safe_args.join(" ");

    let log_file = "/tmp/mac_cleaner_run.log";
    let _ = std::fs::remove_file(log_file);
    let _ = std::fs::File::create(log_file);

    let command_to_show = format!("$ sudo mole {}", args_joined);
    let _ = app.emit("log-terminal", command_to_show);
    let _ = app.emit("log-terminal", String::from("... Esperando permisos de administrador (Touch ID o Contraseña) ..."));

    let shell_cmd = if module == "uninstall" || module == "purge" {
        format!("cd / && script -q /dev/null {} {} > {} 2>&1", escape_arg(&path_str), args_joined, log_file)
    } else {
        format!("cd / && {} {} > {} 2>&1", escape_arg(&path_str), args_joined, log_file)
    };

    let script = format!("do shell script \"{}\" with administrator privileges", escape_applescript(&shell_cmd));

    let mut cmd = Command::new("osascript");
    cmd.arg("-e").arg(&script);

    let child = cmd.spawn().map_err(|e| format!("Error iniciando proceso: {}", e))?;

    let process_arc = state.0.clone();
    {
        let mut process_state = process_arc.lock().map_err(|_| "Fallo al adquirir el candado.")?;
        *process_state = Some(child);
    }

    let app_poll = app.clone();
    std::thread::spawn(move || {
        let mut file = std::fs::File::open(log_file);
        while file.is_err() {
            std::thread::sleep(std::time::Duration::from_millis(100));
            file = std::fs::File::open(log_file);
        }
        
        let mut reader = BufReader::new(file.unwrap_or_else(|_| std::fs::File::open("/dev/null").unwrap()));
        let mut buffer = String::new();
        
        loop {
            let mut is_alive = true;
            if let Ok(mut guard) = process_arc.lock() {
                if let Some(child) = guard.as_mut() {
                    match child.try_wait() {
                        Ok(Some(status)) => {
                            is_alive = false;
                            if !status.success() {
                                let _ = app_poll.emit("log-terminal", "[SISTEMA] Operación cancelada o fallida.");
                            }
                        }
                        Ok(None) => {}
                        Err(_) => { is_alive = false; }
                    }
                } else {
                    is_alive = false;
                }
            }

            buffer.clear();
            match reader.read_line(&mut buffer) {
                Ok(n) if n > 0 => {
                    let mut clean_line = buffer.trim_end().to_string();
                    clean_line = clean_line.replace("\r", "");
                    if !clean_line.is_empty() {
                        let _ = app_poll.emit("log-terminal", clean_line);
                    }
                }
                _ => {
                    if !is_alive {
                        while let Ok(n) = reader.read_line(&mut buffer) {
                            if n == 0 { break; }
                            let mut clean_line = buffer.trim_end().to_string();
                            clean_line = clean_line.replace("\r", "");
                            if !clean_line.is_empty() {
                                let _ = app_poll.emit("log-terminal", clean_line);
                            }
                            buffer.clear();
                        }
                        let _ = app_poll.emit("proceso-terminado", "Proceso finalizado.");
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn eliminar_rutas_manual(_app: tauri::AppHandle, targets: Vec<String>) -> Result<(), String> {
    if targets.is_empty() {
        return Ok(());
    }

    let mut script_cmd = String::from("mv ");
    for target in targets {
        if target == "/" || target == "/System" || target == "/Library" || target == "/Users" {
            return Err(format!("Operación denegada por seguridad: {}", target));
        }
        script_cmd.push_str(&format!("{} ", escape_arg(&target)));
    }
    
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/josafatmoralestoledo".to_string());
    script_cmd.push_str(&escape_arg(&format!("{}/.Trash", home)));

    let script = format!("do shell script \"{}\" with administrator privileges", escape_applescript(&script_cmd));

    let output = Command::new("osascript").arg("-e").arg(&script).output().map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn get_system_status(app: tauri::AppHandle) -> Result<String, String> {
    let sidecar_path = get_executable_sidecar_path(&app)?;
    let output = Command::new(&sidecar_path)
        .arg("status")
        .arg("-json")
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[derive(serde::Serialize, Clone)]
struct UpdateCheckResult {
    update_available: bool,
    latest_version: String,
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    let url = "https://formulae.brew.sh/api/formula/mole.json";
    let client = reqwest::Client::builder().timeout(Duration::from_secs(10)).build().map_err(|e| e.to_string())?;
    let res = client.get(url).send().await.map_err(|e| format!("Error de red: {}", e))?;
    let res = res.error_for_status().map_err(|e| format!("HTTP Error: {}", e))?;
    let json: Value = res.json().await.map_err(|e| e.to_string())?;
    
    let latest_version = json["versions"]["stable"]
        .as_str()
        .ok_or("No se pudo obtener versions.stable")?
        .to_string();

    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("/tmp"));
    let version_file = app_dir.join("bin").join("version.txt");

    let mut update_available = true;
    if version_file.exists() {
        if let Ok(current_version) = fs::read_to_string(&version_file) {
            if current_version.trim() == latest_version {
                update_available = false;
            }
        }
    }

    Ok(UpdateCheckResult {
        update_available,
        latest_version,
    })
}

#[tauri::command]
fn get_current_version(app: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("/tmp"));
    let version_file = app_dir.join("bin").join("version.txt");
    if version_file.exists() {
        if let Ok(current_version) = std::fs::read_to_string(&version_file) {
            return Ok(current_version.trim().to_string());
        }
    }
    Ok("Desconocida".to_string())
}

#[tauri::command]
fn get_active_mole_path_cmd(app: tauri::AppHandle) -> Result<String, String> {
    let bin_path = get_executable_sidecar_path(&app)?;
    Ok(bin_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn download_and_install_mole(app: tauri::AppHandle) -> Result<(), String> {
    let url = "https://formulae.brew.sh/api/formula/mole.json";
    let client = reqwest::Client::builder().timeout(Duration::from_secs(30)).build().map_err(|e| e.to_string())?;
    let res = client.get(url).send().await.map_err(|e| format!("Error de red: {}", e))?;
    let res = res.error_for_status().map_err(|e| format!("HTTP Error: {}", e))?;
    let json: Value = res.json().await.map_err(|e| e.to_string())?;
    
    let latest_version = json["versions"]["stable"]
        .as_str()
        .ok_or("No se pudo obtener versions.stable")?
        .to_string();

    let files = json["bottle"]["stable"]["files"]
        .as_object()
        .ok_or("No se encontraron bottles")?;

    let mut download_url = String::new();
    
    for (k, v) in files {
        if cfg!(target_arch = "aarch64") && k.starts_with("arm64_") {
            download_url = v["url"].as_str().unwrap_or("").to_string();
            break;
        }
        if cfg!(target_arch = "x86_64") && !k.starts_with("arm64_") {
            download_url = v["url"].as_str().unwrap_or("").to_string();
            break;
        }
    }

    if download_url.is_empty() {
        return Err("No se encontró un binario para la arquitectura de este equipo.".to_string());
    }

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let bin_dir = app_dir.join("bin");
    fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;

    let tar_gz_path = bin_dir.join("mole.tar.gz");
    let response = client.get(&download_url)
        .header("Authorization", "Bearer QQ==")
        .send().await.map_err(|e| e.to_string())?;
        
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    use std::io::Write;
    let mut file = fs::File::create(&tar_gz_path).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;

    let tar_gz = fs::File::open(&tar_gz_path).map_err(|e| e.to_string())?;
    let tar = flate2::read::GzDecoder::new(tar_gz);
    let mut archive = tar::Archive::new(tar);
    
    // Extraer todo el paquete (incluyendo libexec) para que funcione
    archive.unpack(&bin_dir).map_err(|e| e.to_string())?;

    let _ = fs::remove_file(&tar_gz_path);

    // Buscar el binario y darle permisos
    let mole_dir = bin_dir.join("mole").join(&latest_version);
    let target_bin = mole_dir.join("bin").join("mole");

    use std::os::unix::fs::PermissionsExt;
    if let Ok(mut perms) = fs::metadata(&target_bin).map(|m| m.permissions()) {
        perms.set_mode(0o755);
        let _ = fs::set_permissions(&target_bin, perms);
    }

    // También dar permisos a libexec
    let libexec_bin = mole_dir.join("libexec").join("bin");
    if let Ok(entries) = fs::read_dir(&libexec_bin) {
        for entry in entries.flatten() {
            if let Ok(mut p) = fs::metadata(entry.path()).map(|m| m.permissions()) {
                p.set_mode(0o755);
                let _ = fs::set_permissions(entry.path(), p);
            }
        }
    }

    // PATCH: Remove EUID block from mole so it can run via osascript with administrator privileges
    let mole_libexec = mole_dir.join("libexec");
    let patch_cmd = format!(
        "find \"{}\" -type f \\( -name \"*.sh\" -o -name \"mole\" \\) -print0 | xargs -0 sed -i '' 's/if \\[\\[ \"$EUID\" -eq 0 \\]\\]; then/if false; then/g'",
        mole_libexec.to_string_lossy()
    );
    let _ = Command::new("bash").arg("-c").arg(&patch_cmd).output();

    let version_file = bin_dir.join("version.txt");
    let _ = fs::write(version_file, latest_version);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ProcessState(Arc::new(Mutex::new(None))))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
                    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_mole_scan, 
            ejecutar_con_logs, 
            detener_proceso,
            eliminar_rutas_manual,
            get_system_status,
            check_for_updates,
            get_active_mole_path_cmd,
            download_and_install_mole,
            get_current_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;

    #[test]
    fn test_byte_reader_carriage_return() {
        // Simulamos el output de mole con múltiples \r
        let mock_output = b"Start\r\rLoading 10%\rLoading 20%\nDone\n";
        let mut reader = std::io::BufReader::new(&mock_output[..]);
        
        let mut buffer = Vec::new();
        let mut byte = [0u8; 1];
        let mut lines_extracted = Vec::new();

        while let Ok(n) = reader.read(&mut byte) {
            if n == 0 { break; }
            let b = byte[0];
            
            if b == b'\n' || b == b'\r' {
                if !buffer.is_empty() {
                    if let Ok(l) = String::from_utf8(buffer.clone()) {
                        lines_extracted.push(l);
                    }
                    buffer.clear();
                }
            } else {
                buffer.push(b);
            }
        }

        assert_eq!(lines_extracted.len(), 4);
        assert_eq!(lines_extracted[0], "Start");
        assert_eq!(lines_extracted[1], "Loading 10%");
        assert_eq!(lines_extracted[2], "Loading 20%");
        assert_eq!(lines_extracted[3], "Done");
    }
    #[test]
    fn test_escape_arg() {
        assert_eq!(escape_arg("normal"), "'normal'");
        assert_eq!(escape_arg("with'quote"), "'with'\\''quote'");
    }

    #[test]
    fn test_escape_applescript() {
        assert_eq!(escape_applescript("normal"), "normal");
        assert_eq!(escape_applescript(r#"with "quotes" and \ slash"#), r#"with \"quotes\" and \\ slash"#);
    }
}
