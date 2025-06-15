// Comprehensive step-by-step case study generation wizard

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Preview as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  Science as ScienceIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as AIIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { FrameworkSelector, BusinessFramework } from '../frameworks/FrameworkSelector';
import { FrameworkMapper } from '../frameworks/FrameworkMapper';
import { DynamicForm } from '../forms/DynamicForm';
import { StructuredInputForm } from './StructuredInputForm';
import { AIPromptArea } from './AIPromptArea';
import { ConfigurationSchema, ValidationResults } from '../../types/configuration';

// Enhanced wizard step definitions
interface WizardStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isOptional?: boolean;
  estimatedMinutes?: number;
  helpText?: string;
}

interface GenerationOptions {
  outputType: 'full' | 'outline' | 'questions_only';
  includeQuestions: boolean;
  includeRubric: boolean;
  includeInstructions: boolean;
  wordCount: 'short' | 'medium' | 'long';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  tone: 'academic' | 'professional' | 'conversational';
}

interface ContentPreferences {
  targetAudience: string[];
  learningObjectives: string[];
  prerequisites: string[];
  timeAllocation: number;
  assessmentType: string[];
}

interface WizardState {
  currentStep: number;
  completedSteps: Set<number>;
  stepValidation: Record<number, boolean>;
  canProceed: boolean;
  hasWarnings: boolean;
  warnings: string[];
}

const wizardSteps: WizardStep[] = [
  {
    id: 'purpose',
    label: 'Define Purpose',
    description: 'Set learning objectives and target audience',
    icon: <SchoolIcon />,
    estimatedMinutes: 5,
    helpText: 'Clearly define what learners should achieve and who they are',
  },
  {
    id: 'framework',
    label: 'Choose Framework',
    description: 'Select business framework or methodology',
    icon: <BusinessIcon />,
    estimatedMinutes: 3,
    helpText: 'Pick the business framework that best fits your learning goals',
  },
  {
    id: 'configuration',
    label: 'Configure Fields',
    description: 'Map framework elements to input fields',
    icon: <SettingsIcon />,
    estimatedMinutes: 8,
    helpText: 'Customize which information to collect from users',
  },
  {
    id: 'content',
    label: 'Input Content',
    description: 'Provide details and context information',
    icon: <EditIcon />,
    estimatedMinutes: 15,
    helpText: 'Enter the specific details that will shape your case study',
  },
  {
    id: 'prompt',
    label: 'AI Prompt',
    description: 'Create detailed prompt with AI assistance',
    icon: <PsychologyIcon />,
    estimatedMinutes: 10,
    helpText: 'Use AI-powered suggestions to craft a comprehensive prompt',
  },
  {
    id: 'options',
    label: 'Generation Options',
    description: 'Configure output format and style',
    icon: <AIIcon />,
    estimatedMinutes: 3,
    helpText: 'Choose how the AI should generate your case study',
  },
  {
    id: 'preview',
    label: 'Review & Generate',
    description: 'Review settings and generate case study',
    icon: <PreviewIcon />,
    estimatedMinutes: 2,
    helpText: 'Final review before AI generation begins',
  },
];

interface CaseStudyWizardProps {
  onComplete?: (caseStudy: any) => void;
  onSave?: (wizardState: any) => void;
  initialState?: any;
  mode?: 'create' | 'edit';
}

