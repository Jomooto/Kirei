export type Language = "es" | "en";

export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem("kirei_language");
    if (saved === "es" || saved === "en") {
      return saved;
    }
    const sys = (typeof navigator !== "undefined" && (navigator.language || (navigator as any).userLanguage)) || "";
    return sys.toLowerCase().startsWith("es") ? "es" : "en";
  } catch {
    return "es";
  }
}

export const translations = {
  es: {
    // Sidebar
    tools: "Herramientas",
    tabClean: "Limpieza Rápida",
    tabUninstall: "Desinstalador",
    tabPurge: "Purga de Desarrollo",
    tabOptimize: "Optimización",
    tabAnalyze: "Lupa de Espacio",
    tabStatus: "Monitor de Sistema",

    // Language & Theme
    languageLabel: "Idioma",
    themeLabel: "Tema",
    themeDefault: "Predeterminado",
    themeLight: "Claro",
    themeDark: "Oscuro",

    // Engine update
    enginePrefix: "Motor v",
    checkingUpdates: "Buscando...",
    updateAvailableShort: "disponible",
    engineUpToDate: "Motor al día",
    errorCheckingUpdates: "Error al verificar",
    checkUpdatesTooltip: "Buscar nuevas versiones del motor mole",
    newEngineVersion: "Nueva versión del motor",
    updateEnginePrompt: "¿Deseas actualizar el motor de limpieza?",
    btnUpdate: "Actualizar",
    btnClose: "Cerrar",

    // Initial setup / error
    setupTitle: "Configurando Kirei",
    setupSubtitle: "Inicializando el motor de optimización. Esto solo tomará unos segundos...",
    connectionRequired: "Conexión requerida",
    connectionRequiredSubtitle: "No se pudo descargar automáticamente el motor de optimización. Comprueba tu conexión a Internet y pulsa reintentar.",
    retryDownload: "Reintentar descarga",

    // Module Descriptions
    descClean: "Analiza y limpia archivos temporales, cachés del sistema y registros innecesarios para liberar espacio rápidamente.",
    descUninstall: "Busca aplicaciones instaladas y sus restos ocultos en el sistema para una desinstalación limpia y completa.",
    descPurge: "Elimina dependencias huérfanas, cachés de desarrollo (npm, gradle) y herramientas obsoletas para liberar espacio.",
    descOptimize: "Repara permisos, reconstruye índices y purga memorias caché profundas para mejorar la velocidad de tu Mac.",
    descAnalyze: "Explora tu disco duro para encontrar archivos y carpetas muy pesadas que están consumiendo tu almacenamiento.",
    descStatus: "Monitorea el uso de CPU, Memoria RAM y red en tiempo real para diagnosticar cuellos de botella.",
    descDefault: "Analiza el sistema para descubrir qué archivos pueden eliminarse de forma segura usando este módulo.",

    // Action buttons
    btnScanSystem: "Analizar Sistema",
    btnCancelScan: "Cancelar Análisis",
    btnSelectAll: "Seleccionar Todo",
    btnDeselectAll: "Deseleccionar Todo",
    btnHome: "Inicio",
    btnTrash: "Mover a Papelera",
    btnDelete: "Eliminar",
    btnStopCancel: "Detener / Cancelar",

    // Scan feedback & Terminal
    pathsFoundSingular: "1 ruta encontrada",
    pathsFoundPlural: "rutas encontradas",
    goUp: "Volver arriba",
    errorProcessingDiskScan: "Error al procesar el análisis de disco.",
    processFinished: "El proceso finalizó. Realiza un nuevo escaneo para comprobar el estado actual.",
    libraryAlert: "Archivos de Library bloqueados por seguridad.\nPor favor, usa el módulo 'Desinstalador' o 'Limpieza Rápida' para purgar estos elementos de manera segura.",
    protectedBySystem: "Protegido por el sistema",
    selectToDelete: "Seleccionar para borrar",
    terminalTitle: "Terminal de Registro",
    copyLogs: "Copiar",
    copiedLogs: "¡Copiado!",
    runningStatus: "Ejecutando...",
    stoppedStatus: "Detenido",
    waitingSystemOutput: "Esperando salida del sistema...",
    showTerminalTooltip: "Mostrar Terminal de Registro",

    // Confirmation Modal
    modalAnalyzeTitle: "¿Mover a la papelera?",
    modalGeneralTitle: "¿Estás completamente seguro?",
    modalAnalyzeDesc: "Los elementos seleccionados serán enviados a tu papelera, por lo que podrás recuperarlos si cambias de opinión.",
    modalGeneralDesc: "Estás a punto de solicitar privilegios para ejecutar una acción destructiva sobre los elementos seleccionados. Esta acción no se puede deshacer.",
    modalBtnAnalyze: "Sí, mover a la papelera",
    modalBtnGeneral: "Sí, limpiar el sistema",
    modalBtnCancel: "Cancelar",

    // System Monitor
    sysConnecting: "Conectando con sensores del sistema...",
    sysError: "Error obteniendo estado del sistema",
    sysCpu: "CPU",
    sysCores: "Núcleos",
    sysRam: "Memoria RAM",
    sysUsed: "Usados",
    sysTotal: "Total",
    sysDisk: "Disco",
    sysTopProcesses: "Procesos de Mayor Consumo",
    sysThProcess: "Proceso",
    sysThPid: "PID",
    sysThCpu: "CPU %",
    sysThRam: "RAM %"
  },
  en: {
    // Sidebar
    tools: "Tools",
    tabClean: "Quick Clean",
    tabUninstall: "Uninstaller",
    tabPurge: "Developer Purge",
    tabOptimize: "Optimization",
    tabAnalyze: "Space Lens",
    tabStatus: "System Monitor",

    // Language & Theme
    languageLabel: "Language",
    themeLabel: "Theme",
    themeDefault: "Default",
    themeLight: "Light",
    themeDark: "Dark",

    // Engine update
    enginePrefix: "Engine v",
    checkingUpdates: "Checking...",
    updateAvailableShort: "available",
    engineUpToDate: "Engine up to date",
    errorCheckingUpdates: "Check failed",
    checkUpdatesTooltip: "Check for new mole engine versions",
    newEngineVersion: "New engine version",
    updateEnginePrompt: "Do you want to update the cleaning engine?",
    btnUpdate: "Update",
    btnClose: "Close",

    // Initial setup / error
    setupTitle: "Configuring Kirei",
    setupSubtitle: "Initializing the optimization engine. This will only take a few seconds...",
    connectionRequired: "Connection Required",
    connectionRequiredSubtitle: "Could not automatically download the optimization engine. Please check your internet connection and retry.",
    retryDownload: "Retry download",

    // Module Descriptions
    descClean: "Analyze and clean temporary files, system caches, and unnecessary logs to quickly reclaim disk space.",
    descUninstall: "Search for installed applications and leftover hidden files for a clean and thorough uninstall.",
    descPurge: "Remove orphan dependencies, development caches (npm, gradle), and obsolete tools to free up space.",
    descOptimize: "Repair permissions, rebuild indexes, and flush deep caches to boost your Mac's performance.",
    descAnalyze: "Explore your disk to find large files and heavy folders consuming your storage.",
    descStatus: "Monitor CPU, RAM, and network usage in real time to diagnose system bottlenecks.",
    descDefault: "Scan the system to discover which files can be safely removed using this module.",

    // Action buttons
    btnScanSystem: "Scan System",
    btnCancelScan: "Cancel Scan",
    btnSelectAll: "Select All",
    btnDeselectAll: "Deselect All",
    btnHome: "Home",
    btnTrash: "Move to Trash",
    btnDelete: "Delete",
    btnStopCancel: "Stop / Cancel",

    // Scan feedback & Terminal
    pathsFoundSingular: "1 path found",
    pathsFoundPlural: "paths found",
    goUp: "Go up",
    errorProcessingDiskScan: "Error processing disk analysis.",
    processFinished: "Process completed. Run a new scan to verify the current status.",
    libraryAlert: "Library files are protected for system safety.\nPlease use the 'Uninstaller' or 'Quick Clean' module to safely clean these items.",
    protectedBySystem: "Protected by system",
    selectToDelete: "Select for removal",
    terminalTitle: "Log Terminal",
    copyLogs: "Copy",
    copiedLogs: "Copied!",
    runningStatus: "Running...",
    stoppedStatus: "Stopped",
    waitingSystemOutput: "Waiting for system output...",
    showTerminalTooltip: "Show Log Terminal",

    // Confirmation Modal
    modalAnalyzeTitle: "Move to Trash?",
    modalGeneralTitle: "Are you completely sure?",
    modalAnalyzeDesc: "Selected items will be moved to your Trash, so you can restore them if you change your mind.",
    modalGeneralDesc: "You are about to request administrator privileges to perform a permanent deletion on the selected items. This action cannot be undone.",
    modalBtnAnalyze: "Yes, move to Trash",
    modalBtnGeneral: "Yes, clean system",
    modalBtnCancel: "Cancel",

    // System Monitor
    sysConnecting: "Connecting to system sensors...",
    sysError: "Error retrieving system status",
    sysCpu: "CPU",
    sysCores: "Cores",
    sysRam: "RAM Memory",
    sysUsed: "Used",
    sysTotal: "Total",
    sysDisk: "Disk",
    sysTopProcesses: "Top Resource Processes",
    sysThProcess: "Process",
    sysThPid: "PID",
    sysThCpu: "CPU %",
    sysThRam: "RAM %"
  }
};

