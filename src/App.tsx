import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Trash2, Eraser, Settings, Zap, AlertTriangle, CheckSquare, Square, XCircle, PieChart, Activity, ChevronUp, ChevronDown, RefreshCw, Loader2, WifiOff } from "lucide-react";
import { SystemMonitor } from "./SystemMonitor";
import "./App.css";

const BeachballSpinner = ({ size = 20, className = "" }) => (
  <div className={`beachball-spinner ${className}`} style={{ width: size, height: size }}></div>
);

function App() {
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



  
  // Estados para el Terminal
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [analyzePath, setAnalyzePath] = useState<string>("/Users/josafatmoralestoledo");
  const logsEndRef = useRef<HTMLDivElement>(null);

  // useRef para evitar actualizar estado si el componente se desmonta o el usuario cambia de pestaña rápido
  const isMounted = useRef(true);

  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const isScanningRef = useRef(false);
  const scanLogsRef = useRef<string[]>([]);
  const isCancelledRef = useRef(false);

  const handleDownloadMole = async () => {
    setIsDownloadingMole(true);
    setUiError(null);
    try {
      await invoke("download_and_install_mole");
      setTimeout(() => {
        setIsMoleInstalled(true);
        setUpdateAvailable(null);
        invoke("get_current_version").then(v => setEngineVersion(v as string)).catch(() => {});
      }, 600);
    } catch (e) {
      setUiError(String(e));
    } finally {
      setIsDownloadingMole(false);
    }
  };

  // Auto-scroll del terminal
  useEffect(() => {
    if (logsEndRef.current && isTerminalExpanded) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isTerminalExpanded]);

  // Escuchar eventos del backend
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
    
    const unlistenLogs = listen<string>("log-terminal", (event) => {
      console.log("Evento log-terminal recibido:", event.payload);
      setLogs(prev => {
        const newLogs = [...prev, event.payload];
        return newLogs;
      });
      if (isScanningRef.current) {
        scanLogsRef.current.push(event.payload);
      }
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
        
        if (activeTabRef.current === "uninstall" || activeTabRef.current === "purge") {
          pathLines = allLines
            .map(l => l.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim())
            .filter(l => l.startsWith('○') || l.startsWith('➤ ○'))
            .map(l => {
              let clean = l.replace(/^➤?\s*○\s*/, '').trim();
              // Parsear y formatear la fecha y el peso
              clean = clean.replace(/\s+((?:[0-9.]+[a-zA-Z]+)|--)\s*\|\s*(.*)$/i, ' — $1 (Último uso: $2)');
              // Traducir los sufijos de tiempo al español
              clean = clean.replace(/(\d+)\s*y ago/i, 'hace $1 años');
              clean = clean.replace(/(\d+)\s*m ago/i, 'hace $1 meses');
              clean = clean.replace(/(\d+)\s*d ago/i, 'hace $1 días');
              return clean;
            });
        } else if (activeTabRef.current === "optimize") {
          const optimizeMap: Record<string, string> = {
            "DNS & Spotlight Check": "Limpiar la caché de DNS (arregla problemas de navegación si algunas páginas no cargan).",
            "Finder Cache Refresh": "Reconstruir los íconos y QuickLook (si alguna vez has visto aplicaciones con íconos rotos o en blanco).",
            "Memory Optimization": "Liberar RAM inactiva (Memory Optimization).",
            "Permission Repair": "Reparar permisos (arregla errores de 'No tienes permiso para abrir esto').",
            "Bluetooth Refresh": "Reiniciar el módulo de Bluetooth (por si tus audífonos o ratón se desconectan a cada rato).",
            "LaunchServices Repair": "Reparar LaunchServices (arregla el menú de 'Abrir con...' cuando haces clic derecho en un archivo).",
            "App State Cleanup": "Limpiar estados de aplicaciones guardados en caché.",
            "Broken Config Repair": "Reparar archivos de preferencias y configuraciones rotas.",
            "Network Cache Refresh": "Refrescar caché de red y DNS (mejora la velocidad de internet).",
            "Database Optimization": "Optimizar bases de datos del sistema (Mensajes, Mail, etc).",
            "Font Cache Rebuild": "Reconstruir la caché de fuentes (arregla textos borrosos).",
            "Dock Refresh": "Refrescar y reiniciar el Dock de macOS.",
            "Network Stack Refresh": "Refrescar la tabla de enrutamiento y ARP de red.",
            "Spotlight Optimization": "Optimizar la indexación de búsqueda de Spotlight."
          };
          
          pathLines = allLines
            .map(l => l.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim())
            .filter(l => l.startsWith('➤'))
            .map(l => l.replace(/^➤\s*/, '').trim())
            .map(l => optimizeMap[l] || l);
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
                pathLines.unshift(`__ANALYZE__|true|${parentPath}|.. (Volver arriba)|`);
              }
            }
          } catch(e) {
            console.error("Error parseando analyze:", e);
            pathLines = ["Error al procesar el análisis de disco."];
          }
        } else if (activeTabRef.current === "uninstall") {
          pathLines = allLines
            .map(l => l.replace(/\x1b\[[0-9;]*m/g, '').trim())
            .filter(l => !l.startsWith('NAME') && !l.startsWith('---') && !l.includes('application(s)') && l.length > 10)
            .filter(l => !l.includes('Scanning applications'))
            .map(l => {
              // Extract UNINSTALL NAME (3rd column)
              // CotEditor      com.coteditor.CotEditor      CotEditor      128.7MB
              // we can just keep the whole line for display, but we need the uninstall name for execution
              return l;
            })
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
        setScanResult(["El proceso finalizó. Realiza un nuevo escaneo para comprobar el estado actual."]);
        setSelectedItems(new Set());
      }
    });

    return () => {
      console.log("Limpiando listeners de Tauri...");
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      unlistenLogs.then(f => f());
      unlistenEnd.then(f => f());
    };
  }, []);

  const getModuleName = (tab: string) => {
    switch (tab) {
      case "clean": return "Limpieza Rápida";
      case "uninstall": return "Desinstalador";
      case "purge": return "Purga de Desarrollo";
      case "optimize": return "Optimización";
      case "analyze": return "Lupa de Espacio";
      case "status": return "Monitor de Sistema";
      default: return "";
    }
  };

  const getModuleDescription = (tab: string) => {
    switch (tab) {
      case "clean": return "Analiza y limpia archivos temporales, cachés del sistema y registros innecesarios para liberar espacio rápidamente.";
      case "uninstall": return "Busca aplicaciones instaladas y sus restos ocultos en el sistema para una desinstalación limpia y completa.";
      case "purge": return "Elimina dependencias huérfanas, cachés de desarrollo (npm, gradle) y herramientas obsoletas para liberar espacio.";
      case "optimize": return "Repara permisos, reconstruye índices y purga memorias caché profundas para mejorar la velocidad de tu Mac.";
      case "analyze": return "Explora tu disco duro para encontrar archivos y carpetas muy pesadas que están consumiendo tu almacenamiento.";
      case "status": return "Monitorea el uso de CPU, Memoria RAM y red en tiempo real para diagnosticar cuellos de botella.";
      default: return "Analiza el sistema para descubrir qué archivos pueden eliminarse de forma segura usando este módulo.";
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
          setUpdateFeedbackMsg(`v${result.latest_version} disponible`);
        } else {
          setUpdateFeedbackMsg(`Motor al día (v${result.latest_version})`);
        }
      })
      .catch((err) => {
        setUpdateFeedbackMsg("Error al verificar");
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
    setIsTerminalExpanded(false); // Oculto por defecto en escaneo
    
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    try {
      let targets = ["--dry-run"];
      if (activeTab === "analyze") {
        targets = ["-json", targetPath];
      } else if (activeTab === "uninstall") {
        targets = ["--list"];
      }
      await invoke("ejecutar_con_logs", { module: activeTab, targets });
    } catch (e) {
      console.error(e);
      setScanResult([`Error durante el escaneo: ${e}`]);
      setIsScanning(false);
      isScanningRef.current = false;
    }
  };

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    // Calcular items seleccionables
    let selectableCount = 0;
    const allSelectable = new Set<number>();
    
    scanResult.forEach((line, idx) => {
      if (activeTab === "analyze" && line.startsWith("__ANALYZE__|")) {
        const parts = line.split("|");
        const isNavBtn = parts[3].includes("Volver arriba");
        const isLibrary = parts[2].includes("/Library");
        if (!isNavBtn && !isLibrary) {
          selectableCount++;
          allSelectable.add(idx);
        }
      } else {
        selectableCount++;
        allSelectable.add(idx);
      }
    });

    if (selectedItems.size > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(allSelectable);
    }
  };

  const detenerProceso = async () => {
    try {
      isCancelledRef.current = true;
      await invoke("detener_proceso");
      setLogs(prev => [...prev, "[SISTEMA] Solicitud de cancelación enviada..."]);
    } catch (e) {
      console.error("Error al detener el proceso", e);
    }
  };

  const handleCancelScan = async () => {
    try {
      isCancelledRef.current = true;
      await invoke("detener_proceso"); 
      setIsScanning(false);
      isScanningRef.current = false;
      setScanResult([]);
      setLogs(prev => [...prev, "--- PROCESO CANCELADO POR EL USUARIO ---"]);
    } catch (error) {
      console.error("Error al cancelar:", error);
    }
  };

  const executeCleanup = async () => {
    setShowModal(false);
    setIsExecuting(true);
    setIsTerminalExpanded(true); // Siempre mostrar terminal en ejecución destructiva
    setLogs(["[SISTEMA] Iniciando proceso en segundo plano...", "[SISTEMA] Por favor autoriza la ejecución si el sistema lo solicita."]);
    
    try {
      if (activeTab === "analyze") {
        const analyzeTargets = scanResult
          .filter((_, i) => selectedItems.has(i))
          .map(l => l.split("|")[2]); // Extraer la ruta
          
        invoke("eliminar_rutas_manual", { targets: analyzeTargets })
          .then(() => {
            if (isMounted.current) {
              setLogs(prev => [...prev, "[SISTEMA] Archivos eliminados exitosamente.", "--- PROCESO FINALIZADO ---"]);
              setIsExecuting(false);
              handleScan(analyzePath);
            }
          })
          .catch(e => {
            console.error(e);
            if (isMounted.current) {
              setLogs(prev => [...prev, `[ERROR] ${e}`]);
              setIsExecuting(false);
            }
          });
        return;
      }

      const isAllSelected = selectedItems.size === scanResult.length && scanResult.length > 0;
      let executionTargets: string[] = [];
      if (!isAllSelected && activeTab === "uninstall") {
        // extract uninstall names for selected apps
        executionTargets = scanResult
          .filter((_, i) => selectedItems.has(i))
          .map(line => {
             // Basic parsing: split by multiple spaces, usually UNINSTALL NAME is the 3rd token
             const tokens = line.split(/\s{2,}/);
             return tokens.length >= 3 ? tokens[2].trim() : "";
          })
          .filter(name => name.length > 0);
      } else if (!isAllSelected) {
        // for clean/purge we don't have partial selection implemented in rust yet unless we whitelist
        executionTargets = [];
      }

      invoke("ejecutar_con_logs", { 
        module: activeTab, 
        targets: executionTargets 
      }).catch(e => {
        console.error(e);
        if (isMounted.current) {
          setLogs(prev => [...prev, `[ERROR] ${e}`]);
          setIsExecuting(false);
        }
      });
    } catch (e) {
      console.error(e);
      setScanResult([`Error al iniciar limpieza: ${e}`]);
      setIsExecuting(false);
    }
  };

  const getThemeClasses = () => {
    switch(theme) {
      case "light": return "theme-light bg-white backdrop-blur-md text-black";
      case "dark": return "theme-dark bg-neutral-950/90 backdrop-blur-xl text-neutral-100";
      case "default":
      default: return "bg-gradient-to-br from-indigo-950 via-purple-950 to-neutral-950/80 backdrop-blur-xl text-white";
    }
  };

  // Determinar qué icono mostrar.
  // En el tema 'default' o 'dark' el fondo es oscuro, por lo que usamos el ícono blanco.
  // Solo en 'light' usamos el ícono negro.
  const iconSrc = theme === "light" ? "/icon_black.svg" : "/icon_white.svg";

  return (
    <div data-tauri-drag-region="true" className={`flex h-screen w-full font-sans antialiased select-none overflow-hidden ${getThemeClasses()}`}>
      
      {/* Sidebar */}
      <div data-tauri-drag-region="true" className="w-64 flex-shrink-0 pt-6 px-4 pb-4 border-r border-white/10 flex flex-col gap-2 relative z-10 bg-black/20">
        <div data-tauri-drag-region="true" className="flex justify-center mb-6 mt-2 pointer-events-none">
          <img src={iconSrc} alt="Kirei Logo" className="h-16 w-auto drop-shadow-lg" />
        </div>
        <div data-tauri-drag-region="true" className="mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider pl-3">
          Herramientas
        </div>
        
        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("clean"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "clean" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Eraser size={18} />
          Limpieza Rápida
        </button>

        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("uninstall"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "uninstall" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Trash2 size={18} />
          Desinstalador
        </button>

        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("purge"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "purge" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Zap size={18} />
          Purga de Desarrollo
        </button>

        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("optimize"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "optimize" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Settings size={18} />
          Optimización
        </button>

        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("analyze"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "analyze" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <PieChart size={18} />
          Lupa de Espacio
        </button>

        <button 
          onClick={() => { if(!isExecuting) { setActiveTab("status"); setScanResult([]); } }}
          disabled={isExecuting}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "status" ? "bg-white/20 shadow-sm text-white" : "text-white/70 hover:bg-white/10 hover:text-white"} ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Activity size={18} />
          Monitor de Sistema
        </button>

        {/* Theme Settings */}
        <div className="mt-auto flex flex-col gap-2">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider pl-3 mt-2">
            TEMA
          </div>
          <div className="flex gap-1 justify-center bg-black/20 p-1 rounded-lg">
            <button onClick={() => setTheme("default")} className={`flex-1 text-xs py-1 rounded-md transition-colors ${theme === "default" ? "bg-white/20 text-white" : "text-white/50 hover:bg-white/10"}`}>Predeterminado</button>
            <button onClick={() => setTheme("light")} className={`flex-1 text-xs py-1 rounded-md transition-colors ${theme === "light" ? "bg-white/20 text-white" : "text-white/50 hover:bg-white/10"}`}>Claro</button>
            <button onClick={() => setTheme("dark")} className={`flex-1 text-xs py-1 rounded-md transition-colors ${theme === "dark" ? "bg-white/20 text-white" : "text-white/50 hover:bg-white/10"}`}>Oscuro</button>
          </div>

          {/* Botón Buscar Actualizaciones */}
          {isMoleInstalled && (
            <button
              onClick={handleCheckUpdatesManually}
              disabled={isCheckingUpdate || isExecuting}
              className="mt-1 text-[11px] font-medium text-white/50 hover:text-white/90 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
              title="Buscar nuevas versiones del motor mole"
            >
              <RefreshCw size={11} className={isCheckingUpdate ? "animate-spin text-amber-400" : ""} />
              <span>{updateFeedbackMsg || `Motor v${engineVersion || "..."}`}</span>
            </button>
          )}
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

          {isMoleInstalled === false || isMoleInstalled === null ? (
            <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto my-auto text-center animate-in fade-in duration-300">
              {isDownloadingMole || isMoleInstalled === null ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center mb-5 shadow-lg">
                    <Loader2 className="animate-spin text-white/80" size={26} />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight text-white mb-1.5">
                    Configurando Kirei
                  </h2>
                  <p className="text-xs text-white/50 max-w-xs mb-5 leading-relaxed">
                    Inicializando el motor de optimización. Esto solo tomará unos segundos...
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
                    Conexión requerida
                  </h2>
                  <p className="text-xs text-white/50 max-w-xs mb-6 leading-relaxed">
                    No se pudo descargar automáticamente el motor de optimización. Comprueba tu conexión a Internet y pulsa reintentar.
                  </p>
                  
                  <button
                    onClick={handleDownloadMole}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/15 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Reintentar descarga</span>
                  </button>
                </>
              )}
            </div>
          ) : activeTab === "status" ? (
            <SystemMonitor />
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
                  Analizar Sistema
                </button>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={handleCancelScan}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <BeachballSpinner size={16} /> 
                    Cancelar Análisis
                  </button>
                </div>
              )}

              {/* Botón flotante para expandir terminal */}
              {!isTerminalExpanded && (isScanning || logs.length > 0) && (
                <button 
                  onClick={() => setIsTerminalExpanded(true)}
                  className="absolute bottom-6 right-6 z-50 bg-black/40 hover:bg-black/60 text-white/80 p-2 rounded-full backdrop-blur-md transition-all shadow-lg border border-white/10 active:scale-95"
                  title="Mostrar Terminal de Registro"
                >
                  <ChevronUp size={20} />
                </button>
              )}

              {/* Terminal Visual (Solo visible si isTerminalExpanded) */}
              {isTerminalExpanded && ((isScanning) || (!isScanning && logs.length > 0)) && (
                <div className="w-full mt-8 bg-black/90 border border-gray-700 rounded-lg overflow-hidden shadow-2xl relative">
                  <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 border-b border-gray-700 flex justify-between items-center">
                    <span>Terminal de Registro</span>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => navigator.clipboard.writeText(logs.join('\n'))}
                        className="hover:text-white transition-colors flex items-center gap-1 active:scale-95"
                        title="Copiar logs"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        Copiar
                      </button>
                      <span>{isScanning ? 'Ejecutando...' : 'Detenido'}</span>
                      <button onClick={() => setIsTerminalExpanded(false)} className="hover:text-white transition-colors ml-2">
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Contenedor de Logs con Scroll */}
                  <div className="h-48 p-4 overflow-y-auto font-mono text-sm text-green-400 select-text">
                    {logs.length === 0 ? (
                      <div className="text-gray-500 italic">Esperando salida del sistema...</div>
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
                  {scanResult.length === 1 ? '1 ruta encontrada' : `${scanResult.length} rutas encontradas`}
                </span>
                {!isExecuting && scanResult.length > 1 && !(activeTab === "analyze" && analyzePath.includes("/Library")) && (
                  <button 
                    onClick={selectAll}
                    className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors font-medium"
                  >
                    {selectedItems.size > 0 ? "Deseleccionar Todo" : "Seleccionar Todo"}
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
                        const isNavBtn = name.includes("Volver arriba");
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
                                    alert("Archivos de Library bloqueados por seguridad.\nPor favor, usa el módulo 'Desinstalador' o 'Limpieza Rápida' para purgar estos elementos de manera segura.");
                                    return;
                                  }
                                  toggleSelection(idx);
                                }}
                                title={isLibrary ? "Protegido por el sistema" : "Seleccionar para borrar"}
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
                      Inicio
                    </button>
                    <button 
                      onClick={() => setShowModal(true)}
                      disabled={selectedItems.size === 0}
                      className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      {activeTab === "analyze" ? "Mover a Papelera" : "Eliminar"} ({selectedItems.size})
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={detenerProceso}
                    className="bg-red-600 hover:bg-red-500 text-white font-medium py-3 px-8 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all flex items-center gap-2 animate-pulse hover:animate-none"
                  >
                    <XCircle size={18} />
                    Detener / Cancelar
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
              {activeTab === "analyze" ? "¿Mover a la papelera?" : "¿Estás completamente seguro?"}
            </h3>
            <p className="text-white/70 text-center text-sm mb-6">
              {activeTab === "analyze" 
                ? "Los elementos seleccionados serán enviados a tu papelera, por lo que podrás recuperarlos si cambias de opinión."
                : "Estás a punto de solicitar privilegios para ejecutar una acción destructiva sobre los elementos seleccionados. Esta acción no se puede deshacer."}
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={executeCleanup}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                {activeTab === "analyze" ? "Sí, mover a la papelera" : "Sí, limpiar el sistema"}
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="w-full bg-white/10 hover:bg-white/15 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Cancelar
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
              <p className="text-xs font-black text-black tracking-tight">Nueva versión del motor ({updateAvailable})</p>
              <p className="text-[11px] font-bold text-black/80">¿Deseas actualizar el motor de limpieza?</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDownloadMole}
              className="text-xs bg-black hover:bg-neutral-900 text-[#f59e0b] px-3 py-1.5 rounded-lg font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Actualizar
            </button>
            <button 
              onClick={() => setUpdateAvailable(null)}
              className="text-xs bg-black/10 hover:bg-black/20 text-black px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
