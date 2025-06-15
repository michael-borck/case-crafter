// TypeScript interfaces for backup functionality

export interface BackupConfig {
  enabled: boolean;
  interval_hours: number;
  max_backups: number;
  compress: boolean;
  encrypt: boolean;
  backup_directory: string;
  include_attachments: boolean;
  include_user_data: boolean;
  exclude_temporary_data: boolean;
}

export interface BackupMetadata {
  id: string;
  created_at: string; // ISO date string
  database_version: string;
  app_version: string;
  size_bytes: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  tables_included: string[];
  record_counts: Record<string, number>;
  description?: string | null;
}

export interface BackupInfo {
  metadata: BackupMetadata;
  file_path: string;
  file_size: number;
  is_valid: boolean;
}

export interface BackupStats {
  total_backups: number;
  total_size_bytes: number;
  latest_backup?: string | null; // ISO date string
  oldest_backup?: string | null; // ISO date string
  encrypted_count: number;
  compressed_count: number;
  backup_directory: string;
}

export interface BackupSchedule {
  enabled: boolean;
  interval_hours: number;
  next_backup?: string | null; // ISO date string
  last_backup?: string | null; // ISO date string
  retry_attempts: number;
  retry_delay_minutes: number;
}

export enum SchedulerStatus {
  Stopped = 'Stopped',
  Running = 'Running',
  Paused = 'Paused',
  Error = 'Error',
}

export interface SchedulerStats {
  status: SchedulerStatus;
  total_scheduled_backups: number;
  successful_backups: number;
  failed_backups: number;
  last_backup_time?: string | null; // ISO date string
  next_backup_time?: string | null; // ISO date string
  uptime_hours: number;
}

export interface BackupEvent {
  BackupStarted?: { timestamp: string };
  BackupCompleted?: { 
    timestamp: string; 
    backup_id: string; 
    size_bytes: number 
  };
  BackupFailed?: { 
    timestamp: string; 
    error: string; 
    retry_count: number 
  };
  SchedulerStarted?: { timestamp: string };
  SchedulerStopped?: { timestamp: string };
  SchedulerPaused?: { timestamp: string };
  SchedulerResumed?: { timestamp: string };
  ConfigurationChanged?: { timestamp: string };
}

// API interfaces for frontend-backend communication
export interface BackupAPI {
  initializeBackup(config: BackupConfig): Promise<boolean>;
  getBackupConfig(): Promise<BackupConfig>;
  createBackup(description?: string): Promise<BackupInfo>;
  listBackups(): Promise<BackupInfo[]>;
  restoreBackup(backupPath: string, force: boolean): Promise<boolean>;
  deleteBackup(backupPath: string): Promise<boolean>;
  validateBackup(backupPath: string): Promise<boolean>;
  getBackupStats(): Promise<BackupStats>;
  
  // Scheduler methods
  startBackupScheduler(): Promise<boolean>;
  stopBackupScheduler(): Promise<boolean>;
  pauseBackupScheduler(): Promise<boolean>;
  resumeBackupScheduler(): Promise<boolean>;
  updateBackupSchedule(schedule: BackupSchedule): Promise<boolean>;
  getSchedulerStatus(): Promise<SchedulerStatus>;
  getBackupSchedule(): Promise<BackupSchedule>;
  getSchedulerStats(): Promise<SchedulerStats>;
  getBackupEvents(limit: number): Promise<BackupEvent[]>;
  triggerImmediateBackup(description?: string): Promise<boolean>;
  
  // Configuration management
  exportBackupConfig(): Promise<Record<string, any>>;
  importBackupConfig(config: Record<string, any>): Promise<boolean>;
  testBackupSystem(): Promise<Record<string, any>>;
  getBackupSystemInfo(): Promise<Record<string, any>>;
}

// Service implementation for Tauri
export class BackupService implements BackupAPI {
  constructor(private invoke: (cmd: string, args?: any) => Promise<any>) {}

  async initializeBackup(config: BackupConfig): Promise<boolean> {
    return this.invoke('initialize_backup', { config });
  }

  async getBackupConfig(): Promise<BackupConfig> {
    return this.invoke('get_backup_config');
  }

  async createBackup(description?: string): Promise<BackupInfo> {
    return this.invoke('create_backup', { description });
  }

  async listBackups(): Promise<BackupInfo[]> {
    return this.invoke('list_backups');
  }

  async restoreBackup(backupPath: string, force: boolean): Promise<boolean> {
    return this.invoke('restore_backup', { backupPath, force });
  }

  async deleteBackup(backupPath: string): Promise<boolean> {
    return this.invoke('delete_backup', { backupPath });
  }

  async validateBackup(backupPath: string): Promise<boolean> {
    return this.invoke('validate_backup', { backupPath });
  }

