// React hook for encryption management

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  EncryptedData, 
  EncryptionStats, 
  EncryptionStatus,
  UseEncryptionReturn 
} from '../types/encryption';

export function useEncryption(): UseEncryptionReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if encryption is initialized on mount
  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const initialized = await invoke('is_encryption_initialized') as boolean;
        setIsInitialized(initialized);
      } catch (err) {
        console.error('Failed to check encryption initialization:', err);
        setError('Failed to check encryption status');
      }
    };

    checkInitialization();
  }, []);

  const initialize = useCallback(async (password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await invoke('initialize_encryption', { password });
      if (success) {
        setIsInitialized(true);
      } else {
        throw new Error('Failed to initialize encryption');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Encryption initialization failed: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const encrypt = useCallback(async (value: string): Promise<EncryptedData> => {
    if (!isInitialized) {
      throw new Error('Encryption not initialized');
    }
    
    try {
      return await invoke('encrypt_value', { value });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Encryption failed';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const decrypt = useCallback(async (data: EncryptedData): Promise<string> => {
    if (!isInitialized) {
      throw new Error('Encryption not initialized');
    }
    
    try {
      return await invoke('decrypt_value', { encryptedData: data });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Decryption failed';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const encryptPreferences = useCallback(async (preferences: any): Promise<string> => {
    if (!isInitialized) {
      throw new Error('Encryption not initialized');
    }
    
    try {
      return await invoke('encrypt_user_preferences', { preferences });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Preferences encryption failed';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const decryptPreferences = useCallback(async (encrypted: string): Promise<any> => {
    if (!isInitialized) {
      throw new Error('Encryption not initialized');
    }
    
    try {
      return await invoke('decrypt_user_preferences', { encryptedPreferences: encrypted });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Preferences decryption failed';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<void> => {
    if (!isInitialized) {
      throw new Error('Encryption not initialized');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await invoke('change_encryption_password', { oldPassword, newPassword });
      if (!success) {
        throw new Error('Failed to change encryption password');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password change failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const testEncryption = useCallback(async (data: string): Promise<boolean> => {
    if (!isInitialized) {
      throw new Error('Encryption not initialized');
    }
    
    try {
      return await invoke('test_encryption', { testData: data });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Encryption test failed';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const getStats = useCallback(async (): Promise<EncryptionStats> => {
    try {
      return await invoke('get_encryption_stats');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get encryption stats';
      setError(errorMessage);
      throw err;
    }
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
    initialize,
    encrypt,
    decrypt,
    encryptPreferences,
    decryptPreferences,
    changePassword,
    testEncryption,
    getStats,
  };
}

// Hook for encryption status management
export function useEncryptionStatus() {
  const [status, setStatus] = useState<EncryptionStatus>(EncryptionStatus.Uninitialized);
  const [stats, setStats] = useState<EncryptionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback(async () => {
    try {
      setStatus(EncryptionStatus.Initializing);
      
      const [isInitialized, encryptionStats] = await Promise.all([
        invoke('is_encryption_initialized') as Promise<boolean>,
        invoke('get_encryption_stats').catch(() => null) as Promise<EncryptionStats | null>, // Optional stats
      ]);

      if (isInitialized) {
        setStatus(EncryptionStatus.Ready);
        setStats(encryptionStats);
        setError(null);
      } else {
        setStatus(EncryptionStatus.Uninitialized);
        setStats(encryptionStats);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check encryption status';
      setStatus(EncryptionStatus.Error);
      setError(errorMessage);
    }
  }, []);

  useEffect(() => {
    updateStatus();
  }, [updateStatus]);

  return {
    status,
    stats,
    error,
    refresh: updateStatus,
  };
}

// Hook for secure field management
export function useSecureField(initialValue: string | EncryptedData, isEncrypted = false) {
  const [value, setValue] = useState(initialValue);
  const [encrypted, setEncrypted] = useState(isEncrypted);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { encrypt, decrypt, isInitialized } = useEncryption();

  const encryptValue = useCallback(async () => {
    if (!isInitialized) {
      throw new Error('Encryption not initialized');
    }

    if (encrypted || typeof value !== 'string') {
      return; // Already encrypted or not a string
    }

    setIsProcessing(true);
    setError(null);

    try {
      const encryptedData = await encrypt(value);
      setValue(encryptedData);
      setEncrypted(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Encryption failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [value, encrypted, isInitialized, encrypt]);

  const decryptValue = useCallback(async () => {
    if (!isInitialized) {
      throw new Error('Encryption not initialized');
    }

    if (!encrypted || typeof value === 'string') {
      return; // Not encrypted or already a string
    }

    setIsProcessing(true);
    setError(null);

    try {
      const decryptedData = await decrypt(value as EncryptedData);
      setValue(decryptedData);
      setEncrypted(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Decryption failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [value, encrypted, isInitialized, decrypt]);

  const updateValue = useCallback((newValue: string | EncryptedData, isNewValueEncrypted?: boolean) => {
    setValue(newValue);
    if (isNewValueEncrypted !== undefined) {
      setEncrypted(isNewValueEncrypted);
    }
    setError(null);
  }, []);

  return {
    value,
    encrypted,
    isProcessing,
    error,
    encryptValue,
    decryptValue,
    updateValue,
  };
}