export const optimizeDescriptions: Record<Language, Record<string, string>> = {
  es: {
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
  },
  en: {
    "DNS & Spotlight Check": "Flush DNS cache (fixes web browsing issues when some websites fail to load).",
    "Finder Cache Refresh": "Rebuild icons and QuickLook caches (fixes blank or broken app icons).",
    "Memory Optimization": "Purge inactive RAM memory (Memory Optimization).",
    "Permission Repair": "Repair system permissions (fixes 'Permission denied' opening errors).",
    "Bluetooth Refresh": "Restart Bluetooth service (helps if headphones or mouse constantly disconnect).",
    "LaunchServices Repair": "Rebuild LaunchServices (fixes the 'Open With...' context menu).",
    "App State Cleanup": "Clean cached saved application states.",
    "Broken Config Repair": "Repair corrupted configuration and plist files.",
    "Network Cache Refresh": "Flush network and DNS caches (improves internet responsiveness).",
    "Database Optimization": "Optimize system databases (Messages, Mail, etc).",
    "Font Cache Rebuild": "Rebuild macOS font caches (fixes blurry or missing typography).",
    "Dock Refresh": "Refresh and restart the macOS Dock.",
    "Network Stack Refresh": "Refresh routing table and network ARP cache.",
    "Spotlight Optimization": "Optimize Spotlight search indexing."
  }
};
