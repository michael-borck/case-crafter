# Cross-platform development setup script for Case Crafter (PowerShell)

Write-Host "🚀 Setting up Case Crafter development environment..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "Visit: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if Rust is installed
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust found: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust is not installed. Please install Rust first." -ForegroundColor Red
    Write-Host "Visit: https://rustup.rs/" -ForegroundColor Yellow
    exit 1
}

# Install Tauri CLI if not present
try {
    tauri --version | Out-Null
    Write-Host "✅ Tauri CLI already installed" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing Tauri CLI..." -ForegroundColor Yellow
    cargo install tauri-cli
}

# Install cross-compilation targets
Write-Host "🎯 Installing Rust targets for cross-compilation..." -ForegroundColor Yellow
rustup target add x86_64-unknown-linux-gnu
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Check for Visual Studio Build Tools
Write-Host "🪟 Windows detected. Checking for Visual Studio Build Tools..." -ForegroundColor Yellow
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vsWhere) {
    $vsInstances = & $vsWhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64
    if ($vsInstances) {
        Write-Host "✅ Visual Studio Build Tools found" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Visual Studio Build Tools not found. Please install Visual Studio Build Tools." -ForegroundColor Yellow
        Write-Host "Visit: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Visual Studio Installer not found. Please install Visual Studio Build Tools." -ForegroundColor Yellow
}

# Install npm dependencies
Write-Host "📦 Installing npm dependencies..." -ForegroundColor Yellow
npm install

Write-Host "✅ Development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 You can now run:" -ForegroundColor Cyan
Write-Host "  npm run tauri:dev    - Start development server" -ForegroundColor White
Write-Host "  npm run tauri:build  - Build for current platform" -ForegroundColor White
Write-Host "  npm run build:all    - Build for all platforms" -ForegroundColor White
Write-Host ""