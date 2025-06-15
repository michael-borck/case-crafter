import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ConfigurationImportResult } from '../types/configuration';

export interface UseConfigurationImportExportReturn {
  isExporting: boolean;
  isImporting: boolean;
  error: string | null;
  exportTemplates: (templateIds: string[], includeMetadata?: boolean) => Promise<string | null>;
  importTemplates: (overwriteExisting?: boolean) => Promise<ConfigurationImportResult | null>;
  clearError: () => void;
}

export function useConfigurationImportExport(): UseConfigurationImportExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const exportTemplates = async (templateIds: string[], includeMetadata = true): Promise<string | null> => {
    if (templateIds.length === 0) {
      setError('No templates selected for export');
      return null;
    }

    setIsExporting(true);
    setError(null);

    try {
      const filePath = await invoke<string>('export_configuration_templates', {
        templateIds,
        includeMetadata,
      });
      return filePath;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Export failed: ${errorMessage}`);
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const importTemplates = async (overwriteExisting = false): Promise<ConfigurationImportResult | null> => {
    setIsImporting(true);
    setError(null);

    try {
      const result = await invoke<ConfigurationImportResult>('import_configuration_templates', {
        overwriteExisting,
      });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Import failed: ${errorMessage}`);
      return null;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isExporting,
    isImporting,
    error,
    exportTemplates,
    importTemplates,
    clearError,
  };
}