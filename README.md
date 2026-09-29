# Kirei — The Ultimate Open-Source Mac Cleaner

[![Tauri](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)](https://v2.tauri.app/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

*[🇪🇸 Leer en Español (Read in Spanish)](README.es.md)*

**Kirei** is a modern, fast, and elegant **macOS cleaner and system optimizer**. It serves as a beautiful, native-feeling GUI wrapper for the popular open-source CLI [tw93/mole](https://github.com/tw93/mole).

If you are looking for a **free CleanMyMac alternative**, a **macOS cleaner**, or an **open-source Mac optimizer**, Kirei offers a sleek *Glassmorphism* interface without telemetry, hidden fees, or bloatware.

---

## ✨ Key Features

- 🧹 **Deep System Cleaner:** Remove obsolete caches, temporary files, user logs, and unnecessary downloads with a single click (Free Mac Cleaner).
- 🔍 **Space Analyzer:** Visually inspect and locate large files and folders consuming your disk storage.
- 🗑️ **Smart App Uninstaller:** Completely uninstall applications, wiping leftover files in `~/Library` and associated hidden folders.
- ⚡️ **Development Purge:** Quickly free up gigabytes by safely removing `node_modules`, `vendor` and build artifacts across all your projects.
- 🔒 **Native Security (Touch ID):** Seamless macOS integration via Touch ID or administrator password for tasks requiring elevated privileges.
- 🎨 **Dynamic Themes:** Full support for Light, Dark, and Default mode with native macOS blur and transparency effects.
- 🚀 **Lightweight Architecture:** Built on Tauri v2 and Rust; low memory footprint and an ultra-compact binary size (~3 MB).
- 🌐 **Bilingual Interface:** Real-time language switching between English and Spanish.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React
- **Backend / Wrapper:** Tauri v2 (Rust)
- **Cleaning Engine:** [mole](https://github.com/tw93/mole) (with dynamic download and runtime patching)

---

## 📥 Installation

### Method 1: .DMG File (Recommended)

1. Head over to the [Releases](../../releases) section of this repository.
2. Download the latest installer version `Kirei_x.x.x_aarch64.dmg`.
3. Open the downloaded file and drag **Kirei** into your **Applications** folder.

> **Note:** The first time you launch the app, macOS may require authorization in *System Settings > Privacy & Security* if the binary lacks an Apple-signed developer certificate.

---

## 💻 Local Development & Build

### Prerequisites

- **macOS** (Apple Silicon M1/M2/M3/M4 or Intel)
- **Node.js** (v18 or higher) and **npm**
- **Rust** and **Cargo** (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Xcode Command Line Tools** (`xcode-select --install`)

### Clone the Repository

```bash
git clone https://github.com/YOUR_USER/kirei.git
cd kirei
```

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run tauri dev
```

### Code Audit & Linters

The project implements strict checks before any build to prevent regressions or vulnerabilities:

```bash
# Audit Frontend (TypeScript) and Backend (Rust Clippy)
npm run check:all
```

### Build for Production (.app and .dmg)

```bash
npm run tauri build
```

The final installer will be generated in:
`src-tauri/target/release/bundle/dmg/Kirei_x.x.x_aarch64.dmg`

---

## 🛡️ Security & Privacy

- **Full Transparency:** Actions executed are fully inspectable from the built-in terminal within the application.
- **No Hidden Telemetry:** The application does not send private data or telemetry to external servers.
- **On-Demand Access:** Only requests elevated permissions through native system dialogs when a specific system cleanup task requires it.
- **Direct Engine Download:** Kirei securely downloads the core CLI directly from GitHub Container Registry (ghcr.io) via Homebrew infrastructure.

---

## 📜 License

This project is licensed under the **GPL-3.0 License**. See the `LICENSE` file for more details.
