import { useState, useCallback } from 'react';
import { 
  AppDataManager, 
  UserFileManager, 
  DialogManager,
  SaveOptions,
  OpenOptions 
} from '../utils/fileSystem';

interface UseFileSystemReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // App data operations
  readAppFile: (path: string) => Promise<string | null>;
  writeAppFile: (path: string, content: string) => Promise<boolean>;
  deleteAppFile: (path: string) => Promise<boolean>;
  listAppFiles: (path?: string) => Promise<any[] | null>;
  
  // User file operations
  openFiles: (options?: OpenOptions) => Promise<string[] | null>;
  saveFile: (content: string, options?: SaveOptions) => Promise<string | null>;
  importCaseStudy: () => Promise<{ content: string; fileName: string } | null>;
  exportCaseStudy: (
    content: string, 
    format: 'pdf' | 'docx' | 'html' | 'txt' | 'json',
    defaultName?: string
  ) => Promise<string | null>;
  
  // Dialogs
  showInfo: (title: string, message: string) => Promise<void>;
  showError: (title: string, message: string) => Promise<void>;
  showWarning: (title: string, message: string) => Promise<void>;
  askConfirmation: (title: string, message: string) => Promise<boolean>;
  confirmAction: (title: string, message: string) => Promise<boolean>;
  
  // Utilities
  clearError: () => void;
}

/**
 * Custom hook for file system operations
 * Provides React-friendly interface to file system utilities
 */
export const useFileSystem = (): UseFileSystemReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed'
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : errorMessage;
      setError(message);
      console.error('File system operation failed:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // App data operations
  const readAppFile = useCallback(async (path: string): Promise<string | null> => {
    return handleOperation(
      () => AppDataManager.readFile(path),
      `Failed to read file: ${path}`
    );
  }, [handleOperation]);

  const writeAppFile = useCallback(async (path: string, content: string): Promise<boolean> => {
    const result = await handleOperation(
      () => AppDataManager.writeFile(path, content),
      `Failed to write file: ${path}`
    );
    return result !== null;
  }, [handleOperation]);

  const deleteAppFile = useCallback(async (path: string): Promise<boolean> => {
    const result = await handleOperation(
      () => AppDataManager.deleteFile(path),
      `Failed to delete file: ${path}`
    );
    return result !== null;
  }, [handleOperation]);

  const listAppFiles = useCallback(async (path?: string) => {
    return handleOperation(
      () => AppDataManager.listFiles(path),
      `Failed to list files in: ${path || 'root'}`
    );
  }, [handleOperation]);

  // User file operations
  const openFiles = useCallback(async (options?: OpenOptions): Promise<string[] | null> => {
    return handleOperation(
      () => UserFileManager.openFiles(options || {}),
      'Failed to open file dialog'
    );
  }, [handleOperation]);

  const saveFile = useCallback(async (content: string, options?: SaveOptions): Promise<string | null> => {
    return handleOperation(
      () => UserFileManager.saveFile(content, options || {}),
      'Failed to save file'
    );
  }, [handleOperation]);

  const importCaseStudy = useCallback(async () => {
    return handleOperation(
      () => UserFileManager.importCaseStudy(),
      'Failed to import case study'
    );
  }, [handleOperation]);

  const exportCaseStudy = useCallback(async (
    content: string, 
    format: 'pdf' | 'docx' | 'html' | 'txt' | 'json',
    defaultName?: string
  ): Promise<string | null> => {
    return handleOperation(
      () => UserFileManager.exportCaseStudy(content, format, defaultName),
      `Failed to export case study as ${format.toUpperCase()}`
    );
  }, [handleOperation]);

  // Dialog operations
  const showInfo = useCallback(async (title: string, message: string): Promise<void> => {
    await handleOperation(
      () => DialogManager.showInfo(title, message),
      'Failed to show info dialog'
    );
  }, [handleOperation]);

  const showError = useCallback(async (title: string, message: string): Promise<void> => {
    await handleOperation(
      () => DialogManager.showError(title, message),
      'Failed to show error dialog'
    );
  }, [handleOperation]);

  const showWarning = useCallback(async (title: string, message: string): Promise<void> => {
    await handleOperation(
      () => DialogManager.showWarning(title, message),
      'Failed to show warning dialog'
    );
  }, [handleOperation]);

  const askConfirmation = useCallback(async (title: string, message: string): Promise<boolean> => {
    const result = await handleOperation(
      () => DialogManager.askConfirmation(title, message),
      'Failed to show confirmation dialog'
    );
    return result === true;
  }, [handleOperation]);

  const confirmAction = useCallback(async (title: string, message: string): Promise<boolean> => {
    const result = await handleOperation(
      () => DialogManager.confirmAction(title, message),
      'Failed to show action confirmation dialog'
    );
    return result === true;
  }, [handleOperation]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    
    // App data operations
    readAppFile,
    writeAppFile,
    deleteAppFile,
    listAppFiles,
    
    // User file operations
    openFiles,
    saveFile,
    importCaseStudy,
    exportCaseStudy,
    
    // Dialogs
    showInfo,
    showError,
    showWarning,
    askConfirmation,
    confirmAction,
    
    // Utilities
    clearError,
  };
};