# Contributing to Kirei

Thank you for your interest in contributing to **Kirei**! We welcome community contributions to make this macOS optimizer even better.

## Development Setup

1. **Prerequisites:**
   - macOS (Apple Silicon or Intel)
   - Node.js (v18+) and npm
   - Rust & Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
   - Xcode Command Line Tools (`xcode-select --install`)

2. **Clone & Install:**
   ```bash
   git clone https://github.com/Jomooto/Kirei.git
   cd Kirei
   npm install
   ```

3. **Run Locally:**
   ```bash
   npm run tauri dev
   ```

## Code Quality & Verification

Before submitting any Pull Request, ensure that all linters, type checks, and tests pass:

```bash
# Verify TypeScript & Rust Clippy
npm run check:all

# Run all test suites
npm run test
```

## Pull Request Guidelines

1. Create a feature branch (`git checkout -b feat/your-feature-name`).
2. Make concise, well-documented commits following Conventional Commits format (`feat: ...`, `fix: ...`, `docs: ...`).
3. Ensure no compiler warnings are introduced (`cargo clippy -D warnings` must exit cleanly).
4. Open a Pull Request referencing any related issues.
