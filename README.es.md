# Kirei — El Optimizador de Código Abierto Definitivo para Mac

[![Tauri](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)](https://v2.tauri.app/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Licencia: GPL-3.0](https://img.shields.io/badge/Licencia-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

*[Leer en inglés (English version)](README.md)*

**Kirei** es un **limpiador y optimizador de sistema para macOS** moderno, rápido y elegante. Funciona como una interfaz gráfica hermosa y nativa para la popular herramienta de línea de comandos de código abierto [tw93/mole](https://github.com/tw93/mole).

Si buscas una **alternativa gratuita a CleanMyMac**, Kirei te ofrece una interfaz elegante con efecto de cristal translúcido (*glassmorphism*) sin telemetría, sin cobros ocultos y sin software innecesario (*bloatware*).

<p align="center">
  <img src="assets/preview_es.png" alt="Vista Previa de Kirei" width="750" style="border-radius: 12px;" />
</p>

---

## ✨ Características Principales

- 🧹 **Limpieza Profunda del Sistema:** Elimina cachés obsoletos, archivos temporales, registros de usuario y descargas innecesarias con un solo clic.
- 🔍 **Lupa de Espacio:** Inspecciona visualmente y localiza archivos o carpetas grandes que están consumiendo el almacenamiento de tu disco.
- 🗑️ **Desinstalador Inteligente:** Desinstala aplicaciones por completo, eliminando sus archivos residuales ocultos en `~/Library`.
- ⚡️ **Purga de Desarrollo:** Libera gigabytes rápidamente eliminando de forma segura carpetas `node_modules`, `vendor` y artefactos de compilación en todos tus proyectos.
- 🔒 **Seguridad Nativa (Touch ID):** Integración perfecta con macOS mediante Touch ID o contraseña de administrador para las tareas que requieren permisos elevados.
- 🎨 **Temas Dinámicos:** Soporte completo para modo Claro, Oscuro y Predeterminado del sistema con efectos nativos de desenfoque y transparencia de macOS.
- 🚀 **Arquitectura Ligera:** Construido sobre Tauri v2 y Rust; bajo consumo de memoria y un tamaño de binario ultra compacto (~3 MB).
- 🌐 **Interfaz Bilingüe:** Cambio de idioma en tiempo real entre inglés y español.

---

## 🛠️ Pila Tecnológica

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React
- **Backend / Envoltorio:** Tauri v2 (Rust)
- **Motor de Limpieza:** [mole](https://github.com/tw93/mole) (con descarga dinámica y parcheo en tiempo de ejecución)

---

## 📥 Instalación

### Método 1: Archivo .DMG (Recomendado)

1. Dirígete a la sección de [Releases](https://github.com/Jomooto/Kirei/releases) de este repositorio.
2. Descarga la versión más reciente del instalador `Kirei_x.x.x_aarch64.dmg`.
3. Abre el archivo descargado y arrastra **Kirei** a tu carpeta de **Aplicaciones**.

> **Nota:** La primera vez que abras la aplicación, macOS podría requerir autorización en *Ajustes del Sistema > Privacidad y Seguridad* si el binario no cuenta con certificado de desarrollador de Apple firmado.

---

## 💻 Desarrollo y Compilación Local

### Requisitos Previos

- **macOS** (Apple Silicon M1/M2/M3/M4 o Intel)
- **Node.js** (v18 o superior) y **npm**
- **Rust** y **Cargo** (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Xcode Command Line Tools** (`xcode-select --install`)

### Clonar el Repositorio

```bash
git clone https://github.com/Jomooto/Kirei.git
cd Kirei
```

### Instalar Dependencias

```bash
npm install
```

### Ejecutar en Modo Desarrollo

```bash
npm run tauri dev
```

### Auditoría de Código y Linters

El proyecto cuenta con controles estrictos antes de cualquier compilación para evitar regresiones o vulnerabilidades:

```bash
# Auditar Frontend (TypeScript) y Backend (Rust Clippy)
npm run check:all
```

### Compilar para Producción (.app y .dmg)

```bash
npm run tauri build
```

El instalador final se generará en:
`src-tauri/target/release/bundle/dmg/Kirei_x.x.x_aarch64.dmg`

---

## 🛡️ Seguridad y Privacidad

- **Transparencia Total:** Las acciones ejecutadas son inspeccionables desde la terminal integrada en la aplicación.
- **Sin Telemetría Oculta:** La aplicación no envía datos privados ni telemetría a servidores externos.
- **Acceso por Demanda:** Solo solicita permisos elevados mediante diálogos nativos del sistema cuando una tarea específica de limpieza lo requiere.
- **Descarga Directa del Motor:** Kirei descarga el núcleo directamente desde el registro seguro de contenedores de GitHub (ghcr.io) usando la infraestructura de Homebrew.

---

## 📜 Licencia

Este proyecto está bajo la **Licencia GPL-3.0**. Consulta el archivo `LICENSE` para más detalles.
