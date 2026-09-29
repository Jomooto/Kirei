# Kirei — The Ultimate Open-Source Mac Cleaner

[![Tauri](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)](https://v2.tauri.app/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

**Kirei** is a modern, fast, and elegant **macOS cleaner and system optimizer**. It serves as a beautiful, native-feeling GUI wrapper for the popular open-source CLI [tw93/mole](https://github.com/tw93/mole). 

If you are looking for a **free CleanMyMac alternative**, a **macOS cleaner**, or an **open-source Mac optimizer**, Kirei offers a sleek *Glassmorphism* interface without telemetry, hidden fees, or bloatware.

---

## ✨ Features (Características Principales)

- 🧹 **Deep System Cleaner:** Remove obsolete caches, temporary files, user logs, and unnecessary downloads with a single click (Free Mac Cleaner).
- 🔍 **Space Analyzer (Lupa de Espacio):** Visually inspect and locate large files and folders consuming your disk storage.
- 📊 **Resource Monitor:** Real-time monitoring of CPU, RAM, and network usage to diagnose bottlenecks.
- 🗑️ **Smart App Uninstaller:** Completely uninstall applications, wiping leftover files in `~/Library` and associated hidden folders.
- 🔒 **Native Security (Touch ID):** Seamless macOS integration via Touch ID or administrator password for tasks requiring elevated privileges (`osascript`).
- 🎨 **Dynamic Themes:** Full support for Light, Dark, and Default mode with native macOS blur and transparency effects.
- 🚀 **Lightweight Architecture:** Built on Tauri v2 and Rust; low memory footprint and an ultra-compact binary size (~3 MB).

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React
- **Backend / Wrapper:** Tauri v2 (Rust)
- **Motor de Limpieza:** [mole](https://github.com/tw93/mole) (con descarga dinámica y parcheo en tiempo de ejecución)

---

## 📥 Instalación

### Método 1: Archivo .DMG (Recomendado)

1. Dirígete a la sección de [Releases](../../releases) de este repositorio.
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
git clone https://github.com/TU_USUARIO/kirei.git
cd kirei
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
`src-tauri/target/release/bundle/dmg/Kirei_0.1.0_aarch64.dmg`

---

## 🛡️ Seguridad y Privacidad

- **Transparencia Total:** Las acciones ejecutadas son inspeccionables desde la terminal integrada en la aplicación.
- **Sin Telemetría Oculta:** La aplicación no envía datos privados ni telemetría a servidores externos.
- **Acceso por Demanda:** Solo solicita permisos elevados mediante diálogos nativos del sistema cuando una tarea específica de limpieza de sistema lo requiere.

---

## 📄 Licencia

Este proyecto está bajo la licencia GNU General Public License v3.0 (GPL-3.0). Consulta el archivo `LICENSE` para más detalles.

Agradecimientos especiales al proyecto [mole](https://github.com/tw93/mole) por su excelente motor de limpieza en macOS.
