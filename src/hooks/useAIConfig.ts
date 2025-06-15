import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  AIConfig, 
  ModelConfig, 
  ProviderType, 
  ModelSelectionCriteria,
  GenerationParams,
  ParameterConstraints,
  ModelUseCase
} from '../types/aiConfig';

interface UseAIConfigReturn {
  // State
  config: AIConfig | null;
  modelConfigs: ModelConfig[];
  isLoading: boolean;
  error: string | null;
  
  // Configuration management
  loadConfig: () => Promise<void>;
  updateConfig: (config: AIConfig) => Promise<boolean>;
  switchProvider: (provider: ProviderType) => Promise<boolean>;
  
  // Model management
  getAllModelConfigs: () => Promise<void>;
  getModelsByProvider: (provider: ProviderType) => Promise<ModelConfig[]>;
  selectBestModel: (criteria: ModelSelectionCriteria) => Promise<ModelConfig | null>;
  getRecommendedModels: (useCase: ModelUseCase) => Promise<ModelConfig[]>;
  
  // Parameter validation
  validateParameters: (modelId: string, params: GenerationParams) => Promise<boolean>;
  adjustParameters: (modelId: string, params: GenerationParams) => Promise<GenerationParams | null>;
  getParameterConstraints: (modelId: string) => Promise<ParameterConstraints | null>;
  
  // Cost estimation
  estimateCost: (modelId: string, inputTokens: number, outputTokens: number) => Promise<number>;
  
  // Model availability
  updateModelAvailability: (modelId: string, available: boolean) => Promise<boolean>;
  
  // Provider testing
  testProvider: (provider: ProviderType) => Promise<Record<string, any> | null>;
  
  // Utilities
  clearError: () => void;
  createSelectionCriteria: (
    providerPreference?: string,
    maxCost?: number,
    minContextLength?: number,
    requiredCapabilities?: string[],
    performancePriority?: string,
    useCase?: string
  ) => Promise<ModelSelectionCriteria | null>;
}

