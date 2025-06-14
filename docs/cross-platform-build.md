# Cross-Platform Build Guide

This document outlines how to build Case Crafter for different platforms (Windows, macOS, and Linux).

## Prerequisites

### All Platforms
- Node.js 18+ ([Download](https://nodejs.org/))
- Rust toolchain ([Install](https://rustup.rs/))
- Git

### Platform-Specific Requirements

#### Linux
```bash
# Ubuntu 22.04/24.04 (newer versions)
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf libayatana-appindicator3-dev

# Ubuntu 20.04 (older versions)
sudo apt-get install -y libwebkit2gtk-4.0-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf

# Fedora
sudo dnf install webkit2gtk4.0-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel

# Arch
sudo pacman -S webkit2gtk gtk3 libappindicator-gtk3 librsvg
```

#### macOS
```bash
# Install Xcode command line tools
xcode-select --install
```

#### Windows
- Visual Studio Build Tools 2022 with C++ build tools
- Or Visual Studio Community 2022 with Desktop development with C++ workload

## Quick Setup

### Automated Setup
Run the setup script for your platform:

**Linux/macOS:**
```bash
./scripts/setup-dev.sh
```

**Windows:**
```powershell
.\scripts\setup-dev.ps1
```

### Manual Setup

1. Clone the repository:
```bash
git clone git@github.com:michael-borck/case-crafter.git
cd case-crafter
```

2. Install dependencies:
```bash
npm install
```

3. Install Tauri CLI:
```bash
cargo install tauri-cli
```

4. Install Rust targets for cross-compilation:
```bash
rustup target add x86_64-unknown-linux-gnu
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin
```

## Building

### Development Build
```bash
npm run tauri:dev
```

### Production Build (Current Platform)
```bash
npm run tauri:build
```

### Debug Build
```bash
npm run tauri:build:debug
```

### Cross-Platform Builds

**Linux:**
```bash
npm run build:linux
```

**Windows:**
```bash
npm run build:windows
```

**macOS (Intel):**
```bash
npm run build:macos
```

**macOS (Apple Silicon):**
```bash
npm run build:macos-arm
```

**All Platforms:**
```bash
npm run build:all
```

## Build Outputs

Build artifacts are generated in:
```
src-tauri/target/{target}/release/bundle/
```

### File Types by Platform

#### Linux
- `.deb` - Debian package
- `.rpm` - Red Hat package  
- `.AppImage` - Portable application

#### Windows
- `.msi` - Windows Installer package
- `.exe` - NSIS installer

#### macOS
- `.dmg` - Disk image
- `.app` - Application bundle

## CI/CD

The project includes GitHub Actions workflows for automated cross-platform builds:

- **`.github/workflows/build.yml`** - Main CI/CD pipeline
- Builds on push to main/develop branches
- Creates release artifacts on GitHub releases
- Runs tests and linting before builds

### Triggering a Release

1. Create a new tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

2. Create a GitHub release from the tag
3. GitHub Actions will automatically build and attach binaries

## Troubleshooting

### Common Issues

#### Linux: Missing System Dependencies
```bash
# Ubuntu 24.04/22.04 (newer versions)
sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev

# Ubuntu 20.04 (older versions)  
sudo apt-get install libwebkit2gtk-4.0-dev libgtk-3-dev libappindicator3-dev

# If you get "Unable to locate package libwebkit2gtk-4.0-dev" on Ubuntu 24.04
# Use the newer package name: libwebkit2gtk-4.1-dev
```

#### Windows: MSVC Not Found
- Install Visual Studio Build Tools
- Ensure C++ build tools are selected
- Restart terminal after installation

#### macOS: Code Signing Issues
- For development builds, code signing is not required
- For distribution, configure signing identity in `tauri.conf.json`

#### Rust Compilation Errors
```bash
# Clean and rebuild
cargo clean
npm run tauri:build
```

#### Node/NPM Issues
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Performance Optimization

#### First-Time Build
- Initial Rust compilation can take 10-20 minutes
- Subsequent builds are much faster due to incremental compilation

#### Reducing Build Time
```bash
# Use debug builds for development
npm run tauri:build:debug

# Parallel compilation (add to .cargo/config.toml)
[build]
jobs = 4
```

## Configuration

### Bundle Configuration
Edit `src-tauri/tauri.conf.json` to customize:
- Application metadata
- Bundle targets
- Platform-specific settings
- Code signing configuration

### Cross-Compilation Settings
Edit `.cargo/config.toml` for:
- Target-specific rust flags
- Linker configuration
- Optimization settings

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Rust Cross Compilation](https://rust-lang.github.io/rustup/cross-compilation.html)
- [GitHub Actions for Tauri](https://github.com/tauri-apps/tauri-action)