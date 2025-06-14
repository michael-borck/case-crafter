# Offline-First Architecture

## Overview

Case Crafter is designed as an **offline-first desktop application** using Tauri, which provides native desktop capabilities without requiring internet connectivity for core functionality.

## Architecture Principles

### 1. Local-First Data Storage
- **SQLite Database**: All user data, case studies, and configurations stored locally
- **File System Access**: Direct access to local files for import/export
- **No Remote Database**: No dependency on cloud databases for core functionality

### 2. Native Desktop Application
- **Tauri Framework**: Rust backend with React frontend in a native webview
- **OS Integration**: Native file dialogs, system notifications, and OS-level features
- **Direct Hardware Access**: Can utilize local GPU, full CPU resources, and system memory

### 3. Optional Network Connectivity
- **AI Services**: Network only required for AI model API calls (OpenAI, Anthropic, etc.)
- **Local AI Models**: Ollama integration allows completely offline AI processing
- **Graceful Degradation**: App functions fully without internet when using local models

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Case Crafter Desktop App                 │
├─────────────────────────────────────────────────────────────┤
│  React Frontend (Tauri Webview)                            │
│  ├─ Material-UI Components                                 │
│  ├─ Theme Management (persisted locally)                   │
│  ├─ Local State Management                                 │
│  └─ Offline-capable UI                                     │
├─────────────────────────────────────────────────────────────┤
│  Tauri IPC Bridge                                          │
│  ├─ Type-safe communication                                │
│  ├─ Command invocation                                     │
│  └─ Event system                                           │
├─────────────────────────────────────────────────────────────┤
│  Rust Backend (Native Binary)                              │
│  ├─ SQLite Integration                                     │
│  │  ├─ Case study storage                                 │
│  │  ├─ User preferences                                   │
│  │  ├─ Configuration templates                            │
│  │  └─ Usage analytics                                    │
│  ├─ File System Operations                                │
│  │  ├─ Import/Export (PDF, Word, HTML)                   │
│  │  ├─ Backup creation                                   │
│  │  └─ Template management                               │
│  ├─ Local AI Integration (Ollama)                         │
│  │  ├─ Model management                                  │
│  │  ├─ Local inference                                   │
│  │  └─ No network required                               │
│  └─ Optional Cloud AI APIs                               │
│     ├─ OpenAI, Anthropic (when online)                   │
│     ├─ Fallback to local models                          │
│     └─ Caching for offline access                        │
└─────────────────────────────────────────────────────────────┘
```

## Local Storage Strategy

### SQLite Database Schema
- **case_studies**: Generated content, metadata, versions
- **templates**: Reusable configuration templates  
- **users**: User preferences and settings
- **frameworks**: Business framework definitions
- **analytics**: Usage tracking and performance metrics

### File System Structure
```
~/.case-crafter/
├── database/
│   ├── case_crafter.db        # Main SQLite database
│   └── backups/               # Automated backups
├── models/                    # Local AI models (Ollama)
├── exports/                   # Generated exports
├── imports/                   # Imported content
└── config/
    ├── user_preferences.json  # User settings
    └── app_config.json        # Application configuration
```

## Offline Capabilities

### ✅ **Fully Offline Features:**
- Case study generation (with local AI models)
- Content library browsing and search
- Assessment question creation
- Template management
- Data export/import
- Theme switching and UI customization
- Analytics and reporting

### 🌐 **Online-Enhanced Features:**
- Cloud AI model access (OpenAI, Anthropic, Google)
- Software updates
- Template sharing (future feature)
- Cloud backup sync (future feature)

## Network Resilience

### Connection Loss Handling
1. **Graceful Degradation**: Automatically switch to local AI models
2. **Queue Management**: Queue cloud requests when offline, process when online
3. **User Notification**: Clear indicators of online/offline status
4. **Data Integrity**: All operations complete successfully regardless of connectivity

### Retry Mechanisms
- **Exponential Backoff**: For failed cloud API calls
- **Circuit Breaker**: Prevent cascade failures
- **Local Fallback**: Always have offline alternative

## Why No Service Workers?

**Service Workers are for web applications** running in browsers. Case Crafter is a **native desktop application** with:

- **Direct File Access**: No need to cache resources - we have full filesystem access
- **Native Storage**: SQLite runs natively, not through browser APIs
- **No HTTP Requests**: Frontend communicates with backend via Tauri IPC, not HTTP
- **OS Integration**: Native system APIs, not web APIs

## Performance Benefits

### Local Processing
- **No Network Latency**: All UI interactions are instant
- **Full Resource Access**: Can use all available CPU/memory
- **Persistent Storage**: No storage quotas or limitations
- **Native Performance**: Rust backend provides optimal performance

### Caching Strategy
- **Database Queries**: Efficient SQLite indexes for fast search
- **Generated Content**: All content stored locally for instant access
- **AI Responses**: Cache AI-generated content to reduce API calls
- **Template Library**: Local template storage for immediate use

## Security Considerations

### Local Data Protection
- **AES-256 Encryption**: Sensitive data encrypted at rest
- **User-Controlled**: All data remains on user's device
- **No Cloud Dependency**: Privacy by design - no data leaves device unless explicitly requested
- **Secure Updates**: Code-signed application updates

### Network Security
- **HTTPS Only**: All external API calls use secure connections
- **API Key Management**: Secure local storage of API credentials
- **Certificate Validation**: Proper SSL/TLS certificate checking

## Future Enhancements

### Enhanced Offline Capabilities
- **Local LLM Models**: Expanded support for local AI models
- **Offline Search**: Advanced full-text search without network
- **Peer-to-Peer Sharing**: Direct device-to-device template sharing
- **Mesh Networking**: Collaborate without central server

## Testing Offline Functionality

### Manual Testing
1. **Disconnect Network**: Verify all core features work
2. **Local AI Models**: Test case generation with Ollama
3. **Data Persistence**: Ensure data survives app restarts
4. **Import/Export**: Verify file operations work offline

### Automated Testing
- **Integration Tests**: Test offline scenarios
- **Performance Tests**: Measure local operation speed
- **Data Integrity**: Verify database consistency
- **Error Handling**: Test network failure scenarios

---

**Note**: This document replaces the original "service workers" task as service workers are not applicable to native desktop applications. Case Crafter achieves offline-first functionality through native desktop capabilities and local data storage.