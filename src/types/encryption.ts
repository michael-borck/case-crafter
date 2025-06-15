// TypeScript interfaces for encryption functionality

export interface EncryptedData {
  data: string;      // Base64 encoded encrypted data
  nonce: string;     // Base64 encoded nonce
  algorithm: string; // Encryption algorithm used
  version: string;   // Version for future compatibility
}

export interface EncryptionConfig {
  has_salt: boolean;
  salt_path?: string;
  encryption_algorithm: string;
  key_derivation: string;
}

export interface EncryptionStats {
  algorithm: string;
  key_derivation: string;
  salt_exists: boolean;
  salt_size_bytes?: number;
  salt_created_timestamp?: number;
  nonce_size_bytes: number;
  key_size_bytes: number;
}

// Tauri command interfaces for encryption
export interface EncryptionAPI {
  initializeEncryption(password: string): Promise<boolean>;
  isEncryptionInitialized(): Promise<boolean>;
  encryptValue(value: string): Promise<EncryptedData>;
  decryptValue(encryptedData: EncryptedData): Promise<string>;
  encryptUserPreferences(preferences: any): Promise<string>;
  decryptUserPreferences(encryptedPreferences: string): Promise<any>;
  encryptMap(data: Record<string, string>): Promise<EncryptedData>;
  decryptMap(encryptedData: EncryptedData): Promise<Record<string, string>>;
  changeEncryptionPassword(oldPassword: string, newPassword: string): Promise<boolean>;
  validateEncryptionPassword(password: string): Promise<boolean>;
  exportEncryptionConfig(): Promise<EncryptionConfig>;
  testEncryption(testData: string): Promise<boolean>;
  getEncryptionStats(): Promise<EncryptionStats>;
}

// Encryption service for frontend
export class EncryptionService implements EncryptionAPI {
  constructor(private invoke: (cmd: string, args?: any) => Promise<any>) {}

  async initializeEncryption(password: string): Promise<boolean> {
    return this.invoke('initialize_encryption', { password });
  }

  async isEncryptionInitialized(): Promise<boolean> {
    return this.invoke('is_encryption_initialized');
  }

  async encryptValue(value: string): Promise<EncryptedData> {
    return this.invoke('encrypt_value', { value });
  }

  async decryptValue(encryptedData: EncryptedData): Promise<string> {
    return this.invoke('decrypt_value', { encryptedData });
  }

  async encryptUserPreferences(preferences: any): Promise<string> {
    return this.invoke('encrypt_user_preferences', { preferences });
  }

  async decryptUserPreferences(encryptedPreferences: string): Promise<any> {
    return this.invoke('decrypt_user_preferences', { encryptedPreferences });
  }

  async encryptMap(data: Record<string, string>): Promise<EncryptedData> {
    return this.invoke('encrypt_map', { data });
  }

  async decryptMap(encryptedData: EncryptedData): Promise<Record<string, string>> {
    return this.invoke('decrypt_map', { encryptedData });
  }

  async changeEncryptionPassword(oldPassword: string, newPassword: string): Promise<boolean> {
    return this.invoke('change_encryption_password', { oldPassword, newPassword });
  }

  async validateEncryptionPassword(password: string): Promise<boolean> {
    return this.invoke('validate_encryption_password', { password });
  }

  async exportEncryptionConfig(): Promise<EncryptionConfig> {
    return this.invoke('export_encryption_config');
  }

  async testEncryption(testData: string): Promise<boolean> {
    return this.invoke('test_encryption', { testData });
  }

  async getEncryptionStats(): Promise<EncryptionStats> {
    return this.invoke('get_encryption_stats');
  }
}

// React hook for encryption
export interface UseEncryptionReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: (password: string) => Promise<void>;
  encrypt: (value: string) => Promise<EncryptedData>;
  decrypt: (data: EncryptedData) => Promise<string>;
  encryptPreferences: (preferences: any) => Promise<string>;
  decryptPreferences: (encrypted: string) => Promise<any>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  testEncryption: (data: string) => Promise<boolean>;
  getStats: () => Promise<EncryptionStats>;
}

// Utility types for encryption-aware components
export interface EncryptionRequiredProps {
  requiresEncryption?: boolean;
  onEncryptionError?: (error: string) => void;
}

export interface SecureFieldProps extends EncryptionRequiredProps {
  value: string | EncryptedData;
  encrypted?: boolean;
  onValueChange: (value: string | EncryptedData) => void;
}

// Constants for encryption
export const ENCRYPTION_ALGORITHMS = {
  AES_256_GCM: 'AES-256-GCM',
} as const;

export const KEY_DERIVATION_METHODS = {
  ARGON2: 'Argon2',
} as const;

export const ENCRYPTION_VERSIONS = {
  V1_0: '1.0',
} as const;

// Type guards for encryption
export function isEncryptedData(value: any): value is EncryptedData {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.data === 'string' &&
    typeof value.nonce === 'string' &&
    typeof value.algorithm === 'string' &&
    typeof value.version === 'string'
  );
}

export function isEncryptionError(error: any): error is { message: string } {
  return typeof error === 'object' && error !== null && typeof error.message === 'string';
}

// Helper functions for sensitive data handling
export function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = [
    'password',
    'password_hash',
    'email',
    'api_key',
    'secret',
    'token',
    'preferences',
    'notes',
    'feedback',
    'answers',
  ];
  
  return sensitiveFields.some(field => 
    fieldName.toLowerCase().includes(field.toLowerCase())
  );
}

export function shouldEncryptValue(fieldName: string, value: any): boolean {
  return isSensitiveField(fieldName) && typeof value === 'string' && value.length > 0;
}

// Encryption status for UI components
export enum EncryptionStatus {
  Uninitialized = 'uninitialized',
  Initializing = 'initializing',
  Ready = 'ready',
  Error = 'error',
}

export interface EncryptionState {
  status: EncryptionStatus;
  error?: string;
  stats?: EncryptionStats;
}