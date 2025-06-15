// React hooks for backup management

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  BackupConfig, 
  BackupInfo, 
  BackupStats, 
  BackupSchedule,
  SchedulerStatus,
  SchedulerStats,
  BackupEvent,
  BackupProgressInfo,
  DEFAULT_BACKUP_CONFIG
} from '../types/backup';

export interface UseBackupReturn {
  // Configuration
  config: BackupConfig | null;
  updateConfig: (config: BackupConfig) => Promise<void>;
  
  // Backup operations
  backups: BackupInfo[];
  isLoading: boolean;
  error: string | null;
  createBackup: (description?: string) => Promise<BackupInfo | null>;
  restoreBackup: (backupPath: string, force?: boolean) => Promise<void>;
  deleteBackup: (backupPath: string) => Promise<void>;
  validateBackup: (backupPath: string) => Promise<boolean>;
  refreshBackups: () => Promise<void>;
  
  // Statistics
  stats: BackupStats | null;
  refreshStats: () => Promise<void>;
  
  // Progress tracking
  progressInfo: BackupProgressInfo;
}

export function useBackup(): UseBackupReturn {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressInfo, setProgressInfo] = useState<BackupProgressInfo>({
    isRunning: false
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadConfig(),
          refreshBackups(),
          refreshStats(),
        ]);
      } catch (err) {
        console.error('Failed to load backup data:', err);
        setError('Failed to load backup information');
      }
    };

    loadInitialData();
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const loadedConfig = await invoke('get_backup_config') as BackupConfig;
      setConfig(loadedConfig);
    } catch (err) {
      // If no config exists, use default
      setConfig(DEFAULT_BACKUP_CONFIG);
    }
  }, []);

  const updateConfig = useCallback(async (newConfig: BackupConfig): Promise<void> => {
    setError(null);
    
    try {
      await invoke('initialize_backup', { config: newConfig });
      setConfig(newConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const refreshBackups = useCallback(async (): Promise<void> => {
    try {
      const backupList = await invoke('list_backups') as BackupInfo[];
      setBackups(backupList);
    } catch (err) {
      console.error('Failed to refresh backups:', err);
      setError('Failed to load backup list');
    }
  }, []);

  const refreshStats = useCallback(async (): Promise<void> => {
    try {
      const backupStats = await invoke('get_backup_stats') as BackupStats;
      setStats(backupStats);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
      // Don't set error for stats refresh failure
    }
  }, []);

  const createBackup = useCallback(async (description?: string): Promise<BackupInfo | null> => {
    setIsLoading(true);
    setError(null);
    setProgressInfo({ isRunning: true, currentStep: 'Initializing backup...' });

    try {
      const backupInfo = await invoke('create_backup', { description }) as BackupInfo;
      
      // Refresh data after successful backup
      await Promise.all([refreshBackups(), refreshStats()]);
      
      setProgressInfo({ isRunning: false });
      return backupInfo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Backup creation failed';
      setError(errorMessage);
      setProgressInfo({ isRunning: false });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshBackups, refreshStats]);

  const restoreBackup = useCallback(async (backupPath: string, force = false): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setProgressInfo({ isRunning: true, currentStep: 'Restoring backup...' });

    try {
      await invoke('restore_backup', { backupPath, force });
      setProgressInfo({ isRunning: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Backup restoration failed';
      setError(errorMessage);
      setProgressInfo({ isRunning: false });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteBackup = useCallback(async (backupPath: string): Promise<void> => {
    setError(null);

    try {
      await invoke('delete_backup', { backupPath });
      await Promise.all([refreshBackups(), refreshStats()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete backup';
      setError(errorMessage);
      throw err;
    }
  }, [refreshBackups, refreshStats]);

  const validateBackup = useCallback(async (backupPath: string): Promise<boolean> => {
    setError(null);

    try {
      return await invoke('validate_backup', { backupPath }) as boolean;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Backup validation failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  return {
    config,
    updateConfig,
    backups,
    isLoading,
    error,
    createBackup,
    restoreBackup,
    deleteBackup,
    validateBackup,
    refreshBackups,
    stats,
    refreshStats,
    progressInfo,
  };
}

// Hook for backup scheduler management
export interface UseBackupSchedulerReturn {
  schedule: BackupSchedule | null;
  status: SchedulerStatus;
  stats: SchedulerStats | null;
  events: BackupEvent[];
  isLoading: boolean;
  error: string | null;

  updateSchedule: (schedule: BackupSchedule) => Promise<void>;
  startScheduler: () => Promise<void>;
  stopScheduler: () => Promise<void>;
  pauseScheduler: () => Promise<void>;
  resumeScheduler: () => Promise<void>;
  triggerBackup: (description?: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useBackupScheduler(): UseBackupSchedulerReturn {
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [status, setStatus] = useState<SchedulerStatus>(SchedulerStatus.Stopped);
  const [stats, setStats] = useState<SchedulerStats | null>(null);
  const [events, setEvents] = useState<BackupEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Polling interval for status updates
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    refreshData();
    
    // Set up polling for status updates when scheduler is running
    intervalRef.current = setInterval(async () => {
      try {
        const currentStatus = await invoke('get_scheduler_status') as SchedulerStatus;
        setStatus(currentStatus);
        
        if (currentStatus === SchedulerStatus.Running) {
          const currentStats = await invoke('get_scheduler_stats') as SchedulerStats;
          setStats(currentStats);
        }
      } catch (err) {
        console.error('Failed to poll scheduler status:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const refreshData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        currentSchedule,
        currentStatus,
        currentStats,
        recentEvents
      ] = await Promise.all([
        invoke('get_backup_schedule') as Promise<BackupSchedule>,
        invoke('get_scheduler_status') as Promise<SchedulerStatus>,
        invoke('get_scheduler_stats') as Promise<SchedulerStats>,
        invoke('get_backup_events', { limit: 50 }) as Promise<BackupEvent[]>,
      ]);

      setSchedule(currentSchedule);
      setStatus(currentStatus);
      setStats(currentStats);
      setEvents(recentEvents);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load scheduler data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSchedule = useCallback(async (newSchedule: BackupSchedule): Promise<void> => {
    setError(null);

    try {
      await invoke('update_backup_schedule', { schedule: newSchedule });
      setSchedule(newSchedule);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update schedule';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const startScheduler = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      await invoke('start_backup_scheduler');
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start scheduler';
      setError(errorMessage);
      throw err;
    }
  }, [refreshData]);

  const stopScheduler = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      await invoke('stop_backup_scheduler');
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop scheduler';
      setError(errorMessage);
      throw err;
    }
  }, [refreshData]);

  const pauseScheduler = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      await invoke('pause_backup_scheduler');
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause scheduler';
      setError(errorMessage);
      throw err;
    }
  }, [refreshData]);

  const resumeScheduler = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      await invoke('resume_backup_scheduler');
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume scheduler';
      setError(errorMessage);
      throw err;
    }
  }, [refreshData]);

  const triggerBackup = useCallback(async (description?: string): Promise<void> => {
    setError(null);

    try {
      await invoke('trigger_immediate_backup', { description });
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger backup';
      setError(errorMessage);
      throw err;
    }
  }, [refreshData]);

  return {
    schedule,
    status,
    stats,
    events,
    isLoading,
    error,
    updateSchedule,
    startScheduler,
    stopScheduler,
    pauseScheduler,
    resumeScheduler,
    triggerBackup,
    refreshData,
  };
}

// Hook for backup system health monitoring
export interface UseBackupHealthReturn {
  systemHealth: Record<string, any> | null;
  systemInfo: Record<string, any> | null;
  isHealthy: boolean;
  isLoading: boolean;
  error: string | null;
  checkHealth: () => Promise<void>;
}

export function useBackupHealth(): UseBackupHealthReturn {
  const [systemHealth, setSystemHealth] = useState<Record<string, any> | null>(null);
  const [systemInfo, setSystemInfo] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const [health, info] = await Promise.all([
        invoke('test_backup_system') as Promise<Record<string, any>>,
        invoke('get_backup_system_info') as Promise<Record<string, any>>,
      ]);

      setSystemHealth(health);
      setSystemInfo(info);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Health check failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const isHealthy = systemHealth?.system_healthy === true;

  return {
    systemHealth,
    systemInfo,
    isHealthy,
    isLoading,
    error,
    checkHealth,
  };
}