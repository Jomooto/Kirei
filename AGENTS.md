# Contexto del Proyecto (AGENTS.md)

> **Instrucción para la IA:** Lee este documento completo antes de proponer cambios estructurales, añadir nuevas dependencias o modificar la arquitectura base. Este archivo representa la fuente de la verdad del estado actual del proyecto.

## 1. Visión General
- **Nombre del Proyecto:** Kirei
- **Objetivo Principal:** Sistema corporativo con énfasis en una interfaz de usuario elegante y responsiva (estilo CleanMyMac) como wrapper para tw93/mole.
- **Estado Global:** MVP Finalizado / Listo para producción

## 2. Stack Tecnológico y Entorno
- **Core:** React con TypeScript + Tauri v2 (Rust)
- **Estilos/UI:** TailwindCSS v4, Lucide React
- **Testing/Navegadores:** macOS nativo
- **Otras herramientas:** pnpm / npm

## 3. Reglas y Convenciones (Strict)
- **Lenguaje:** Código en inglés, comentarios en español, y la UI bilingüe con detección automática del sistema (Español y English US) intercambiable mediante selector dinámico.
- **Patrones:** Usar Functional Components, evitar mutaciones directas de estado.
- **Decisiones Técnicas Fijas:** Usar Sidecars de Tauri v2 ("Direct Bottle Download"). El motor "mole" se descarga dinámicamente en tiempo de ejecución desde Homebrew (ghcr.io) usando la API de JSON, permitiendo auto-actualizaciones y reducción del tamaño del binario. Security by design.

## 4. Progreso Actual
### ✅ Implementado y Funcional (NO romper)
- Inicialización del proyecto Tauri v2 (`com.kirei.desktop`).
- Configuración de Tailwind CSS y Lucide React.
- Configuración de la ventana nativa (Glassmorphism, transparente, sin título).
- Layout principal en React con Sidebar de navegación y pestañas principales en español.
- Fase 2: Configuración del Motor (Sidecar dinámico). Implementado método "Direct Bottle Download" desde Homebrew (ghcr.io) eliminando la necesidad de empaquetar el binario estáticamente.

- Fase 3: Conexión de UI con Motor Rust completada (Módulos: Lupa de Espacio, Monitor de Sistema y Desinstalador integrados).
- Mejoras de UI/UX: Terminal colapsable, temas dinámicos (Claro/Oscuro/Predeterminado) y barra de arrastre nativa.
- Fase 4: Refactorización a "Método de Descarga Directa de Bottles". El motor se descarga desde ghcr.io, se extrae completo y se parchean dinámicamente sus comprobaciones de seguridad (`EUID`) para permitir una integración impecable con el Touch ID nativo de Apple mediante `osascript`.
- Fase 5: Empaquetado Final (.DMG) y generación de íconos personalizados para macOS.

## 6. Auditoría de Seguridad y Buenas Prácticas
Recientemente se aplicó un refactor completo para endurecer la aplicación antes de su paso a producción. 

### Backend (Rust / Tauri)
- **Hardening de Ejecución de Comandos:** Se ha eliminado la posibilidad de inyecciones de comandos en `osascript`. Todos los parámetros que provienen del frontend hacia las funciones de Tauri ahora son sistemáticamente escapados y sanitizados usando lógica estricta (`escape_arg` y `escape_applescript`), impidiendo escapes a través de comillas o variables de entorno.
- **Manejo de Errores Seguro:** Se eliminaron todas las ocurrencias frágiles de `.unwrap()` y `.expect()` en el código de producción. Ahora se retorna limpiamente una estructura `Result<T, String>` que el frontend procesa correctamente.
- **Llamadas de Red Estables:** Para la descarga de actualizaciones y dependencias usando `reqwest`, se implementaron `timeouts` razonables y validación del código de estado (`error_for_status()`) evitando que el proceso en Rust quede colgado indefinidamente.

