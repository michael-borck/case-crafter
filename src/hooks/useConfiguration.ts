// React hook for configuration management operations

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  ConfigurationSchema,
  StoredConfigurationSchema,
  NewConfiguration,
  UpdateConfiguration,
  ConfigurationFilter,
  ConfigurationStatistics,
  ValidationResults,
  DuplicateConfigurationRequest,
  ConfigurationStatus,
} from '../types/configuration';

export interface UseConfigurationOptions {
  autoFetch?: boolean;
  defaultFilter?: ConfigurationFilter;
}

export interface UseConfigurationReturn {
  // State
  configurations: StoredConfigurationSchema[];
  currentConfiguration: StoredConfigurationSchema | null;
  loading: boolean;
  error: string | null;
  statistics: ConfigurationStatistics | null;

  // Operations
  fetchConfigurations: (filter?: ConfigurationFilter, limit?: number, offset?: number) => Promise<void>;
  fetchConfiguration: (id: string) => Promise<StoredConfigurationSchema | null>;
  fetchConfigurationSchema: (id: string) => Promise<ConfigurationSchema | null>;
  createConfiguration: (config: NewConfiguration) => Promise<StoredConfigurationSchema>;
  updateConfiguration: (id: string, update: UpdateConfiguration) => Promise<StoredConfigurationSchema | null>;
  deleteConfiguration: (id: string) => Promise<boolean>;
  duplicateFromTemplate: (request: DuplicateConfigurationRequest) => Promise<StoredConfigurationSchema>;
  updateStatus: (id: string, status: ConfigurationStatus) => Promise<StoredConfigurationSchema | null>;
  
  // Search and filters
  searchConfigurations: (query: string, limit?: number, offset?: number) => Promise<void>;
  getByCategory: (category: string, limit?: number, offset?: number) => Promise<void>;
  getByFramework: (framework: string, limit?: number, offset?: number) => Promise<void>;
  getTemplates: (limit?: number, offset?: number) => Promise<void>;
  getRecent: (limit?: number) => Promise<void>;
  
  // Statistics and metadata
  fetchStatistics: () => Promise<void>;
  countConfigurations: (filter?: ConfigurationFilter) => Promise<number>;
  configurationExists: (id: string) => Promise<boolean>;
  
  // Validation
  validateSchema: (schema: ConfigurationSchema) => Promise<ValidationResults>;
  validateFormData: (configId: string, formData: Record<string, any>) => Promise<ValidationResults>;

  // Utility
  clearError: () => void;
  setCurrentConfiguration: (config: StoredConfigurationSchema | null) => void;
}

