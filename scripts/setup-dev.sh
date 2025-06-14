#!/bin/bash

# Cross-platform development setup script for Case Crafter

set -e

echo "🚀 Setting up Case Crafter development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first."
    echo "Visit: https://rustup.rs/"
    exit 1
fi

# Install Tauri CLI if not present
if ! command -v tauri &> /dev/null; then
    echo "📦 Installing Tauri CLI..."
    cargo install tauri-cli
fi

# Install cross-compilation targets
echo "🎯 Installing Rust targets for cross-compilation..."
rustup target add x86_64-unknown-linux-gnu
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Platform-specific dependencies
case "$(uname -s)" in
    Linux*)
        echo "🐧 Installing Linux dependencies..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            
            # Check Ubuntu version and install appropriate webkit package
            if lsb_release -d 2>/dev/null | grep -q "Ubuntu 24\|Ubuntu 22"; then
                echo "📦 Installing dependencies for Ubuntu 22.04/24.04..."
                sudo apt-get install -y \
                    libwebkit2gtk-4.1-dev \
                    libgtk-3-dev \
                    librsvg2-dev \
                    patchelf \
                    build-essential \
                    curl \
                    wget \
                    file \
                    libxdo3 \
                    libssl-dev
                
                # Handle appindicator package conflict
                echo "📦 Installing appindicator (handling package conflicts)..."
                if dpkg -l | grep -q libappindicator3-dev; then
                    echo "ℹ️  Using existing libappindicator3-dev package"
                else
                    # Try ayatana first, fall back to standard if conflict
                    sudo apt-get install -y libayatana-appindicator3-dev 2>/dev/null || \
                    sudo apt-get install -y libappindicator3-dev
                fi
            else
                echo "📦 Installing dependencies for older Ubuntu versions..."
                sudo apt-get install -y \
                    libwebkit2gtk-4.0-dev \
                    libgtk-3-dev \
                    libappindicator3-dev \
                    librsvg2-dev \
                    patchelf \
                    build-essential \
                    curl \
                    wget \
                    file \
                    libxdo3 \
                    libssl-dev
            fi
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y \
                webkit2gtk4.0-devel \
                gtk3-devel \
                libappindicator-gtk3-devel \
                librsvg2-devel \
                openssl-devel \
                curl \
                wget \
                file
        elif command -v pacman &> /dev/null; then
            sudo pacman -S --needed \
                webkit2gtk \
                gtk3 \
                libappindicator-gtk3 \
                librsvg \
                openssl \
                curl \
                wget \
                file
        fi
        ;;
    Darwin*)
        echo "🍎 macOS detected. Make sure Xcode command line tools are installed."
        if ! xcode-select -p &> /dev/null; then
            echo "Installing Xcode command line tools..."
            xcode-select --install
        fi
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*)
        echo "🪟 Windows detected. Make sure you have Visual Studio Build Tools installed."
        ;;
esac

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

echo "✅ Development environment setup complete!"
echo ""
echo "🎉 You can now run:"
echo "  npm run tauri:dev    - Start development server"
echo "  npm run tauri:build  - Build for current platform"
echo "  npm run build:all    - Build for all platforms"
echo ""