export const useAIConfig = (): UseAIConfigReturn => {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([]);
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
      console.error('AI Config operation failed:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Configuration management
  const loadConfig = useCallback(async (): Promise<void> => {
    await handleOperation(
      async () => {
        const result = await invoke<AIConfig>('get_ai_config');
        setConfig(result);
      },
      'Failed to load AI configuration'
    );
  }, [handleOperation]);

  const updateConfig = useCallback(async (newConfig: AIConfig): Promise<boolean> => {
    const result = await handleOperation(
      () => invoke<boolean>('update_ai_config', { config: newConfig }),
      'Failed to update AI configuration'
    );
    if (result) {
      setConfig(newConfig);
    }
    return result !== null;
  }, [handleOperation]);

  const switchProvider = useCallback(async (provider: ProviderType): Promise<boolean> => {
    const result = await handleOperation(
      () => invoke<boolean>('switch_ai_provider', { providerType: provider }),
      `Failed to switch to provider: ${provider}`
    );
    if (result) {
      await loadConfig(); // Reload config after switching
    }
    return result !== null;
  }, [handleOperation, loadConfig]);

  // Model management
  const getAllModelConfigs = useCallback(async (): Promise<void> => {
    await handleOperation(
      async () => {
        const result = await invoke<ModelConfig[]>('get_all_model_configs');
        setModelConfigs(result);
      },
      'Failed to load model configurations'
    );
  }, [handleOperation]);

  const getModelsByProvider = useCallback(async (provider: ProviderType): Promise<ModelConfig[]> => {
    const result = await handleOperation(
      () => invoke<ModelConfig[]>('get_models_by_provider', { providerType: provider }),
      `Failed to get models for provider: ${provider}`
    );
    return result || [];
  }, [handleOperation]);

  const selectBestModel = useCallback(async (criteria: ModelSelectionCriteria): Promise<ModelConfig | null> => {
    return await handleOperation(
      () => invoke<ModelConfig>('select_best_model', { criteria }),
      'Failed to select best model'
    );
  }, [handleOperation]);

  const getRecommendedModels = useCallback(async (useCase: ModelUseCase): Promise<ModelConfig[]> => {
    const result = await handleOperation(
      () => invoke<ModelConfig[]>('get_recommended_models', { useCase }),
      `Failed to get recommended models for use case: ${useCase}`
    );
    return result || [];
  }, [handleOperation]);

  // Parameter validation
  const validateParameters = useCallback(async (modelId: string, params: GenerationParams): Promise<boolean> => {
    const result = await handleOperation(
      () => invoke<boolean>('validate_model_parameters', { modelId, params }),
      `Failed to validate parameters for model: ${modelId}`
    );
    return result === true;
  }, [handleOperation]);

  const adjustParameters = useCallback(async (modelId: string, params: GenerationParams): Promise<GenerationParams | null> => {
    return await handleOperation(
      () => invoke<GenerationParams>('adjust_model_parameters', { modelId, params }),
      `Failed to adjust parameters for model: ${modelId}`
    );
  }, [handleOperation]);

  const getParameterConstraints = useCallback(async (modelId: string): Promise<ParameterConstraints | null> => {
    return await handleOperation(
      () => invoke<ParameterConstraints>('get_model_parameter_constraints', { modelId }),
      `Failed to get parameter constraints for model: ${modelId}`
    );
  }, [handleOperation]);

  // Cost estimation
  const estimateCost = useCallback(async (modelId: string, inputTokens: number, outputTokens: number): Promise<number> => {
    const result = await handleOperation(
      () => invoke<number>('estimate_generation_cost', { 
        modelId, 
        inputTokens, 
        estimatedOutputTokens: outputTokens 
      }),
      `Failed to estimate cost for model: ${modelId}`
    );
    return result || 0;
  }, [handleOperation]);

  // Model availability
  const updateModelAvailability = useCallback(async (modelId: string, available: boolean): Promise<boolean> => {
    const result = await handleOperation(
      () => invoke<boolean>('update_model_availability', { modelId, available }),
      `Failed to update availability for model: ${modelId}`
    );
    if (result) {
      await getAllModelConfigs(); // Reload models after updating availability
    }
    return result !== null;
  }, [handleOperation, getAllModelConfigs]);

  // Provider testing
  const testProvider = useCallback(async (provider: ProviderType): Promise<Record<string, any> | null> => {
    return await handleOperation(
      async () => {
        // First switch to the provider temporarily for testing
        await invoke<boolean>('switch_ai_provider', { providerType: provider });
        // Then run the connection test
        const results = await invoke<Record<string, any>>('test_ai_connection');
        return results;
      },
      `Failed to test provider: ${provider}`
    );
  }, [handleOperation]);

  // Utilities
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createSelectionCriteria = useCallback(async (
    providerPreference?: string,
    maxCost?: number,
    minContextLength?: number,
    requiredCapabilities: string[] = [],
    performancePriority: string = 'balanced',
    useCase: string = 'general_chat'
  ): Promise<ModelSelectionCriteria | null> => {
    return await handleOperation(
      () => invoke<ModelSelectionCriteria>('create_model_selection_criteria', {
        providerPreference,
        maxCostPerRequest: maxCost,
        minContextLength,
        requiredCapabilities,
        performancePriority,
        useCase
      }),
      'Failed to create model selection criteria'
    );
  }, [handleOperation]);

  // Load initial data
  useEffect(() => {
    loadConfig();
    getAllModelConfigs();
  }, [loadConfig, getAllModelConfigs]);

  return {
    // State
    config,
    modelConfigs,
    isLoading,
    error,
    
    // Configuration management
    loadConfig,
    updateConfig,
    switchProvider,
    
    // Model management
    getAllModelConfigs,
    getModelsByProvider,
    selectBestModel,
    getRecommendedModels,
    
    // Parameter validation
    validateParameters,
    adjustParameters,
    getParameterConstraints,
    
    // Cost estimation
    estimateCost,
    
    // Model availability
    updateModelAvailability,
    
    // Provider testing
    testProvider,
    
    // Utilities
    clearError,
    createSelectionCriteria,
  };
};