export const useConfiguration = (options: UseConfigurationOptions = {}): UseConfigurationReturn => {
  const { autoFetch = true, defaultFilter } = options;

  // State
  const [configurations, setConfigurations] = useState<StoredConfigurationSchema[]>([]);
  const [currentConfiguration, setCurrentConfiguration] = useState<StoredConfigurationSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<ConfigurationStatistics | null>(null);

  // Clear error utility
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Generic error handler
  const handleError = useCallback((err: any, operation: string) => {
    const errorMessage = typeof err === 'string' ? err : err?.message || `Failed to ${operation}`;
    setError(errorMessage);
    console.error(`Configuration ${operation} error:`, err);
  }, []);

  // Fetch configurations with filtering
  const fetchConfigurations = useCallback(async (
    filter: ConfigurationFilter = {},
    limit: number = 50,
    offset: number = 0
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema[]>('list_configurations', {
        filter,
        limit,
        offset,
      });
      
      setConfigurations(result);
    } catch (err) {
      handleError(err, 'fetch configurations');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Fetch single configuration
  const fetchConfiguration = useCallback(async (id: string): Promise<StoredConfigurationSchema | null> => {
    try {
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema | null>('get_configuration', { id });
      
      if (result) {
        setCurrentConfiguration(result);
      }
      
      return result;
    } catch (err) {
      handleError(err, 'fetch configuration');
      return null;
    }
  }, [handleError]);

  // Fetch configuration schema
  const fetchConfigurationSchema = useCallback(async (id: string): Promise<ConfigurationSchema | null> => {
    try {
      setError(null);
      
      const result = await invoke<ConfigurationSchema | null>('get_configuration_schema', { id });
      return result;
    } catch (err) {
      handleError(err, 'fetch configuration schema');
      return null;
    }
  }, [handleError]);

  // Create new configuration
  const createConfiguration = useCallback(async (config: NewConfiguration): Promise<StoredConfigurationSchema> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema>('create_configuration', {
        newConfig: config,
      });
      
      // Add to local state
      setConfigurations(prev => [result, ...prev]);
      
      return result;
    } catch (err) {
      handleError(err, 'create configuration');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Update configuration
  const updateConfiguration = useCallback(async (
    id: string,
    update: UpdateConfiguration
  ): Promise<StoredConfigurationSchema | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema | null>('update_configuration', {
        id,
        update,
      });
      
      if (result) {
        // Update local state
        setConfigurations(prev => 
          prev.map(config => config.id === id ? result : config)
        );
        
        // Update current configuration if it's the one being updated
        if (currentConfiguration?.id === id) {
          setCurrentConfiguration(result);
        }
      }
      
      return result;
    } catch (err) {
      handleError(err, 'update configuration');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, currentConfiguration]);

  // Delete configuration
  const deleteConfiguration = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<boolean>('delete_configuration', { id });
      
      if (result) {
        // Remove from local state
        setConfigurations(prev => prev.filter(config => config.id !== id));
        
        // Clear current configuration if it's the one being deleted
        if (currentConfiguration?.id === id) {
          setCurrentConfiguration(null);
        }
      }
      
      return result;
    } catch (err) {
      handleError(err, 'delete configuration');
      return false;
    } finally {
      setLoading(false);
    }
  }, [handleError, currentConfiguration]);

  // Search configurations
  const searchConfigurations = useCallback(async (
    query: string,
    limit: number = 50,
    offset: number = 0
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema[]>('search_configurations', {
        query,
        limit,
        offset,
      });
      
      setConfigurations(result);
    } catch (err) {
      handleError(err, 'search configurations');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Get configurations by category
  const getByCategory = useCallback(async (
    category: string,
    limit: number = 50,
    offset: number = 0
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema[]>('get_configurations_by_category', {
        category,
        limit,
        offset,
      });
      
      setConfigurations(result);
    } catch (err) {
      handleError(err, 'fetch configurations by category');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Get configurations by framework
  const getByFramework = useCallback(async (
    framework: string,
    limit: number = 50,
    offset: number = 0
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema[]>('get_configurations_by_framework', {
        framework,
        limit,
        offset,
      });
      
      setConfigurations(result);
    } catch (err) {
      handleError(err, 'fetch configurations by framework');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Get template configurations
  const getTemplates = useCallback(async (
    limit: number = 50,
    offset: number = 0
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema[]>('get_configuration_templates', {
        limit,
        offset,
      });
      
      setConfigurations(result);
    } catch (err) {
      handleError(err, 'fetch configuration templates');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Get recent configurations
  const getRecent = useCallback(async (limit: number = 10) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema[]>('get_recent_configurations', {
        limit,
      });
      
      setConfigurations(result);
    } catch (err) {
      handleError(err, 'fetch recent configurations');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Duplicate from template
  const duplicateFromTemplate = useCallback(async (
    request: DuplicateConfigurationRequest
  ): Promise<StoredConfigurationSchema> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema>('duplicate_configuration_from_template', {
        request,
      });
      
      // Add to local state
      setConfigurations(prev => [result, ...prev]);
      
      return result;
    } catch (err) {
      handleError(err, 'duplicate configuration from template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Update status
  const updateStatus = useCallback(async (
    id: string,
    status: ConfigurationStatus
  ): Promise<StoredConfigurationSchema | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await invoke<StoredConfigurationSchema | null>('update_configuration_status', {
        id,
        status,
      });
      
      if (result) {
        // Update local state
        setConfigurations(prev => 
          prev.map(config => config.id === id ? result : config)
        );
        
        // Update current configuration if it's the one being updated
        if (currentConfiguration?.id === id) {
          setCurrentConfiguration(result);
        }
      }
      
      return result;
    } catch (err) {
      handleError(err, 'update configuration status');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, currentConfiguration]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      setError(null);
      
      const result = await invoke<ConfigurationStatistics>('get_configuration_statistics');
      setStatistics(result);
    } catch (err) {
      handleError(err, 'fetch configuration statistics');
    }
  }, [handleError]);

  // Count configurations
  const countConfigurations = useCallback(async (filter: ConfigurationFilter = {}): Promise<number> => {
    try {
      setError(null);
      
      const result = await invoke<number>('count_configurations', { filter });
      return result;
    } catch (err) {
      handleError(err, 'count configurations');
      return 0;
    }
  }, [handleError]);

  // Check if configuration exists
  const configurationExists = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const result = await invoke<boolean>('configuration_exists', { id });
      return result;
    } catch (err) {
      handleError(err, 'check configuration existence');
      return false;
    }
  }, [handleError]);

  // Validate schema
  const validateSchema = useCallback(async (schema: ConfigurationSchema): Promise<ValidationResults> => {
    try {
      setError(null);
      
      const result = await invoke<ValidationResults>('validate_configuration_schema', { schema });
      return result;
    } catch (err) {
      handleError(err, 'validate configuration schema');
      return {
        is_valid: false,
        field_errors: {},
        global_errors: [typeof err === 'string' ? err : 'Validation failed'],
        warnings: [],
      };
    }
  }, [handleError]);

  // Validate form data
  const validateFormData = useCallback(async (
    configId: string,
    formData: Record<string, any>
  ): Promise<ValidationResults> => {
    try {
      setError(null);
      
      const result = await invoke<ValidationResults>('validate_form_data', {
        configurationId: configId,
        formData,
      });
      return result;
    } catch (err) {
      handleError(err, 'validate form data');
      return {
        is_valid: false,
        field_errors: {},
        global_errors: [typeof err === 'string' ? err : 'Validation failed'],
        warnings: [],
      };
    }
  }, [handleError]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchConfigurations(defaultFilter);
    }
  }, [autoFetch, defaultFilter, fetchConfigurations]);

  return {
    // State
    configurations,
    currentConfiguration,
    loading,
    error,
    statistics,

    // Operations
    fetchConfigurations,
    fetchConfiguration,
    fetchConfigurationSchema,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    duplicateFromTemplate,
    updateStatus,

    // Search and filters
    searchConfigurations,
    getByCategory,
    getByFramework,
    getTemplates,
    getRecent,

    // Statistics and metadata
    fetchStatistics,
    countConfigurations,
    configurationExists,

    // Validation
    validateSchema,
    validateFormData,

    // Utility
    clearError,
    setCurrentConfiguration,
  };
};