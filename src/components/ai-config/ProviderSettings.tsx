import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Divider,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  OpenInNew as OpenAIIcon,
  Psychology as AnthropicIcon,
  Computer as OllamaIcon,
  Visibility,
  VisibilityOff,
  Science as TestIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { AIConfig, ProviderType, ProviderConfig } from '../../types/aiConfig';
import { useAIConfig } from '../../hooks/useAIConfig';
import { ProviderModelSelector } from './ProviderModelSelector';

interface ProviderSettingsProps {
  config: AIConfig | null;
  onConfigUpdate: () => void;
}

export const ProviderSettings: React.FC<ProviderSettingsProps> = ({ 
  config, 
  onConfigUpdate 
}) => {
  const { updateConfig, switchProvider, testProvider } = useAIConfig();
  const [editedConfig, setEditedConfig] = useState<AIConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<ProviderType, boolean>>({
    openai: false,
    anthropic: false,
    ollama: false,
  });
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [isTestingProvider, setIsTestingProvider] = useState<ProviderType | null>(null);

  useEffect(() => {
    if (config) {
      setEditedConfig({ ...config });
    }
  }, [config]);

  const handleProviderConfigChange = (
    provider: ProviderType,
    field: keyof ProviderConfig,
    value: any
  ) => {
    if (!editedConfig) return;

    setEditedConfig({
      ...editedConfig,
      providers: {
        ...editedConfig.providers,
        [provider]: {
          ...editedConfig.providers[provider],
          [field]: value,
        },
      },
    });
  };

  const handleDefaultProviderChange = (provider: ProviderType) => {
    if (!editedConfig) return;

    setEditedConfig({
      ...editedConfig,
      default_provider: provider,
    });

    // Also switch the active provider
    switchProvider(provider);
  };

  const handleSaveConfig = async () => {
    if (!editedConfig) return;

    const success = await updateConfig(editedConfig);
    if (success) {
      onConfigUpdate();
    }
  };

  const validateProviderConfig = (provider: ProviderType, providerConfig: ProviderConfig): string | null => {
    if (provider !== 'ollama' && !providerConfig.api_key?.trim()) {
      return `API key is required for ${getProviderDisplayName(provider)}`;
    }
    
    if (!providerConfig.default_model?.trim()) {
      return 'Default model is required';
    }
    
    if (providerConfig.api_base_url && !providerConfig.api_base_url.startsWith('http')) {
      return 'Base URL must start with http:// or https://';
    }
    
    return null;
  };

  const handleTestProvider = async (provider: ProviderType) => {
    if (!editedConfig) return;
    
    // Get the current form values for this provider
    const currentProviderConfig = editedConfig.providers[provider];
    
    // Validate the configuration first
    const validationError = validateProviderConfig(provider, currentProviderConfig);
    if (validationError) {
      setTestResults({
        error: `Configuration Error: ${validationError}`,
      });
      setTestDialogOpen(true);
      return;
    }
    
    setIsTestingProvider(provider);
    try {
      // Create a temporary config with current form values
      const tempConfig = {
        ...editedConfig,
        default_provider: provider, // Set as default for testing
        providers: {
          ...editedConfig.providers,
          [provider]: {
            ...currentProviderConfig,
            enabled: true, // Ensure it's enabled for testing
          },
        },
      };

      // Update the configuration temporarily for testing
      await updateConfig(tempConfig);
      
      // Small delay to ensure config is applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now test the provider with the updated config
      const results = await testProvider(provider);
      if (results) {
        setTestResults({
          ...results,
          tested_config: {
            provider,
            api_key_provided: !!currentProviderConfig.api_key,
            base_url: currentProviderConfig.api_base_url || 'default',
            model: currentProviderConfig.default_model,
          },
        });
      } else {
        setTestResults({
          error: 'Test failed - no results returned',
        });
      }
      setTestDialogOpen(true);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({
        error: error instanceof Error ? error.message : 'Test failed',
        tested_config: {
          provider,
          api_key_provided: !!currentProviderConfig.api_key,
          base_url: currentProviderConfig.api_base_url || 'default',
          model: currentProviderConfig.default_model,
        },
      });
      setTestDialogOpen(true);
    } finally {
      setIsTestingProvider(null);
    }
  };

  const toggleApiKeyVisibility = (provider: ProviderType) => {
    setShowApiKey(prev => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  const getProviderIcon = (provider: ProviderType) => {
    switch (provider) {
      case 'openai':
        return <OpenAIIcon />;
      case 'anthropic':
        return <AnthropicIcon />;
      case 'ollama':
        return <OllamaIcon />;
      default:
        return <OpenAIIcon />;
    }
  };

  const getProviderDisplayName = (provider: ProviderType) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Anthropic';
      case 'ollama':
        return 'Ollama (Local)';
      default:
        return provider;
    }
  };

  if (!editedConfig) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading configuration...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Global Settings */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Global Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Request Timeout (seconds)"
              type="number"
              value={editedConfig.timeout_seconds}
              onChange={(e) =>
                setEditedConfig({
                  ...editedConfig,
                  timeout_seconds: parseInt(e.target.value) || 30,
                })
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={editedConfig.enable_logging}
                  onChange={(e) =>
                    setEditedConfig({
                      ...editedConfig,
                      enable_logging: e.target.checked,
                    })
                  }
                />
              }
              label="Enable Logging"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={editedConfig.cost_tracking_enabled}
                  onChange={(e) =>
                    setEditedConfig({
                      ...editedConfig,
                      cost_tracking_enabled: e.target.checked,
                    })
                  }
                />
              }
              label="Enable Cost Tracking"
            />
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Provider Configurations */}
      <Typography variant="h5" gutterBottom>
        AI Provider Settings
      </Typography>

      <Grid container spacing={3}>
        {Object.entries(editedConfig.providers).map(([providerKey, providerConfig]) => {
          const provider = providerKey as ProviderType;
          const isDefault = editedConfig.default_provider === provider;

          return (
            <Grid item xs={12} key={provider}>
              <Card 
                variant={isDefault ? "elevation" : "outlined"}
                sx={{ 
                  border: isDefault ? 2 : 1,
                  borderColor: isDefault ? 'primary.main' : 'grey.300',
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      {getProviderIcon(provider)}
                      <Typography variant="h6">
                        {getProviderDisplayName(provider)}
                      </Typography>
                      {isDefault && (
                        <Chip 
                          label="Default" 
                          color="primary" 
                          size="small" 
                        />
                      )}
                    </Box>
                    <Box display="flex" gap={1} alignItems="center">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TestIcon />}
                        onClick={() => handleTestProvider(provider)}
                        disabled={!providerConfig.enabled || isTestingProvider === provider}
                        color="primary"
                      >
                        {isTestingProvider === provider ? 'Testing...' : 'Test Provider'}
                      </Button>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={providerConfig.enabled}
                            onChange={(e) =>
                              handleProviderConfigChange(provider, 'enabled', e.target.checked)
                            }
                          />
                        }
                        label="Enabled"
                      />
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    {provider !== 'ollama' && (
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="API Key"
                          type={showApiKey[provider] ? 'text' : 'password'}
                          value={providerConfig.api_key || ''}
                          onChange={(e) =>
                            handleProviderConfigChange(provider, 'api_key', e.target.value)
                          }
                          InputProps={{
                            endAdornment: (
                              <IconButton
                                onClick={() => toggleApiKeyVisibility(provider)}
                                edge="end"
                              >
                                {showApiKey[provider] ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            ),
                          }}
                          placeholder="Enter API key..."
                        />
                      </Grid>
                    )}

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Base URL"
                        value={providerConfig.api_base_url || ''}
                        onChange={(e) =>
                          handleProviderConfigChange(provider, 'api_base_url', e.target.value)
                        }
                        placeholder={
                          provider === 'ollama' 
                            ? 'http://localhost:11434' 
                            : 'Default API endpoint'
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <ProviderModelSelector
                        provider={provider}
                        selectedModel={providerConfig.default_model}
                        enabled={providerConfig.enabled}
                        onModelChange={(model) =>
                          handleProviderConfigChange(provider, 'default_model', model)
                        }
                      />
                    </Grid>

                    {provider !== 'ollama' && (
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Rate Limit (requests/min)"
                          type="number"
                          value={providerConfig.rate_limit_per_minute || ''}
                          onChange={(e) =>
                            handleProviderConfigChange(
                              provider, 
                              'rate_limit_per_minute', 
                              parseInt(e.target.value) || undefined
                            )
                          }
                          placeholder="No limit"
                        />
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <Button
                        variant={isDefault ? "contained" : "outlined"}
                        onClick={() => handleDefaultProviderChange(provider)}
                        disabled={isDefault || !providerConfig.enabled}
                      >
                        {isDefault ? 'Default Provider' : 'Set as Default'}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Save Button */}
      <Box display="flex" justifyContent="flex-end" mt={4}>
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSaveConfig}
        >
          Save Configuration
        </Button>
      </Box>

      {/* Test Results Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Provider Test Results
          {testResults.tested_config && (
            <Typography variant="subtitle2" color="text.secondary">
              Testing {getProviderDisplayName(testResults.tested_config.provider)} with current form values
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {/* Show tested configuration */}
          {testResults.tested_config && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Configuration Tested:
              </Typography>
              <Typography variant="body2">
                • Provider: {getProviderDisplayName(testResults.tested_config.provider)}<br/>
                • API Key: {testResults.tested_config.api_key_provided ? '✓ Provided' : '✗ Missing'}<br/>
                • Base URL: {testResults.tested_config.base_url}<br/>
                • Model: {testResults.tested_config.model}
              </Typography>
            </Alert>
          )}

          {testResults.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {testResults.error}
            </Alert>
          ) : (
            <Box>
              {Object.entries(testResults)
                .filter(([key]) => key !== 'tested_config')
                .map(([testName, result]: [string, any]) => (
                <Alert
                  key={testName}
                  severity={result.success ? 'success' : 'error'}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2">
                    {testName.replace('_', ' ').toUpperCase()}
                  </Typography>
                  {result.success ? (
                    <Typography variant="body2">
                      {result.model && `Model: ${result.model}`}
                      {result.response_time_ms && ` | Response time: ${result.response_time_ms}ms`}
                      {result.model_count && ` | Models available: ${result.model_count}`}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="error">
                      {result.error}
                    </Typography>
                  )}
                </Alert>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};