### Frontend (React / TypeScript)
- **Tipado Fuerte Estricto:** Se han eliminado los `any` genéricos y se definieron interfaces como `UpdateCheckResult` y `AnalyzeEntry` para los datos que retorna Rust. El archivo `tsconfig.json` aplica explícitamente `"strict": true`.
- **Protección UI / Manejo de Errores:** En lugar de lanzar alertas rudimentarias o tragar errores por consola en las Promesas de IPC (`invoke`), se ha centralizado el manejo de errores en un componente de advertencia visual robusto que informa al usuario en la pantalla principal.
- **Permisos de Tauri (IPC):** Se agregaron permisos específicos requeridos para las funciones (e.g. `core:window:allow-set-icon`) alineados con el Principio de Privilegio Mínimo.

### Automatización y Pipeline de Compilación (CI)
- **Bloqueo por Linters (Pre-build):** Se introdujo una cadena obligatoria de QA en `package.json` (`check:all`) antes de generar las compilaciones de producción.
  - El backend se audita mediante `cargo clippy -D warnings`, forzando a que no existan antipatrones ni código ineficiente en Rust.
  - El frontend se audita estáticamente con `tsc --noEmit`, evitando que posibles errores de refactorización visual causen excepciones en tiempo de ejecución.
  - El empaquetado final (`tauri build`) falla y se aborta si cualquiera de los linters detecta el más mínimo error.

### 🚧 En Desarrollo (Contexto Inmediato)
- *(Ninguno, Proyecto finalizado y empaquetado)*.

### 📝 Próximos Pasos (To-Do)
- Soporte extendido para Windows/Linux (requiere adaptar el sidecar de mole).
- Implementación de Tests unitarios y E2E.

## 7. Comportamiento de los Módulos del Motor (Mole)
> **CRÍTICO:** Nunca asumas que todos los módulos de `mole` se comportan igual. Tienen reglas estrictas de entrada, salida y permisos.

- **Módulo `uninstall` (Lupa de Desinstalación):**
  - **Permisos:** Requiere `sudo` (mediante `osascript ... with administrator privileges`) para eliminar aplicaciones de `/Applications`.
  - **TUI y Salida:** Posee una interfaz de usuario en terminal interactiva. Para saltarla al hacer dry-run o listados desde Kirei, DEBE inyectarse un comando de salida mediante tubería: `echo q | mole uninstall --dry-run`. NO USAR `expect` con TTYs virtuales porque macOS bloquea a `mdfind` (Spotlight) bajo `osascript` si el contexto no tiene Full Disk Access (FDA), lo que causa un loop infinito.
  - **Argumentos:** Acepta rutas/nombres específicos como argumentos (`mole uninstall "App1" "App2"`). Kirei puede enviarle los nombres parseados (ej. extrayendo líneas que inician con `○`).

- **Módulo `purge` (Rayo de Desarrollo):**
  - **Permisos:** **NO requiere `sudo`**. Solo busca en las carpetas personales del usuario (ej. `~/Documents`). Si se ejecuta con `sudo` bajo `osascript`, TCC de macOS bloqueará el acceso a las carpetas (Operation not permitted / status 1). Debe ejecutarse como el usuario local para permitir los pop-ups del sistema pidiendo permiso de lectura si son necesarios.
  - **TUI y Salida:** **NO tiene menú interactivo**. Al ejecutarlo siempre escanea, reporta (ej. con marcas `✓ [DRY RUN]`), y automáticamente purga si no es dry-run. 
  - **Argumentos:** **NO acepta argumentos posicionales** (lanzará *Unknown option*). Limpia globalmente todo lo configurado en `--paths`. Desde Kirei, se le pasa un arreglo vacío de argumentos (`args: []`) al momento de limpiar. El parseador lee líneas `✓ [DRY RUN]`.

- **Módulos Genéricos (`clean`, `optimize`, etc.):**
  - Generalmente operan sin menú interactivo complejo, dependiendo del módulo algunos aceptan argumentos y otros corren en lote. Respetar siempre el parseo limpio desde `stdout` eliminando códigos ANSI.

## 8. Estructura de Directorios Clave
```text
src/
 ├── components/    # Componentes reutilizables de UI
 ├── hooks/         # Lógica de estado compartida
 ├── types/         # Definiciones globales de TypeScript
 └── utils/         # Funciones auxiliares puras
```
