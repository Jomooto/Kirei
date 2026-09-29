import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Trash2, Eraser, Settings, SlidersHorizontal, Zap, AlertTriangle, CheckSquare, Square, XCircle, PieChart, Activity, ChevronUp, ChevronDown, RefreshCw, Loader2, WifiOff, Copy } from "lucide-react";
import { SystemMonitor } from "./SystemMonitor";
import { SettingsView } from "./SettingsView";
import { Language, getInitialLanguage, translations, optimizeDescriptions } from "./i18n";
import "./App.css";

const BeachballSpinner = ({ size = 20, className = "" }) => (
  <div className={`beachball-spinner ${className}`} style={{ width: size, height: size }}></div>
);

function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const languageRef = useRef(language);
  useEffect(() => { languageRef.current = language; }, [language]);
  const t = translations[language] || translations.es;

  const [activeTab, setActiveTab] = useState("clean");
  const [theme, setTheme] = useState("default");
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  
  const [isScanning, setIsScanning] = useState(false);

  const [scanResult, setScanResult] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  
  // Mole Installation State
  const [isMoleInstalled, setIsMoleInstalled] = useState<boolean | null>(null);
  const [isDownloadingMole, setIsDownloadingMole] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateFeedbackMsg, setUpdateFeedbackMsg] = useState<string | null>(null);
  const [engineVersion, setEngineVersion] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  
  // App Update State
  const [kireiUpdate, setKireiUpdate] = useState<{version: string, url: string} | null>(null);

  interface UpdateCheckResult {
    update_available: boolean;
    latest_version: string;
  }

  interface AnalyzeEntry {
    size: number;
    is_dir: boolean;
    path: string;
    name: string;
  }

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Space Analyzer State
  const [analyzePath, setAnalyzePath] = useState<string>("/Users/josafatmoralestoledo");
  
  // Terminal auto-scroll ref
  const logsEndRef = useRef<HTMLDivElement>(null);
  const isScanningRef = useRef(isScanning);
  const scanLogsRef = useRef<string[]>([]);
  const loadingTimeoutRef = useRef<any>(null);
  const isCancelledRef = useRef(false);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    languageRef.current = newLang;
    try {
      localStorage.setItem("kirei_language", newLang);
    } catch {}
  };

  const handleDownloadMole = () => {
    setIsDownloadingMole(true);
    setUiError(null);
    invoke("download_and_install_mole")
      .then(() => {
        setIsMoleInstalled(true);
        setUpdateAvailable(null);
        invoke("get_current_version").then(v => setEngineVersion(v as string)).catch(() => {});
      })
      .catch((err) => {
        console.error("Error al descargar mole:", err);
        setUiError(typeof err === "string" ? err : "Error al descargar el motor mole. Comprueba tu conexión a Internet.");
        setIsMoleInstalled(false);
      })
      .finally(() => {
        setIsDownloadingMole(false);
      });
  };

  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Listeners de Tauri para logs en tiempo real
  useEffect(() => {
    console.log("Registrando listeners de Tauri...");
    
    // Verificar si Mole está instalado
    invoke("get_active_mole_path_cmd")
      .then(() => {
        setTimeout(() => setIsMoleInstalled(true), 600);
        invoke("get_current_version").then(v => setEngineVersion(v as string)).catch(() => {});
        // Verificar actualizaciones en segundo plano
        invoke("check_for_updates")
          .then((res) => {
            const result = res as UpdateCheckResult;
            if (result.update_available) {
              setUpdateAvailable(result.latest_version);
            }
          })
          .catch(err => setUiError("Error comprobando actualizaciones: " + err));
      })
      .catch(() => {
        setIsMoleInstalled(false);
        // Descarga automática inicial si no se encuentra el motor
        handleDownloadMole();
      });
    
    // Verificación de Kirei en Git
    fetch("https://api.github.com/repos/Jomooto/Kirei/releases/latest")
      .then(res => res.json())
      .then(data => {
        if (data && data.tag_name && data.tag_name !== "v0.2.0" && data.tag_name !== "0.2.0") {
          const dmgAsset = data.assets?.find((a: any) => a.name.endsWith(".dmg"));
          const url = dmgAsset ? dmgAsset.browser_download_url : data.html_url;
          setKireiUpdate({ version: data.tag_name, url });
        }
      })
      .catch(() => {});
    
    const unlistenLogs = listen<string>("log-terminal", (event) => {
      setLogs(prev => [...prev, event.payload]);
      if (isScanningRef.current) {
        scanLogsRef.current.push(event.payload);
      }
    });

    const unlistenLogsOverwrite = listen<string>("log-terminal-overwrite", (event) => {
      setLogs(prev => {
        if (prev.length === 0) return [event.payload];
        const newLogs = [...prev];
        newLogs[newLogs.length - 1] = event.payload;
        return newLogs;
      });
      // Do not push to scanLogsRef to avoid parsing spinner text for stats
    });
    
    const unlistenEnd = listen<string>("proceso-terminado", (event) => {
      console.log("Evento proceso-terminado recibido:", event.payload);
      setLogs(prev => [...prev, `[SISTEMA] ${event.payload}`]);
      
      if (isCancelledRef.current) {
        isCancelledRef.current = false;
        setIsExecuting(false);
        setIsScanning(false);
        isScanningRef.current = false;
        return;
      }

      if (isScanningRef.current) {
        // Finalizó el escaneo, procesamos logs
        const allLines = scanLogsRef.current;
        let pathLines: string[] = [];
        const currentLang = languageRef.current;
        
        if (activeTabRef.current === "uninstall") {
          pathLines = allLines
            .map(l => l.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim())
            .filter(l => l.startsWith('○') || l.startsWith('➤ ○'))
            .map(l => {
              let clean = l.replace(/^➤?\s*○\s*/, '').trim();
              if (currentLang === "es") {
                clean = clean.replace(/\s+((?:[0-9.]+[a-zA-Z]+)|--)\s*\|\s*(.*)$/i, ' — $1 (Último uso: $2)');
                clean = clean.replace(/(\d+)\s*y ago/i, 'hace $1 años');
                clean = clean.replace(/(\d+)\s*m ago/i, 'hace $1 meses');
                clean = clean.replace(/(\d+)\s*d ago/i, 'hace $1 días');
              } else {
                clean = clean.replace(/\s+((?:[0-9.]+[a-zA-Z]+)|--)\s*\|\s*(.*)$/i, ' — $1 (Last used: $2)');
              }
              return clean;
            });
        } else if (activeTabRef.current === "purge") {
          pathLines = allLines
            .map(l => l.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim())
            .filter(l => l.includes('✓ [DRY RUN]'))
            .map(l => {
              const parts = l.split('✓ [DRY RUN]');
              return parts.length > 1 ? parts[1].trim() : l;
            });
        } else if (activeTabRef.current === "optimize") {
          const map = optimizeDescriptions[currentLang] || optimizeDescriptions.es;
          pathLines = allLines
            .map(l => l.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim())
            .filter(l => l.startsWith('➤'))
            .map(l => l.replace(/^➤\s*/, '').trim())
            .map(l => map[l] || l);
        } else if (activeTabRef.current === "analyze") {
          try {
            const fullText = allLines.map(l => l.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')).join("");
            const startIndex = fullText.indexOf('{');
            const endIndex = fullText.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) {
              const jsonBlob = fullText.substring(startIndex, endIndex + 1);
              const data = JSON.parse(jsonBlob);
              const entries: AnalyzeEntry[] = data.entries || [];
              entries.sort((a, b) => b.size - a.size);
              
              pathLines = entries.map((e) => {
                 let sizeStr = "";
                 if (e.size > 1024*1024*1024) sizeStr = (e.size / (1024*1024*1024)).toFixed(1) + "GB";
                 else if (e.size > 1024*1024) sizeStr = (e.size / (1024*1024)).toFixed(1) + "MB";
                 else sizeStr = (e.size / 1024).toFixed(1) + "KB";
                 
                 return `__ANALYZE__|${e.is_dir}|${e.path}|${e.name}|${sizeStr}`;
              });
              
              if (data.path && data.path !== "/Users/josafatmoralestoledo" && data.path !== "/") {
                const parentPath = data.path.substring(0, data.path.lastIndexOf('/')) || "/";
                pathLines.unshift(`__ANALYZE__|true|${parentPath}|.. (${translations[currentLang].goUp})|`);
              }
            }
          } catch(e) {
            console.error("Error parseando analyze:", e);
            pathLines = [translations[currentLang].errorProcessingDiskScan];
          }
        } else if (activeTabRef.current === "uninstall") {
          pathLines = allLines
            .map(l => l.replace(/\x1b\[[0-9;]*m/g, '').trim())
            .filter(l => !l.startsWith('NAME') && !l.startsWith('---') && !l.includes('application(s)') && l.length > 10)
            .filter(l => !l.includes('Scanning applications'))
            .filter(l => l.length > 0);
        } else {
          pathLines = allLines
            .map(l => l.replace(/\x1b\[[0-9;]*m/g, '').trim())
            .filter(l => (l.includes('/') || l.includes('~')) && !l.toLowerCase().includes('clean your mac') && !l.toLowerCase().includes('dry run'))
            .map(l => l.replace(/^↳\s*/, '').replace(/\*$/, '').trim())
            .filter(l => l.length > 0);
        }
        
        setScanResult(pathLines.length > 0 ? pathLines : []);
        
        // Pre-seleccionar todos los items para optimize
        if (activeTabRef.current === "optimize" && pathLines.length > 0) {
          setSelectedItems(new Set(pathLines.map((_, i) => i)));
        } else {
          setSelectedItems(new Set());
        }
        
        setIsScanning(false);
        isScanningRef.current = false;
      } else {
        // Finalizó ejecución destructiva
        setIsExecuting(false);
        setScanResult([translations[languageRef.current].processFinished]);
        setSelectedItems(new Set());
      }
    });

    return () => {
      console.log("Limpiando listeners de Tauri...");
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      unlistenLogs.then(f => f());
      unlistenLogsOverwrite.then(f => f());
      unlistenEnd.then(f => f());
    };
  }, []);

  const getModuleName = (tab: string) => {
    switch (tab) {
      case "clean": return t.tabClean;
      case "uninstall": return t.tabUninstall;
      case "purge": return t.tabPurge;
      case "optimize": return t.tabOptimize;
      case "analyze": return t.tabAnalyze;
      case "status": return t.tabStatus;
      case "settings": return t.tabSettings;
      default: return "";
    }
  };

  const getModuleDescription = (tab: string) => {
    switch (tab) {
      case "clean": return t.descClean;
      case "uninstall": return t.descUninstall;
      case "purge": return t.descPurge;
      case "optimize": return t.descOptimize;
      case "analyze": return t.descAnalyze;
      case "status": return t.descStatus;
      case "settings": return t.descSettings;
      default: return t.descDefault;
    }
  };

  const handleCheckUpdatesManually = () => {
    setIsCheckingUpdate(true);
    setUpdateFeedbackMsg(null);
    invoke("check_for_updates")
      .then((res) => {
        const result = res as UpdateCheckResult;
        if (result.update_available) {
          setUpdateAvailable(result.latest_version);
          setUpdateFeedbackMsg(`v${result.latest_version} ${t.updateAvailableShort}`);
        } else {
          setUpdateFeedbackMsg(`${t.engineUpToDate} (v${result.latest_version})`);
        }
      })
      .catch((err) => {
        setUpdateFeedbackMsg(t.errorCheckingUpdates);
        setUiError("Error comprobando actualizaciones: " + err);
      })
      .finally(() => {
        setIsCheckingUpdate(false);
        setTimeout(() => setUpdateFeedbackMsg(null), 4000);
      });
  };

  const handleScan = async (path?: string | React.MouseEvent) => {
    const targetPath = typeof path === 'string' ? path : analyzePath;

    setIsScanning(true);
    isScanningRef.current = true;
    
    if (activeTab !== "analyze" || typeof path !== "string") {
      setScanResult([]);
    }
    
    setSelectedItems(new Set());
    setLogs([]);
    scanLogsRef.current = [];
    setIsTerminalExpanded(false);
    
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    try {
      if (activeTab === "clean") {
        invoke("run_mole_command", { 
          command: "clean", 
          args: ["--dry-run"] 
        }).catch(err => setUiError("Error al analizar: " + err));
      } else if (activeTab === "optimize") {
        invoke("run_mole_command", { 
          command: "optimize", 
          args: ["--dry-run"] 
        }).catch(err => setUiError("Error al optimizar: " + err));
      } else if (activeTab === "analyze") {
        invoke("run_mole_command", {
          command: "analyze",
          args: ["-json", targetPath]
        }).catch(err => setUiError("Error al analizar espacio: " + err));
      } else if (activeTab === "uninstall") {
        invoke("run_mole_command", { 
          command: "uninstall", 
          args: ["--dry-run"] 
        }).catch(err => setUiError("Error al buscar apps: " + err));
      } else if (activeTab === "purge") {
        invoke("run_mole_command", { 
          command: "purge", 
          args: ["--dry-run"] 
        }).catch(err => setUiError("Error al purgar: " + err));
      }
    } catch (e) {
      console.error("Error al disparar escaneo:", e);
      setIsScanning(false);
      isScanningRef.current = false;
    }
  };

  const toggleSelection = (index: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedItems.size > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(scanResult.map((_, i) => i)));
    }
  };

  const handleCancelScan = () => {
    isCancelledRef.current = true;
    setIsScanning(false);
    isScanningRef.current = false;
    setIsExecuting(false);
    setScanResult([]);
    detenerProceso();
  };

  const executeCleanup = async () => {
    setShowModal(false);
    setIsExecuting(true);
    setLogs([]);
    setIsTerminalExpanded(false);

    const itemsToProcess = Array.from(selectedItems).map(idx => scanResult[idx]);

    try {
      if (activeTab === "clean") {
        await invoke("run_mole_command", { 
          command: "clean", 
          args: [] 
        });
      } else if (activeTab === "optimize") {
        const reverseMap: Record<string, string> = {
          "Limpiar la caché de DNS (arregla problemas de navegación si algunas páginas no cargan).": "DNS & Spotlight Check",
          "Reconstruir los íconos y QuickLook (si alguna vez has visto aplicaciones con íconos rotos o en blanco).": "Finder Cache Refresh",
          "Liberar RAM inactiva (Memory Optimization).": "Memory Optimization",
          "Reparar permisos (arregla errores de 'No tienes permiso para abrir esto').": "Permission Repair",
          "Flush DNS cache (fixes web browsing issues when some websites fail to load).": "DNS & Spotlight Check",
          "Rebuild icons and QuickLook caches (fixes blank or broken app icons).": "Finder Cache Refresh",
          "Purge inactive RAM memory (Memory Optimization).": "Memory Optimization",
          "Repair system permissions (fixes 'Permission denied' opening errors).": "Permission Repair"
        };

        const originalTasks = itemsToProcess.map(item => reverseMap[item] || item);
        await invoke("run_mole_command", {
          command: "optimize",
          args: originalTasks
        });
      } else if (activeTab === "analyze") {
        const pathsToDelete = itemsToProcess
          .filter(line => line.startsWith("__ANALYZE__|"))
          .map(line => line.split("|")[2]);

        await invoke("run_mole_command", {
          command: "trash",
          args: pathsToDelete
        });
        
        handleScan(analyzePath);
      } else if (activeTab === "uninstall") {
        const appNames = itemsToProcess.map(line => {
          const match = line.match(/^([^\s—]+)/);
          return match ? match[1].trim() : line.trim();
        });

        await invoke("run_mole_command", {
          command: "uninstall",
          args: appNames
        });
      } else if (activeTab === "purge") {
        await invoke("run_mole_command", {
          command: "purge",
          args: []
        });
      }
    } catch (e) {
      console.error("Error al ejecutar acción destructiva:", e);
      setLogs(prev => [...prev, `[ERROR] No se pudo completar la acción: ${e}`]);
      setIsExecuting(false);
    }
  };

  const detenerProceso = () => {
    invoke("kill_current_process")
      .then(() => {
        setIsExecuting(false);
        setIsScanning(false);
        isScanningRef.current = false;
      })
      .catch((err) => {
        console.error("Error al detener proceso:", err);
      });
  };

  const getThemeClasses = () => {
    switch(theme) {
      case "light": return "theme-light bg-white backdrop-blur-md text-black";
      case "dark": return "theme-dark bg-neutral-950/90 backdrop-blur-xl text-neutral-100";
      default: return "theme-default bg-gradient-to-br from-indigo-950 via-purple-950 to-neutral-950/80 backdrop-blur-xl text-white";
    }
  };

  const iconSrc = theme === "light" ? "/icon_black.svg" : "/icon_white.svg";

  return (
    <div data-tauri-drag-region="true" className={`flex h-screen w-full font-sans antialiased select-none overflow-hidden ${getThemeClasses()}`}>
      
      {/* Sidebar */}
      <div data-tauri-drag-region="true" className="w-64 flex-shrink-0 pt-6 px-4 pb-4 border-r border-white/10 flex flex-col gap-2 relative z-10 bg-black/20">
        <div data-tauri-drag-region="true" className="flex justify-center mb-6 mt-2 pointer-events-none">
          <img src={iconSrc} alt="Kirei Logo" className="h-16 w-auto drop-shadow-lg" />
        </div>
        <div data-tauri-drag-region="true" className="mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider pl-3">
          {t.tools}
        </div>
        
        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("clean"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "clean" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Eraser size={18} />
          {t.tabClean}
        </button>

        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("uninstall"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "uninstall" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Trash2 size={18} />
          {t.tabUninstall}
        </button>

        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("purge"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "purge" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Zap size={18} />
          {t.tabPurge}
        </button>

        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("optimize"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "optimize" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <SlidersHorizontal size={18} />
          {t.tabOptimize}
        </button>

        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("analyze"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "analyze" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <PieChart size={18} />
          {t.tabAnalyze}
        </button>

        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("status"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "status" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Activity size={18} />
          {t.tabStatus}
        </button>

        {/* Settings Tab at the bottom of the Sidebar */}
        <div className="mt-auto border-t border-white/10 pt-2">
          <button 
            onClick={() => { if(!isExecuting) { setActiveTab("settings"); setScanResult([]); } }}
            disabled={isExecuting}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "settings" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Settings size={18} />
            {t.tabSettings}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div data-tauri-drag-region="true" className="flex-1 flex flex-col pt-10 px-8 pb-8 relative overflow-hidden bg-gradient-to-br from-black/10 to-black/30">
        <div data-tauri-drag-region="true" className="flex-1 flex flex-col items-center justify-center text-center h-full max-h-full min-h-0 w-full max-w-4xl mx-auto">
          
          <h1 data-tauri-drag-region="true" className="text-3xl font-bold mb-2 tracking-tight flex-shrink-0 drop-shadow-md cursor-default">{getModuleName(activeTab)}</h1>
          
          {uiError && (
            <div className="w-full bg-red-500/20 text-red-300 px-4 py-3 rounded-lg mb-4 flex items-center justify-between border border-red-500/30">
              <span className="flex items-center gap-2 font-medium">
                <AlertTriangle size={18} /> {uiError}
              </span>
              <button onClick={() => setUiError(null)} className="hover:bg-red-500/20 p-1 rounded-md transition-colors"><XCircle size={16} /></button>
            </div>
          )}

          {activeTab === "settings" ? (
            <SettingsView
              language={language}
              onLanguageChange={handleLanguageChange}
              theme={theme}
              onThemeChange={setTheme}
              engineVersion={engineVersion}
              isCheckingUpdate={isCheckingUpdate}
              updateFeedbackMsg={updateFeedbackMsg}
              onCheckUpdates={handleCheckUpdatesManually}
              isDownloadingMole={isDownloadingMole}
              onDownloadMole={handleDownloadMole}
              kireiUpdate={kireiUpdate}
            />
          ) : isMoleInstalled === false || isMoleInstalled === null ? (
            <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto my-auto text-center animate-in fade-in duration-300">
              {isDownloadingMole || isMoleInstalled === null ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center mb-5 shadow-lg">
                    <Loader2 className="animate-spin text-white/80" size={26} />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight text-white mb-1.5">
                    {t.setupTitle}
                  </h2>
                  <p className="text-xs text-white/50 max-w-xs mb-5 leading-relaxed">
                    {t.setupSubtitle}
                  </p>
                  
                  {/* Barra de progreso sutil estilo macOS */}
                  <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white/60 rounded-full animate-pulse w-3/4"></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md flex items-center justify-center mb-5 shadow-lg text-amber-400">
                    <WifiOff size={26} />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight text-white mb-1.5">
                    {t.connectionRequired}
                  </h2>
                  <p className="text-xs text-white/50 max-w-xs mb-6 leading-relaxed">
                    {t.connectionRequiredSubtitle}
                  </p>
                  
                  <button
                    onClick={handleDownloadMole}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/15 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>{t.retryDownload}</span>
                  </button>
                </>
              )}
            </div>
          ) : activeTab === "status" ? (
            <SystemMonitor language={language} />
          ) : scanResult.length === 0 && !isExecuting ? (
            <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto mt-8">
              <p className="text-white/60 mb-8 max-w-md">{getModuleDescription(activeTab)}</p>
              
              {/* Botón Principal (Escaneo/Cancelación) */}
              {!isScanning ? (
                <button
                  onClick={handleScan}
                  className={`px-8 py-3.5 rounded-full font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                    theme === 'default' 
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' 
                      : theme === 'light'
                        ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200/50 shadow-sm'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {t.btnScanSystem}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={handleCancelScan}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <BeachballSpinner size={16} /> 
                    {t.btnCancelScan}
                  </button>
                </div>
              )}

              {/* Botón flotante para expandir terminal */}
              {!isTerminalExpanded && (isScanning || logs.length > 0) && (
                <button 
                  onClick={() => setIsTerminalExpanded(true)}
                  className="absolute bottom-6 right-6 z-50 bg-black/40 hover:bg-black/60 text-white/80 p-2 rounded-full backdrop-blur-md transition-all shadow-lg border border-white/10 active:scale-95"
                  title={t.showTerminalTooltip}
                >
                  <ChevronUp size={20} />
                </button>
              )}

              {/* Terminal Visual (Solo visible si isTerminalExpanded) */}
              {isTerminalExpanded && ((isScanning) || (!isScanning && logs.length > 0)) && (
                <div className="w-full mt-8 bg-black/90 border border-gray-700 rounded-lg overflow-hidden shadow-2xl relative">
                  <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 border-b border-gray-700 flex justify-between items-center">
                    <span>{t.terminalTitle}</span>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => navigator.clipboard.writeText(logs.join('\n'))}
                        className="hover:text-white transition-colors flex items-center gap-1 active:scale-95"
                        title={t.copyLogs}
                      >
                        <Copy size={14} />
                        {t.copyLogs}
                      </button>
                      <span>{isScanning ? t.runningStatus : t.stoppedStatus}</span>
                      <button onClick={() => setIsTerminalExpanded(false)} className="hover:text-white transition-colors ml-2">
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Contenedor de Logs con Scroll */}
                  <div className="h-48 p-4 overflow-y-auto font-mono text-sm text-green-400 select-text">
                    {logs.length === 0 ? (
                      <div className="text-gray-500 italic">{t.waitingSystemOutput}</div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="break-all whitespace-pre-wrap mb-1 text-left">
                          {log}
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col flex-1 min-h-0 pt-4">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <span className="text-sm font-medium text-white/70">
                  {scanResult.length === 1 ? t.pathsFoundSingular : `${scanResult.length} ${t.pathsFoundPlural}`}
                </span>
                {!isExecuting && scanResult.length > 1 && !(activeTab === "analyze" && analyzePath.includes("/Library")) && (
                  <button 
                    onClick={selectAll}
                    className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors font-medium"
                  >
                    {selectedItems.size > 0 ? t.btnDeselectAll : t.btnSelectAll}
                  </button>
                )}
              </div>
              
              {/* Contenedor con Scroll de la Lista o el Terminal */}
              <div className="flex-1 flex flex-col overflow-hidden mb-6 min-h-0 shadow-inner">
                {isExecuting ? (
                  <div className="flex-1 bg-black text-green-400 font-mono text-sm overflow-y-auto p-4 rounded-xl border border-white/10 text-left flex flex-col">
                    {logs.map((log, idx) => (
                      <div key={idx} className={`${log.startsWith('[ERROR]') ? 'text-red-400' : log.startsWith('[SISTEMA]') ? 'text-blue-300 font-bold' : ''}`}>
                        {log}
                      </div>
                    ))}
                    {/* Elemento vacío al final para el auto-scroll */}
                    <div ref={logsEndRef} />
                  </div>
                ) : (
                  <div className={`flex-1 overflow-y-auto bg-black/40 rounded-xl border border-white/10 p-2 text-left h-full transition-opacity duration-200 ${isScanning ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    {scanResult.map((line, idx) => {
                      if (line.startsWith("__ANALYZE__|")) {
                        const parts = line.split("|");
                        const isDir = parts[1] === "true";
                        const path = parts[2];
                        const name = parts[3];
                        const size = parts[4];
                        const isNavBtn = name.includes(t.goUp) || name.includes("Volver arriba");
                        const isLibrary = path.includes("/Library");
                        
                        return (
                          <div 
                            key={idx} 
                            className={`flex items-start gap-3 p-3 rounded-lg transition-colors border-b border-white/5 last:border-0 hover:bg-white/10`}
                          >
                            {!isNavBtn ? (
                              <div 
                                className={`mt-0.5 flex-shrink-0 ${isLibrary ? 'text-red-400 cursor-not-allowed' : 'text-blue-400 cursor-pointer'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isLibrary) {
                                    alert(t.libraryAlert);
                                    return;
                                  }
                                  toggleSelection(idx);
                                }}
                                title={isLibrary ? t.protectedBySystem : t.selectToDelete}
                              >
                                {isLibrary ? <AlertTriangle size={18} /> : selectedItems.has(idx) ? <CheckSquare size={18} /> : <Square size={18} className="text-white/30" />}
                              </div>
                            ) : (
                              <div className="w-[18px] flex-shrink-0" />
                            )}
                            
                            <div 
                              onClick={() => {
                                if (isDir) {
                                  setAnalyzePath(path);
                                  handleScan(path);
                                }
                              }}
                              className={`flex-1 flex gap-2 ${isDir ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <div className="mt-0.5 text-blue-400 flex-shrink-0">
                                {isDir ? "📁" : "📄"}
                              </div>
                              <span className="text-sm font-mono break-all opacity-90 leading-relaxed select-text flex-1">{name}</span>
                              <span className="text-sm font-mono text-white/50">{size}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={idx} 
                          onClick={() => toggleSelection(idx)}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="mt-0.5 text-blue-400 flex-shrink-0">
                            {selectedItems.has(idx) ? <CheckSquare size={18} /> : <Square size={18} className="text-white/30" />}
                          </div>
                          <span className="text-sm font-mono break-all opacity-90 leading-relaxed select-text">{line}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botones Fijos Inferiores */}
              <div className="flex justify-center gap-4 flex-shrink-0">
                {!isExecuting ? (
                  <>
                    <button 
                      onClick={() => {
                        if (activeTab === "analyze") {
                          setAnalyzePath("/Users/josafatmoralestoledo");
                          handleScan("/Users/josafatmoralestoledo");
                        } else {
                          setScanResult([]);
                        }
                      }}
                      disabled={activeTab === "analyze" && analyzePath === "/Users/josafatmoralestoledo"}
                      className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-medium py-3 px-8 rounded-full transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {t.btnHome}
                    </button>
                    <button 
                      onClick={() => setShowModal(true)}
                      disabled={selectedItems.size === 0}
                      className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      {activeTab === "analyze" ? t.btnTrash : t.btnDelete} ({selectedItems.size})
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={detenerProceso}
                    className="bg-red-600 hover:bg-red-500 text-white font-medium py-3 px-8 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all flex items-center gap-2 animate-pulse hover:animate-none"
                  >
                    <XCircle size={18} />
                    {t.btnStopCancel}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Advertencia */}
      {showModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl transform scale-100 animate-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 text-red-500 mb-4 mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">
              {activeTab === "analyze" ? t.modalAnalyzeTitle : t.modalGeneralTitle}
            </h3>
            <p className="text-white/70 text-center text-sm mb-6">
              {activeTab === "analyze" 
                ? t.modalAnalyzeDesc
                : t.modalGeneralDesc}
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={executeCleanup}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                {activeTab === "analyze" ? t.modalBtnAnalyze : t.modalBtnGeneral}
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="w-full bg-white/10 hover:bg-white/15 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {t.modalBtnCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Actualización estilo Advertencia */}
      {updateAvailable && !isDownloadingMole && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-[#f59e0b] border-2 border-black text-black p-3.5 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-black text-[#f59e0b] rounded-lg">
              <AlertTriangle size={18} strokeWidth={2.8} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-black tracking-tight">{t.newEngineVersion} ({updateAvailable})</p>
              <p className="text-[11px] font-bold text-black/80">{t.updateEnginePrompt}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDownloadMole}
              className="text-xs bg-black hover:bg-neutral-900 text-[#f59e0b] px-3 py-1.5 rounded-lg font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              {t.btnUpdate}
            </button>
            <button 
              onClick={() => setUpdateAvailable(null)}
              className="text-xs bg-black/10 hover:bg-black/20 text-black px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
            >
              {t.btnClose}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
