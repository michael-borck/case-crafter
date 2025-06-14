# Case Crafter

An intelligent case study generator designed to create contextual business case studies for educational purposes.

## Overview

Case Crafter is a cross-platform desktop application built with Tauri that provides privacy-first case study generation. The application leverages artificial intelligence to generate realistic scenarios, assessment questions, and learning materials tailored to specific domains, complexity levels, and educational objectives.

## Key Features

- **Multi-domain Support**: Business, Technology, Healthcare, Science, Social Sciences
- **Privacy-First Architecture**: Local AI processing with Ollama integration
- **Dynamic Configuration System**: Customizable input fields and business framework integration
- **Intelligent Content Generation**: AI-powered case study and assessment creation
- **Offline Functionality**: Complete functionality without internet connectivity
- **Cross-Platform**: Windows, macOS, and Linux support

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Rust (Tauri 2.x framework)
- **Database**: SQLite for local storage
- **AI Integration**: Ollama for local models, optional cloud AI APIs
- **UI Framework**: Material-UI components

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Rust and Cargo
- Tauri CLI

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd case-crafter

# Install dependencies
npm install

# Install Tauri CLI (if not already installed)
npm install --save-dev @tauri-apps/cli

# Run in development mode
npm run tauri dev
```

### Building

```bash
# Build for production
npm run tauri build
```

## Project Structure

- `src/` - React frontend source code
- `src-tauri/` - Rust backend source code
- `docs/` - Documentation including PRD
- `tasks/` - Implementation task lists
- `tests/` - Test files

## Documentation

- [Product Requirements Document](docs/case_crafter_prd.md)
- [Implementation Tasks](tasks/tasks-case_crafter_prd.md)

## Development Status

This project is currently in initial development. See the [task list](tasks/tasks-case_crafter_prd.md) for implementation progress.

## License

[License to be determined]

## Contributing

[Contributing guidelines to be added]