import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { ProviderType } from '../../types/aiConfig';
import { invoke } from '@tauri-apps/api/core';

interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  supports_streaming: boolean;
  supports_functions: boolean;
}

interface ProviderModelSelectorProps {
  provider: ProviderType;
  selectedModel: string;
  enabled: boolean;
  onModelChange: (model: string) => void;
}

export const ProviderModelSelector: React.FC<ProviderModelSelectorProps> = ({
  provider,
  selectedModel,
  enabled,
  onModelChange,
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadModels = async () => {
    if (!enabled) {
      setModels([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to get available models from the provider
      const availableModels = await invoke<ModelInfo[]>('get_available_models');
      setModels(availableModels);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load models';
      setError(errorMessage);
      
      // Fallback to predefined models based on provider
      const fallbackModels = getFallbackModels(provider);
      setModels(fallbackModels);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackModels = (providerType: ProviderType): ModelInfo[] => {
    switch (providerType) {
      case 'openai':
        return [
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', supports_streaming: true, supports_functions: true },
          { id: 'gpt-4', name: 'GPT-4', supports_streaming: true, supports_functions: true },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', supports_streaming: true, supports_functions: true },
        ];
      case 'anthropic':
        return [
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', supports_streaming: true, supports_functions: false },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', supports_streaming: true, supports_functions: false },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', supports_streaming: true, supports_functions: false },
        ];
      case 'ollama':
        return [
          { id: 'llama2', name: 'Llama 2', supports_streaming: true, supports_functions: false },
          { id: 'mistral', name: 'Mistral 7B', supports_streaming: true, supports_functions: false },
          { id: 'codellama', name: 'Code Llama', supports_streaming: true, supports_functions: false },
        ];
      default:
        return [];
    }
  };

  // Load models when provider or enabled status changes
  useEffect(() => {
    loadModels();
  }, [provider, enabled]);

  const handleRefresh = () => {
    loadModels();
  };

  const getProviderDisplayName = (providerType: ProviderType) => {
    switch (providerType) {
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Anthropic';
      case 'ollama':
        return 'Ollama';
      default:
        return providerType;
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <FormControl fullWidth disabled={!enabled}>
          <InputLabel>Default Model for {getProviderDisplayName(provider)}</InputLabel>
          <Select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            label={`Default Model for ${getProviderDisplayName(provider)}`}
          >
            {models.map((model) => (
              <MenuItem key={model.id} value={model.id}>
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  <Box flexGrow={1}>
                    <Box>{model.name}</Box>
                    {model.description && (
                      <Box fontSize="0.75rem" color="text.secondary">
                        {model.description}
                      </Box>
                    )}
                  </Box>
                  <Box display="flex" gap={0.5}>
                    {model.supports_streaming && (
                      <Chip label="Stream" size="small" variant="outlined" />
                    )}
                    {model.supports_functions && (
                      <Chip label="Functions" size="small" variant="outlined" />
                    )}
                  </Box>
                </Box>
              </MenuItem>
            ))}
            {models.length === 0 && !isLoading && (
              <MenuItem disabled>
                <Box display="flex" alignItems="center" gap={1}>
                  <WarningIcon fontSize="small" />
                  No models available
                </Box>
              </MenuItem>
            )}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          size="small"
          startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={!enabled || isLoading}
          sx={{ minWidth: 'auto', px: 2 }}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          <Box>
            <strong>Could not fetch live models:</strong> {error}
          </Box>
          <Box mt={1} fontSize="0.875rem">
            Showing fallback models for {getProviderDisplayName(provider)}. 
            Check your provider settings and try refreshing.
          </Box>
        </Alert>
      )}

      {lastRefresh && !error && (
        <Box fontSize="0.75rem" color="text.secondary" mt={1}>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </Box>
      )}

      {!enabled && (
        <Alert severity="info" sx={{ mt: 1 }}>
          Enable this provider to load available models
        </Alert>
      )}
    </Box>
  );
};