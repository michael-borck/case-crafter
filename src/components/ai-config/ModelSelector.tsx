import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Paper,
  Switch,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Recommend as RecommendIcon,
  Speed as SpeedIcon,
  Star as QualityIcon,
  MonetizationOn as CostIcon,
  Balance as BalanceIcon,
  Psychology as ModelIcon,
  Visibility as VisibilityIcon,
  Functions as FunctionIcon,
  Stream as StreamIcon,
} from '@mui/icons-material';
import { 
  AIConfig, 
  ModelConfig, 
  ProviderType, 
  ModelUseCase,
  ModelPerformancePriority,
} from '../../types/aiConfig';
import { useAIConfig } from '../../hooks/useAIConfig';

interface ModelSelectorProps {
  config: AIConfig | null;
  modelConfigs: ModelConfig[];
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  config 
}) => {
  const { 
    getModelsByProvider, 
    selectBestModel, 
    getRecommendedModels,
    updateModelAvailability,
    estimateCost,
    createSelectionCriteria
  } = useAIConfig();

  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('openai');
  const [filteredModels, setFilteredModels] = useState<ModelConfig[]>([]);
  const [recommendedModel, setRecommendedModel] = useState<ModelConfig | null>(null);
  const [costEstimates, setCostEstimates] = useState<Record<string, number>>({});
  
  // Selection criteria state
  const [useCase, setUseCase] = useState<ModelUseCase>('case_study_generation');
  const [performancePriority, setPerformancePriority] = useState<ModelPerformancePriority>('balanced');
  const [maxCost, setMaxCost] = useState<number>(0.1);
  const [minContextLength, setMinContextLength] = useState<number>(4000);
  const [requiredCapabilities, setRequiredCapabilities] = useState<string[]>(['streaming']);

  useEffect(() => {
    if (config) {
      setSelectedProvider(config.default_provider);
    }
  }, [config]);

  useEffect(() => {
    const loadModelsForProvider = async () => {
      const models = await getModelsByProvider(selectedProvider);
      setFilteredModels(models);
      
      // Calculate cost estimates for each model
      const estimates: Record<string, number> = {};
      for (const model of models) {
        const cost = await estimateCost(model.id, 1000, 500);
        estimates[model.id] = cost;
      }
      setCostEstimates(estimates);
    };

    loadModelsForProvider();
  }, [selectedProvider, getModelsByProvider, estimateCost]);

  const handleSelectBestModel = async () => {
    const criteria = await createSelectionCriteria(
      selectedProvider,
      maxCost,
      minContextLength,
      requiredCapabilities,
      performancePriority,
      useCase
    );

    if (criteria) {
      const bestModel = await selectBestModel(criteria);
      setRecommendedModel(bestModel);
    }
  };

  const handleGetRecommendedModels = async () => {
    const recommended = await getRecommendedModels(useCase);
    setFilteredModels(recommended);
  };

  const handleToggleModelAvailability = async (modelId: string, available: boolean) => {
    await updateModelAvailability(modelId, available);
  };

  const getPerformanceIcon = (priority: ModelPerformancePriority) => {
    switch (priority) {
      case 'speed':
        return <SpeedIcon />;
      case 'quality':
        return <QualityIcon />;
      case 'cost':
        return <CostIcon />;
      case 'balanced':
        return <BalanceIcon />;
    }
  };

  const getCapabilityIcons = (capabilities: any) => {
    const icons = [];
    if (capabilities.supports_streaming) icons.push(<StreamIcon key="stream" />);
    if (capabilities.supports_function_calling) icons.push(<FunctionIcon key="function" />);
    if (capabilities.supports_vision) icons.push(<VisibilityIcon key="vision" />);
    return icons;
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    if (cost < 0.001) return '<$0.001';
    return `$${cost.toFixed(4)}`;
  };

  const formatContextLength = (length?: number) => {
    if (!length) return 'Unknown';
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M tokens`;
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K tokens`;
    return `${length} tokens`;
  };

  return (
    <Box>
      {/* Model Selection Criteria */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Model Selection Criteria
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as ProviderType)}
                label="Provider"
              >
                <MenuItem value="openai">OpenAI</MenuItem>
                <MenuItem value="anthropic">Anthropic</MenuItem>
                <MenuItem value="ollama">Ollama (Local)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Use Case</InputLabel>
              <Select
                value={useCase}
                onChange={(e) => setUseCase(e.target.value as ModelUseCase)}
                label="Use Case"
              >
                <MenuItem value="case_study_generation">Case Study Generation</MenuItem>
                <MenuItem value="question_generation">Question Generation</MenuItem>
                <MenuItem value="content_analysis">Content Analysis</MenuItem>
                <MenuItem value="summary_generation">Summary Generation</MenuItem>
                <MenuItem value="code_generation">Code Generation</MenuItem>
                <MenuItem value="general_chat">General Chat</MenuItem>
                <MenuItem value="creative_writing">Creative Writing</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Performance Priority</InputLabel>
              <Select
                value={performancePriority}
                onChange={(e) => setPerformancePriority(e.target.value as ModelPerformancePriority)}
                label="Performance Priority"
                startAdornment={getPerformanceIcon(performancePriority)}
              >
                <MenuItem value="speed">
                  <Box display="flex" alignItems="center" gap={1}>
                    <SpeedIcon fontSize="small" />
                    Speed
                  </Box>
                </MenuItem>
                <MenuItem value="quality">
                  <Box display="flex" alignItems="center" gap={1}>
                    <QualityIcon fontSize="small" />
                    Quality
                  </Box>
                </MenuItem>
                <MenuItem value="cost">
                  <Box display="flex" alignItems="center" gap={1}>
                    <CostIcon fontSize="small" />
                    Cost
                  </Box>
                </MenuItem>
                <MenuItem value="balanced">
                  <Box display="flex" alignItems="center" gap={1}>
                    <BalanceIcon fontSize="small" />
                    Balanced
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Max Cost per Request ($)"
              type="number"
              value={maxCost}
              onChange={(e) => setMaxCost(parseFloat(e.target.value) || 0.1)}
              inputProps={{ step: 0.001, min: 0 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Min Context Length"
              type="number"
              value={minContextLength}
              onChange={(e) => setMinContextLength(parseInt(e.target.value) || 4000)}
              inputProps={{ step: 1000, min: 0 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Required Capabilities</InputLabel>
              <Select
                multiple
                value={requiredCapabilities}
                onChange={(e) => setRequiredCapabilities(e.target.value as string[])}
                label="Required Capabilities"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="streaming">Streaming</MenuItem>
                <MenuItem value="function_calling">Function Calling</MenuItem>
                <MenuItem value="vision">Vision</MenuItem>
                <MenuItem value="system_prompt">System Prompt</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box display="flex" gap={2} mt={3}>
          <Button
            variant="contained"
            startIcon={<RecommendIcon />}
            onClick={handleSelectBestModel}
          >
            Find Best Model
          </Button>
          <Button
            variant="outlined"
            onClick={handleGetRecommendedModels}
          >
            Show Recommended for Use Case
          </Button>
        </Box>
      </Paper>

      {/* Recommended Model */}
      {recommendedModel && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Recommended Model: {recommendedModel.name}
          </Typography>
          <Typography variant="body2">
            {recommendedModel.description}
          </Typography>
        </Alert>
      )}

      {/* Model List */}
      <Typography variant="h6" gutterBottom>
        Available Models - {selectedProvider.toUpperCase()}
      </Typography>

      <Grid container spacing={2}>
        {filteredModels.map((model) => (
          <Grid item xs={12} key={model.id}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <ModelIcon color="primary" />
                      <Typography variant="h6">
                        {model.name}
                      </Typography>
                      {model.is_recommended && (
                        <Chip 
                          label="Recommended" 
                          color="primary" 
                          size="small" 
                          icon={<RecommendIcon />}
                        />
                      )}
                      {!model.is_available && (
                        <Chip 
                          label="Unavailable" 
                          color="error" 
                          size="small" 
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {model.description}
                    </Typography>
                  </Box>

                  <Switch
                    checked={model.is_available}
                    onChange={(e) => handleToggleModelAvailability(model.id, e.target.checked)}
                    color="primary"
                  />
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Context Length
                    </Typography>
                    <Typography variant="body2">
                      {formatContextLength(model.context_length)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Estimated Cost
                    </Typography>
                    <Typography variant="body2">
                      {formatCost(costEstimates[model.id] || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Max Output
                    </Typography>
                    <Typography variant="body2">
                      {model.capabilities.max_output_tokens || 'Unknown'} tokens
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Capabilities
                    </Typography>
                    <Box display="flex" gap={0.5}>
                      {getCapabilityIcons(model.capabilities)}
                    </Box>
                  </Grid>
                </Grid>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      Detailed Configuration
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary">
                          Supported Formats
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                          {model.capabilities.supported_formats.map((format) => (
                            <Chip 
                              key={format} 
                              label={format} 
                              size="small" 
                              variant="outlined" 
                            />
                          ))}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary">
                          Input Cost per 1K tokens
                        </Typography>
                        <Typography variant="body2">
                          {model.input_cost_per_1k ? `$${model.input_cost_per_1k.toFixed(4)}` : 'Free'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Output Cost per 1K tokens
                        </Typography>
                        <Typography variant="body2">
                          {model.output_cost_per_1k ? `$${model.output_cost_per_1k.toFixed(4)}` : 'Free'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredModels.length === 0 && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Typography color="text.secondary">
            No models available for {selectedProvider}
          </Typography>
        </Box>
      )}
    </Box>
  );
};