export const CaseStudyWizard: React.FC<CaseStudyWizardProps> = ({
  onComplete,
  onSave,
  initialState,
  mode = 'create',
}) => {
  // Wizard state management
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 0,
    completedSteps: new Set<number>(),
    stepValidation: {},
    canProceed: false,
    hasWarnings: false,
    warnings: [],
  });

  // Step-specific state
  const [contentPreferences, setContentPreferences] = useState<ContentPreferences>({
    targetAudience: [],
    learningObjectives: [],
    prerequisites: [],
    timeAllocation: 60,
    assessmentType: [],
  });

  const [selectedFramework, setSelectedFramework] = useState<BusinessFramework | null>(null);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    outputType: 'full',
    includeQuestions: true,
    includeRubric: false,
    includeInstructions: true,
    wordCount: 'medium',
    complexity: 'intermediate',
    tone: 'academic',
  });

  const [generatedSchema, setGeneratedSchema] = useState<ConfigurationSchema | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formValidation, setFormValidation] = useState<ValidationResults>({
    is_valid: false,
    field_errors: {},
    global_errors: [],
    warnings: [],
  });

  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial state if provided
  useEffect(() => {
    if (initialState) {
      // Restore wizard state from saved data
      setWizardState(prev => ({ ...prev, ...initialState.wizardState }));
      setContentPreferences(initialState.contentPreferences || {});
      setSelectedFramework(initialState.selectedFramework);
      setGenerationOptions(initialState.generationOptions || {});
      setGeneratedSchema(initialState.generatedSchema);
      setFormData(initialState.formData || {});
      setAiPrompt(initialState.aiPrompt || '');
    }
  }, [initialState]);

  // Step validation functions
  const validateStep = useCallback((stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Purpose
        return contentPreferences.targetAudience.length > 0 && 
               contentPreferences.learningObjectives.length > 0;
      case 1: // Framework
        return selectedFramework !== null;
      case 2: // Configuration
        return generatedSchema !== null;
      case 3: // Content
        return formValidation.is_valid;
      case 4: // Prompt
        return aiPrompt.trim().length >= 50; // Require meaningful prompt
      case 5: // Options
        return true; // Options are always valid (have defaults)
      case 6: // Preview
        return true; // Preview is just for review
      default:
        return false;
    }
  }, [contentPreferences, selectedFramework, generatedSchema, formValidation, aiPrompt]);

  // Update step validation when dependencies change
  useEffect(() => {
    const newValidation: Record<number, boolean> = {};
    wizardSteps.forEach((_, index) => {
      newValidation[index] = validateStep(index);
    });

    const currentStepValid = newValidation[wizardState.currentStep];
    
    setWizardState(prev => ({
      ...prev,
      stepValidation: newValidation,
      canProceed: currentStepValid,
    }));
  }, [validateStep, wizardState.currentStep]);

  // Navigation functions
  const handleNext = () => {
    const nextStep = wizardState.currentStep + 1;
    setWizardState(prev => ({
      ...prev,
      currentStep: nextStep,
      completedSteps: new Set([...prev.completedSteps, prev.currentStep]),
    }));
    setError(null);
  };

  const handleBack = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
    setError(null);
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow clicking on completed steps or the next step
    if (wizardState.completedSteps.has(stepIndex) || stepIndex === wizardState.currentStep + 1) {
      setWizardState(prev => ({
        ...prev,
        currentStep: stepIndex,
      }));
    }
  };

  // Auto-save functionality
  const handleAutoSave = useCallback(() => {
    if (onSave) {
      const saveState = {
        wizardState,
        contentPreferences,
        selectedFramework,
        generationOptions,
        generatedSchema,
        formData,
        aiPrompt,
        lastSaved: new Date().toISOString(),
      };
      onSave(saveState);
    }
  }, [wizardState, contentPreferences, selectedFramework, generationOptions, generatedSchema, formData, aiPrompt, onSave]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(handleAutoSave, 30000);
    return () => clearInterval(timer);
  }, [handleAutoSave]);

  // Step content renderers
  const renderPurposeStep = () => (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Define Learning Objectives
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Start by clearly defining what learners should achieve and who they are.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Target Audience"
              placeholder="e.g., undergraduate business students"
              helperText="Who will be using this case study?"
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Difficulty Level</InputLabel>
              <Select
                value={generationOptions.complexity}
                onChange={(e) => setGenerationOptions(prev => ({
                  ...prev,
                  complexity: e.target.value as any
                }))}
                label="Difficulty Level"
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Learning Objectives"
              placeholder="What should students learn from this case study?"
              multiline
              rows={3}
              helperText="List the key learning outcomes (one per line)"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Prerequisites"
              placeholder="What should students know beforehand?"
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Time Allocation (minutes)"
              value={contentPreferences.timeAllocation}
              onChange={(e) => setContentPreferences(prev => ({
                ...prev,
                timeAllocation: parseInt(e.target.value) || 60
              }))}
              helperText="How long should this take to complete?"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderFrameworkStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Choose Business Framework
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select the business framework that best aligns with your learning objectives.
      </Typography>
      
      <FrameworkSelector
        onFrameworkSelect={setSelectedFramework}
        selectedFramework={selectedFramework}
        showDetailedView={true}
      />

      {selectedFramework && (
        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Selected: {selectedFramework.name}
            </Typography>
            <Typography variant="body2" paragraph>
              {selectedFramework.description}
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip label={`${selectedFramework.complexity} complexity`} size="small" />
              <Chip label={`~${selectedFramework.estimatedMinutes} minutes`} size="small" />
              <Chip label={selectedFramework.category} size="small" variant="outlined" />
            </Stack>

            <Typography variant="subtitle2" gutterBottom>
              Key Questions This Framework Addresses:
            </Typography>
            <List dense>
              {selectedFramework.keyQuestions.slice(0, 3).map((question, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={question} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  const renderConfigurationStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Field Mapping
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Map framework elements to input fields to customize data collection.
      </Typography>

      {selectedFramework ? (
        <FrameworkMapper
          framework={selectedFramework}
          onMappingComplete={setGeneratedSchema}
          initialMapping={generatedSchema}
        />
      ) : (
        <Alert severity="warning">
          Please select a framework first.
        </Alert>
      )}
    </Box>
  );

  const renderContentStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Input Content Details
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Provide the specific information that will shape your case study using our enhanced structured input form.
      </Typography>

      {selectedFramework ? (
        <StructuredInputForm
          framework={selectedFramework}
          initialData={formData}
          onDataChange={setFormData}
          onValidationChange={(isValid, errors) => {
            setFormValidation({
              isValid,
              errors: errors.map(error => ({ field: '', message: error })),
              warnings: []
            });
          }}
          showProgress={true}
          allowFieldFiltering={true}
          allowFieldGrouping={true}
          allowAdvancedValidation={true}
          mode="create"
        />
      ) : (
        <Alert severity="warning">
          Please select a framework first to enable structured input.
        </Alert>
      )}
    </Box>
  );

  const renderPromptStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        AI-Powered Prompt Creation
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Create a detailed prompt for your case study using AI-powered suggestions and templates.
      </Typography>

      <AIPromptArea
        value={aiPrompt}
        onChange={setAiPrompt}
        framework={selectedFramework?.name}
        industry={selectedFramework?.category}
        placeholder="Describe your case study scenario in detail. The AI will help you craft a comprehensive prompt that incorporates your selected framework and input data..."
        maxLength={5000}
        showSuggestions={true}
        showTemplates={true}
        showHistory={true}
        onSuggestionAccept={(suggestion) => {
          console.log('Suggestion accepted:', suggestion);
        }}
        onTemplateSelect={(template) => {
          console.log('Template selected:', template);
        }}
      />
    </Box>
  );

  const renderOptionsStep = () => (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Generation Options
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configure how the AI should generate your case study.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Output Type</InputLabel>
              <Select
                value={generationOptions.outputType}
                onChange={(e) => setGenerationOptions(prev => ({
                  ...prev,
                  outputType: e.target.value as any
                }))}
                label="Output Type"
              >
                <MenuItem value="full">Full Case Study</MenuItem>
                <MenuItem value="outline">Outline Only</MenuItem>
                <MenuItem value="questions_only">Questions Only</MenuItem>
              </Select>
              <FormHelperText>Choose the level of detail for output</FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Content Length</InputLabel>
              <Select
                value={generationOptions.wordCount}
                onChange={(e) => setGenerationOptions(prev => ({
                  ...prev,
                  wordCount: e.target.value as any
                }))}
                label="Content Length"
              >
                <MenuItem value="short">Short (500-1000 words)</MenuItem>
                <MenuItem value="medium">Medium (1000-2000 words)</MenuItem>
                <MenuItem value="long">Long (2000+ words)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Writing Tone</InputLabel>
              <Select
                value={generationOptions.tone}
                onChange={(e) => setGenerationOptions(prev => ({
                  ...prev,
                  tone: e.target.value as any
                }))}
                label="Writing Tone"
              >
                <MenuItem value="academic">Academic</MenuItem>
                <MenuItem value="professional">Professional</MenuItem>
                <MenuItem value="conversational">Conversational</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Include Additional Elements
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip
                label="Assessment Questions"
                clickable
                color={generationOptions.includeQuestions ? "primary" : "default"}
                onClick={() => setGenerationOptions(prev => ({
                  ...prev,
                  includeQuestions: !prev.includeQuestions
                }))}
              />
              <Chip
                label="Grading Rubric"
                clickable
                color={generationOptions.includeRubric ? "primary" : "default"}
                onClick={() => setGenerationOptions(prev => ({
                  ...prev,
                  includeRubric: !prev.includeRubric
                }))}
              />
              <Chip
                label="Teaching Instructions"
                clickable
                color={generationOptions.includeInstructions ? "primary" : "default"}
                onClick={() => setGenerationOptions(prev => ({
                  ...prev,
                  includeInstructions: !prev.includeInstructions
                }))}
              />
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderPreviewStep = () => (
    <Stack spacing={3}>
      <Typography variant="h6" gutterBottom>
        Review & Generate
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Review your configuration before generating the case study.
      </Typography>

      {/* Summary cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Framework</Typography>
              <Typography variant="body2">
                {selectedFramework?.name || 'Not selected'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Output Type</Typography>
              <Typography variant="body2">
                {generationOptions.outputType} ({generationOptions.wordCount} length)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>AI Prompt</Typography>
              <Typography variant="body2">
                {aiPrompt ? `${aiPrompt.substring(0, 50)}...` : 'No prompt created'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Generate button */}
      <Card variant="outlined">
        <CardContent>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={isGenerating ? <CircularProgress size={20} /> : <AIIcon />}
            onClick={() => {
              setIsGenerating(true);
              // Simulate generation
              setTimeout(() => {
                setIsGenerating(false);
                if (onComplete) {
                  onComplete({
                    framework: selectedFramework,
                    options: generationOptions,
                    data: formData,
                    prompt: aiPrompt,
                    preferences: contentPreferences,
                  });
                }
              }, 3000);
            }}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating Case Study...' : 'Generate Case Study'}
          </Button>
          
          {isGenerating && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                The AI is analyzing your inputs and creating a customized case study...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );

  const getStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: return renderPurposeStep();
      case 1: return renderFrameworkStep();
      case 2: return renderConfigurationStep();
      case 3: return renderContentStep();
      case 4: return renderPromptStep();
      case 5: return renderOptionsStep();
      case 6: return renderPreviewStep();
      default: return <Typography>Unknown step</Typography>;
    }
  };

  const getTotalEstimatedTime = () => {
    return wizardSteps.reduce((total, step) => total + (step.estimatedMinutes || 0), 0);
  };

  const getCompletedTime = () => {
    return wizardSteps
      .filter((_, index) => wizardState.completedSteps.has(index))
      .reduce((total, step) => total + (step.estimatedMinutes || 0), 0);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Case Study Generation Wizard
          </Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Save progress">
              <IconButton onClick={handleAutoSave}>
                <SaveIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Progress indicator */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Step {wizardState.currentStep + 1} of {wizardSteps.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getCompletedTime()}/{getTotalEstimatedTime()} minutes
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={(wizardState.currentStep / wizardSteps.length) * 100} 
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Stepper */}
      <Stepper activeStep={wizardState.currentStep} orientation="vertical">
        {wizardSteps.map((step, index) => (
          <Step key={step.id} completed={wizardState.completedSteps.has(index)}>
            <StepLabel
              onClick={() => handleStepClick(index)}
              sx={{ cursor: 'pointer' }}
              icon={step.icon}
              error={wizardState.stepValidation[index] === false && wizardState.currentStep > index}
            >
              <Box>
                <Typography variant="h6">{step.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </Box>
            </StepLabel>
            <StepContent>
              <Box sx={{ mt: 2, mb: 2 }}>
                {getStepContent(index)}
              </Box>
              
              {/* Navigation buttons */}
              <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!wizardState.canProceed}
                >
                  {index === wizardSteps.length - 1 ? 'Complete' : 'Continue'}
                </Button>
                <Button
                  onClick={handleBack}
                  disabled={wizardState.currentStep === 0}
                >
                  Back
                </Button>
                {step.helpText && (
                  <Tooltip title={step.helpText}>
                    <IconButton>
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default CaseStudyWizard;