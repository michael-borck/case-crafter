import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  TextField,
  Button,
  Alert,
  Paper,
  Tooltip,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import {
  Tune as TuneIcon,
  Restore as RestoreIcon,
  Save as SaveIcon,
  PlayArrow as TestIcon,
  Info as InfoIcon,
  AutoFixHigh as AutoIcon,
} from '@mui/icons-material';
import { 
  AIConfig, 
  ModelConfig, 
  GenerationParams,
  ParameterConstraints,
} from '../../types/aiConfig';
import { useAIConfig } from '../../hooks/useAIConfig';

interface ParameterTunerProps {
  config: AIConfig | null;
  modelConfigs: ModelConfig[];
}

export const ParameterTuner: React.FC<ParameterTunerProps> = ({ 
  config, 
  modelConfigs 
}) => {
  const { 
    validateParameters, 
    adjustParameters, 
    getParameterConstraints,
    updateConfig,
  } = useAIConfig();

  const [selectedModel, setSelectedModel] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<ModelConfig | null>(null);
  const [parameters, setParameters] = useState<GenerationParams>({
    temperature: 0.7,
    max_tokens: 2048,
    top_p: 0.9,
    top_k: 40,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    stop_sequences: [],
  });
  const [constraints, setConstraints] = useState<ParameterConstraints | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);
  const [testOutput, setTestOutput] = useState<string>('');

  useEffect(() => {
    if (config && modelConfigs.length > 0) {
      // Set default model from config
      const defaultProvider = config.default_provider;
      const providerConfig = config.providers[defaultProvider];
      if (providerConfig) {
        setSelectedModel(providerConfig.default_model);
      }
      
      // Load global generation params
      setParameters(config.generation_params);
    }
  }, [config, modelConfigs]);

  useEffect(() => {
    const loadModelData = async () => {
      if (selectedModel) {
        // Find model config
        const model = modelConfigs.find(m => m.id === selectedModel);
        setCurrentModel(model || null);

        // Load parameter constraints
        const modelConstraints = await getParameterConstraints(selectedModel);
        setConstraints(modelConstraints);

        // Set default parameters from model
        if (model) {
          setParameters(model.default_params);
        }
      }
    };

    loadModelData();
  }, [selectedModel, modelConfigs, getParameterConstraints]);

  const handleParameterChange = (param: keyof GenerationParams, value: any) => {
    setParameters(prev => ({
      ...prev,
      [param]: value,
    }));
    
    // Clear validation result when parameters change
    setValidationResult(null);
  };

  const handleValidateParameters = async () => {
    if (!selectedModel) return;

    const isValid = await validateParameters(selectedModel, parameters);
    setValidationResult({
      isValid,
      message: isValid ? 'Parameters are valid!' : 'Some parameters are outside allowed ranges',
    });
  };

  const handleAutoAdjustParameters = async () => {
    if (!selectedModel) return;

    const adjustedParams = await adjustParameters(selectedModel, parameters);
    if (adjustedParams) {
      setParameters(adjustedParams);
      setValidationResult({
        isValid: true,
        message: 'Parameters have been auto-adjusted to fit model constraints',
      });
    }
  };

  const handleResetToDefaults = () => {
    if (currentModel) {
      setParameters(currentModel.default_params);
      setValidationResult(null);
    }
  };

  const handleSaveAsGlobalDefaults = async () => {
    if (!config) return;

    const updatedConfig = {
      ...config,
      generation_params: parameters,
    };

    const success = await updateConfig(updatedConfig);
    if (success) {
      setValidationResult({
        isValid: true,
        message: 'Parameters saved as global defaults',
      });
    }
  };

  const handleTestParameters = async () => {
    // This would typically call the AI API with test parameters
    setTestOutput('Test generation would appear here...');
  };

  const renderParameterSlider = (
    label: string,
    param: keyof GenerationParams,
    constraint?: { min: number; max: number; step?: number },
    helperText?: string
  ) => {
    const value = parameters[param] as number;
    const min = constraint?.min ?? 0;
    const max = constraint?.max ?? 2;
    const step = constraint?.step ?? 0.1;

    return (
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="subtitle2">{label}</Typography>
            {helperText && (
              <Tooltip title={helperText}>
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          
          <Box sx={{ px: 2 }}>
            <Slider
              value={value || 0}
              onChange={(_, newValue) => handleParameterChange(param, newValue)}
              min={min}
              max={max}
              step={step}
              valueLabelDisplay="auto"
              sx={{ mb: 2 }}
            />
          </Box>
          
          <TextField
            fullWidth
            size="small"
            type="number"
            value={value || ''}
            onChange={(e) => handleParameterChange(param, parseFloat(e.target.value))}
            inputProps={{ min, max, step }}
          />
          
          {constraint && (
            <Typography variant="caption" color="text.secondary">
              Range: {min} - {max}
            </Typography>
          )}
        </Card>
      </Grid>
    );
  };

  return (
    <Box>
      {/* Model Selection */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Model Selection
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <FormControl fullWidth>
              <InputLabel>Model</InputLabel>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                label="Model"
              >
                {modelConfigs.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography>{model.name}</Typography>
                      <Chip 
                        label={model.provider} 
                        size="small" 
                        variant="outlined" 
                      />
                      {model.is_recommended && (
                        <Chip 
                          label="Recommended" 
                          size="small" 
                          color="primary" 
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<AutoIcon />}
                onClick={handleAutoAdjustParameters}
                disabled={!selectedModel}
              >
                Auto-Adjust
              </Button>
              <Button
                variant="outlined"
                startIcon={<RestoreIcon />}
                onClick={handleResetToDefaults}
                disabled={!currentModel}
              >
                Reset
              </Button>
            </Box>
          </Grid>
        </Grid>

        {currentModel && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              {currentModel.name}
            </Typography>
            <Typography variant="body2">
              {currentModel.description}
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Parameter Controls */}
      <Typography variant="h6" gutterBottom>
        Generation Parameters
      </Typography>

      <Grid container spacing={3}>
        {renderParameterSlider(
          'Temperature',
          'temperature',
          constraints?.temperature,
          'Controls randomness. Lower values make output more focused and deterministic.'
        )}

        {renderParameterSlider(
          'Top-p (Nucleus Sampling)',
          'top_p',
          constraints?.top_p,
          'Controls diversity via nucleus sampling. 0.9 means consider tokens with 90% probability mass.'
        )}

        {constraints?.top_k && renderParameterSlider(
          'Top-k',
          'top_k',
          constraints.top_k,
          'Consider only the top k most likely tokens at each step.'
        )}

        {renderParameterSlider(
          'Frequency Penalty',
          'frequency_penalty',
          constraints?.frequency_penalty,
          'Reduces likelihood of repeating tokens based on frequency in the text.'
        )}

        {renderParameterSlider(
          'Presence Penalty',
          'presence_penalty',
          constraints?.presence_penalty,
          'Reduces likelihood of repeating any token that has appeared in the text.'
        )}

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Max Tokens
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={parameters.max_tokens || ''}
              onChange={(e) => handleParameterChange('max_tokens', parseInt(e.target.value))}
              inputProps={{ 
                min: constraints?.max_tokens?.min || 1,
                max: constraints?.max_tokens?.max || 4096
              }}
            />
            {constraints?.max_tokens && (
              <Typography variant="caption" color="text.secondary">
                Range: {constraints.max_tokens.min} - {constraints.max_tokens.max}
              </Typography>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Stop Sequences
            </Typography>
            <TextField
              fullWidth
              placeholder="Enter stop sequences separated by commas"
              value={(parameters.stop_sequences || []).join(', ')}
              onChange={(e) => handleParameterChange(
                'stop_sequences', 
                e.target.value.split(',').map(s => s.trim()).filter(s => s)
              )}
              helperText="Sequences where the model should stop generating"
            />
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Actions */}
      <Box display="flex" gap={2} mb={3}>
        <Button
          variant="outlined"
          startIcon={<TuneIcon />}
          onClick={handleValidateParameters}
          disabled={!selectedModel}
        >
          Validate Parameters
        </Button>
        <Button
          variant="outlined"
          startIcon={<TestIcon />}
          onClick={handleTestParameters}
          disabled={!selectedModel}
        >
          Test Generation
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveAsGlobalDefaults}
          disabled={!selectedModel}
        >
          Save as Defaults
        </Button>
      </Box>

      {/* Validation Result */}
      {validationResult && (
        <Alert 
          severity={validationResult.isValid ? 'success' : 'warning'} 
          sx={{ mb: 3 }}
        >
          {validationResult.message}
        </Alert>
      )}

      {/* Test Output */}
      {testOutput && (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Test Output
          </Typography>
          <Typography 
            variant="body2" 
            component="pre" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              backgroundColor: 'grey.50',
              p: 2,
              borderRadius: 1,
            }}
          >
            {testOutput}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};