  async getBackupStats(): Promise<BackupStats> {
    return this.invoke('get_backup_stats');
  }

  async startBackupScheduler(): Promise<boolean> {
    return this.invoke('start_backup_scheduler');
  }

  async stopBackupScheduler(): Promise<boolean> {
    return this.invoke('stop_backup_scheduler');
  }

  async pauseBackupScheduler(): Promise<boolean> {
    return this.invoke('pause_backup_scheduler');
  }

  async resumeBackupScheduler(): Promise<boolean> {
    return this.invoke('resume_backup_scheduler');
  }

  async updateBackupSchedule(schedule: BackupSchedule): Promise<boolean> {
    return this.invoke('update_backup_schedule', { schedule });
  }

  async getSchedulerStatus(): Promise<SchedulerStatus> {
    return this.invoke('get_scheduler_status');
  }

  async getBackupSchedule(): Promise<BackupSchedule> {
    return this.invoke('get_backup_schedule');
  }

  async getSchedulerStats(): Promise<SchedulerStats> {
    return this.invoke('get_scheduler_stats');
  }

  async getBackupEvents(limit: number): Promise<BackupEvent[]> {
    return this.invoke('get_backup_events', { limit });
  }

  async triggerImmediateBackup(description?: string): Promise<boolean> {
    return this.invoke('trigger_immediate_backup', { description });
  }

  async exportBackupConfig(): Promise<Record<string, any>> {
    return this.invoke('export_backup_config');
  }

  async importBackupConfig(config: Record<string, any>): Promise<boolean> {
    return this.invoke('import_backup_config', { configData: config });
  }

  async testBackupSystem(): Promise<Record<string, any>> {
    return this.invoke('test_backup_system');
  }

  async getBackupSystemInfo(): Promise<Record<string, any>> {
    return this.invoke('get_backup_system_info');
  }
}

// Utility types for backup UI components
export interface BackupProgressInfo {
  isRunning: boolean;
  progress?: number; // 0-100 percentage
  currentStep?: string;
  estimatedTimeRemaining?: number; // seconds
}

export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: BackupMetadata;
}

export interface BackupRestoreOptions {
  force: boolean;
  backupUserData: boolean;
  validateBeforeRestore: boolean;
  createBackupBeforeRestore: boolean;
}

// Constants for backup system
export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: true,
  interval_hours: 24,
  max_backups: 30,
  compress: true,
  encrypt: true,
  backup_directory: 'backups',
  include_attachments: true,
  include_user_data: true,
  exclude_temporary_data: true,
};

export const DEFAULT_BACKUP_SCHEDULE: BackupSchedule = {
  enabled: true,
  interval_hours: 24,
  retry_attempts: 3,
  retry_delay_minutes: 30,
};

// Type guards for backup data
export function isBackupInfo(value: any): value is BackupInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.metadata === 'object' &&
    typeof value.file_path === 'string' &&
    typeof value.file_size === 'number' &&
    typeof value.is_valid === 'boolean'
  );
}

export function isBackupEvent(value: any): value is BackupEvent {
  if (typeof value !== 'object' || value === null) return false;
  
  const eventTypes = [
    'BackupStarted', 'BackupCompleted', 'BackupFailed',
    'SchedulerStarted', 'SchedulerStopped', 'SchedulerPaused',
    'SchedulerResumed', 'ConfigurationChanged'
  ];
  
  return eventTypes.some(type => type in value);
}

export function getBackupEventType(event: BackupEvent): string {
  if ('BackupStarted' in event) return 'BackupStarted';
  if ('BackupCompleted' in event) return 'BackupCompleted';
  if ('BackupFailed' in event) return 'BackupFailed';
  if ('SchedulerStarted' in event) return 'SchedulerStarted';
  if ('SchedulerStopped' in event) return 'SchedulerStopped';
  if ('SchedulerPaused' in event) return 'SchedulerPaused';
  if ('SchedulerResumed' in event) return 'SchedulerResumed';
  if ('ConfigurationChanged' in event) return 'ConfigurationChanged';
  return 'Unknown';
}

export function getBackupEventTimestamp(event: BackupEvent): string {
  const eventData = Object.values(event)[0] as any;
  return eventData?.timestamp || '';
}

// Helper functions for backup management
export function formatBackupSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function calculateBackupRetention(backups: BackupInfo[], maxBackups: number): BackupInfo[] {
  const sortedBackups = [...backups].sort((a, b) => 
    new Date(b.metadata.created_at).getTime() - new Date(a.metadata.created_at).getTime()
  );
  
  return sortedBackups.slice(maxBackups);
}

export function isBackupStale(backup: BackupInfo, maxAgeHours: number): boolean {
  const backupDate = new Date(backup.metadata.created_at);
  const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
  return Date.now() - backupDate.getTime() > maxAge;
}