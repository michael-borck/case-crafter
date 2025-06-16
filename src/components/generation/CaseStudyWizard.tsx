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
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Save as SaveIcon,
  Folder as FolderIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Preview as PreviewIcon,
  VisibilityOff as VisibilityOffIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
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
import { ContentStructureSelector, ContentStructureConfig } from './ContentStructureSelector';
import { RealTimePreview } from './RealTimePreview';
import { GenerationSessionManager, GenerationSession } from './GenerationSessionManager';
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
    id: 'structure',
    label: 'Content Structure',
    description: 'Configure which elements to include',
    icon: <SettingsIcon />,
    estimatedMinutes: 5,
    helpText: 'Select specific content elements and customize their details',
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
  const [contentStructure, setContentStructure] = useState<ContentStructureConfig>({
    elements: [],
    totalEstimatedLength: 0,
    includedCategories: [],
    customInstructions: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'side' | 'bottom' | 'fullscreen'>('side');
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

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
      setContentStructure(initialState.contentStructure || {
        elements: [],
        totalEstimatedLength: 0,
        includedCategories: [],
        customInstructions: '',
      });
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
      case 5: // Structure
        return contentStructure.elements.filter(el => el.isEnabled).length > 0; // At least one element selected
      case 6: // Options
        return true; // Options are always valid (have defaults)
      case 7: // Preview
        return true; // Preview is just for review
      default:
        return false;
    }
  }, [contentPreferences, selectedFramework, generatedSchema, formValidation, aiPrompt, contentStructure]);

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
        contentStructure,
        lastSaved: new Date().toISOString(),
      };
      onSave(saveState);
    }
  }, [wizardState, contentPreferences, selectedFramework, generationOptions, generatedSchema, formData, aiPrompt, contentStructure, onSave]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(handleAutoSave, 30000);
    return () => clearInterval(timer);
  }, [handleAutoSave]);

  // Preview handlers
  const handleContentEdit = useCallback((elementId: string, newContent: string) => {
    console.log(`Editing content for element ${elementId}:`, newContent);
    // In a real implementation, this would update the generated content
  }, []);

  const handleContentRegenerate = useCallback((elementId: string) => {
    console.log(`Regenerating content for element ${elementId}`);
    // In a real implementation, this would trigger AI regeneration
  }, []);

  const handleExport = useCallback((format: 'pdf' | 'docx' | 'html') => {
    console.log(`Exporting content as ${format}`);
    // In a real implementation, this would trigger content export
  }, []);

  const togglePreview = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  const canShowPreview = useCallback(() => {
    // Show preview from step 3 onwards (after content input)
    return wizardState.currentStep >= 3 && 
           selectedFramework && 
           contentStructure.elements.some(el => el.isEnabled);
  }, [wizardState.currentStep, selectedFramework, contentStructure]);

  // Session management handlers
  const getCurrentSession = useCallback((): Partial<GenerationSession> => {
    return {
      id: currentSessionId,
      name: currentSessionId ? `Session ${currentSessionId}` : undefined,
      framework: selectedFramework,
      contentStructure,
      formData,
      aiPrompt,
      generationOptions,
      contentPreferences,
      metadata: currentSessionId ? {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user',
        version: '1.0.0',
        wordCount: contentStructure.totalEstimatedLength,
        completionStatus: 'in-progress' as const,
        isStarred: false,
        isShared: false,
        openCount: 0,
      } : undefined,
    };
  }, [currentSessionId, selectedFramework, contentStructure, formData, aiPrompt, generationOptions, contentPreferences]);

  const handleLoadSession = useCallback((session: GenerationSession) => {
    setCurrentSessionId(session.id);
    
    // Load session data into wizard state
    if (session.framework) {
      setSelectedFramework(session.framework);
    }
    if (session.contentStructure) {
      setContentStructure(session.contentStructure);
    }
    if (session.formData) {
      setFormData(session.formData);
    }
    if (session.aiPrompt) {
      setAiPrompt(session.aiPrompt);
    }
    if (session.generationOptions) {
      setGenerationOptions(session.generationOptions);
    }
    if (session.contentPreferences) {
      setContentPreferences(session.contentPreferences);
    }

    // Update wizard state to appropriate step based on loaded data
    let targetStep = 0;
    if (session.framework) targetStep = Math.max(targetStep, 1);
    if (session.contentStructure?.elements.length > 0) targetStep = Math.max(targetStep, 2);
    if (session.formData && Object.keys(session.formData).length > 0) targetStep = Math.max(targetStep, 3);
    if (session.aiPrompt) targetStep = Math.max(targetStep, 4);

    setWizardState(prev => ({
      ...prev,
      currentStep: targetStep,
    }));

    setShowSessionManager(false);
  }, []);

  const handleSaveSession = useCallback(async (session: GenerationSession): Promise<boolean> => {
    try {
      // In a real implementation, this would save to a backend
      // For now, we'll use localStorage which is handled by the SessionManager
      setCurrentSessionId(session.id);
      return true;
    } catch (error) {
      console.error('Failed to save session:', error);
      return false;
    }
  }, []);

  const handleDeleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      // In a real implementation, this would delete from a backend
      if (sessionId === currentSessionId) {
        setCurrentSessionId(null);
      }
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }, [currentSessionId]);

  const handleExportSession = useCallback((session: GenerationSession, format: 'json' | 'csv' | 'pdf') => {
    try {
      const dataStr = JSON.stringify(session, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${session.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Failed to export session:', error);
    }
  }, []);

  const handleImportSession = useCallback(async (file: File): Promise<GenerationSession> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const session = JSON.parse(content) as GenerationSession;
          
          // Validate the session structure
          if (!session.id || !session.name) {
            throw new Error('Invalid session file structure');
          }

          // Convert date strings back to Date objects
          if (session.metadata) {
            session.metadata.createdAt = new Date(session.metadata.createdAt);
            session.metadata.updatedAt = new Date(session.metadata.updatedAt);
            if (session.metadata.lastOpenedAt) {
              session.metadata.lastOpenedAt = new Date(session.metadata.lastOpenedAt);
            }
          }

          resolve(session);
        } catch (error) {
          reject(new Error('Failed to parse session file'));
        }
      };
      reader.readAsText(file);
    });
  }, []);

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
              value={contentPreferences.targetAudience.join('\n')}
              onChange={(e) => setContentPreferences(prev => ({
                ...prev,
                targetAudience: e.target.value.split('\n').filter(line => line.trim())
              }))}
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
              value={contentPreferences.learningObjectives.join('\n')}
              onChange={(e) => setContentPreferences(prev => ({
                ...prev,
                learningObjectives: e.target.value.split('\n').filter(line => line.trim())
              }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Prerequisites"
              placeholder="What should students know beforehand?"
              multiline
              rows={2}
              value={contentPreferences.prerequisites.join('\n')}
              onChange={(e) => setContentPreferences(prev => ({
                ...prev,
                prerequisites: e.target.value.split('\n').filter(line => line.trim())
              }))}
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

  const renderStructureStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Content Structure Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select and customize the specific elements to include in your case study.
      </Typography>

      <ContentStructureSelector
        value={contentStructure}
        onChange={setContentStructure}
        outputType={generationOptions.outputType}
        framework={selectedFramework?.name}
        disabled={false}
      />
    </Box>
  );

  const renderOptionsStep = () => (
    <Stack spacing={3}>
      <Typography variant="h6" gutterBottom>
        Generation Options
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure the type and style of content the AI should generate for your case study.
      </Typography>

      {/* Output Type Selection */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Output Type
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Choose what type of content to generate based on your teaching needs.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card 
                variant={generationOptions.outputType === 'full' ? 'elevation' : 'outlined'}
                sx={{ 
                  cursor: 'pointer',
                  border: generationOptions.outputType === 'full' ? '2px solid' : '1px solid',
                  borderColor: generationOptions.outputType === 'full' ? 'primary.main' : 'divider',
                }}
                onClick={() => setGenerationOptions(prev => ({ ...prev, outputType: 'full' }))}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <BusinessIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="primary">
                      Full Case Study
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    Complete case study with background, analysis, and conclusions.
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label="Narrative" size="small" />
                    <Chip label="Analysis" size="small" />
                    <Chip label="Exhibits" size="small" />
                    <Chip label="Teaching Notes" size="small" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Best for: In-depth learning and comprehensive analysis
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card 
                variant={generationOptions.outputType === 'outline' ? 'elevation' : 'outlined'}
                sx={{ 
                  cursor: 'pointer',
                  border: generationOptions.outputType === 'outline' ? '2px solid' : '1px solid',
                  borderColor: generationOptions.outputType === 'outline' ? 'primary.main' : 'divider',
                }}
                onClick={() => setGenerationOptions(prev => ({ ...prev, outputType: 'outline' }))}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EditIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="primary">
                      Outline Only
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    Structured outline with key points and discussion topics.
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label="Key Points" size="small" />
                    <Chip label="Discussion Topics" size="small" />
                    <Chip label="Framework" size="small" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Best for: Quick reference and guided discussions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card 
                variant={generationOptions.outputType === 'questions_only' ? 'elevation' : 'outlined'}
                sx={{ 
                  cursor: 'pointer',
                  border: generationOptions.outputType === 'questions_only' ? '2px solid' : '1px solid',
                  borderColor: generationOptions.outputType === 'questions_only' ? 'primary.main' : 'divider',
                }}
                onClick={() => setGenerationOptions(prev => ({ ...prev, outputType: 'questions_only' }))}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PsychologyIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="primary">
                      Questions Only
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    Focused set of analysis questions and discussion prompts.
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label="Analysis Questions" size="small" />
                    <Chip label="Critical Thinking" size="small" />
                    <Chip label="Discussion" size="small" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Best for: Student-driven analysis and active learning
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Content Configuration */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Content Configuration
          </Typography>
          
          <Grid container spacing={3}>
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
                <FormHelperText>
                  Recommended length for {generationOptions.outputType === 'full' ? 'full case studies' : 
                    generationOptions.outputType === 'outline' ? 'structured outlines' : 'question sets'}
                </FormHelperText>
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
                <FormHelperText>
                  Adjust the writing style to match your audience
                </FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Complexity Level</InputLabel>
                <Select
                  value={generationOptions.complexity}
                  onChange={(e) => setGenerationOptions(prev => ({
                    ...prev,
                    complexity: e.target.value as any
                  }))}
                  label="Complexity Level"
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
                <FormHelperText>
                  Match the analytical depth to your students' level
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Additional Elements */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Additional Elements
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Select supplementary materials to include with your case study.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                variant="outlined" 
                sx={{ 
                  cursor: 'pointer',
                  bgcolor: generationOptions.includeQuestions ? 'action.selected' : 'background.paper',
                  borderColor: generationOptions.includeQuestions ? 'primary.main' : 'divider',
                }}
                onClick={() => setGenerationOptions(prev => ({
                  ...prev,
                  includeQuestions: !prev.includeQuestions
                }))}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <CheckCircleIcon 
                    color={generationOptions.includeQuestions ? 'primary' : 'disabled'} 
                    sx={{ mb: 1 }} 
                  />
                  <Typography variant="subtitle2">
                    Assessment Questions
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Discussion and analysis questions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card 
                variant="outlined" 
                sx={{ 
                  cursor: 'pointer',
                  bgcolor: generationOptions.includeRubric ? 'action.selected' : 'background.paper',
                  borderColor: generationOptions.includeRubric ? 'primary.main' : 'divider',
                }}
                onClick={() => setGenerationOptions(prev => ({
                  ...prev,
                  includeRubric: !prev.includeRubric
                }))}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <SchoolIcon 
                    color={generationOptions.includeRubric ? 'primary' : 'disabled'} 
                    sx={{ mb: 1 }} 
                  />
                  <Typography variant="subtitle2">
                    Grading Rubric
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Assessment criteria and scoring
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card 
                variant="outlined" 
                sx={{ 
                  cursor: 'pointer',
                  bgcolor: generationOptions.includeInstructions ? 'action.selected' : 'background.paper',
                  borderColor: generationOptions.includeInstructions ? 'primary.main' : 'divider',
                }}
                onClick={() => setGenerationOptions(prev => ({
                  ...prev,
                  includeInstructions: !prev.includeInstructions
                }))}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <InfoIcon 
                    color={generationOptions.includeInstructions ? 'primary' : 'disabled'} 
                    sx={{ mb: 1 }} 
                  />
                  <Typography variant="subtitle2">
                    Teaching Instructions
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Instructor guidance and notes
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Generation Preview */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Selected:</strong> {generationOptions.outputType === 'full' ? 'Full Case Study' : 
            generationOptions.outputType === 'outline' ? 'Outline Only' : 'Questions Only'} • {' '}
          {generationOptions.wordCount} length • {generationOptions.tone} tone • {generationOptions.complexity} complexity
          {(generationOptions.includeQuestions || generationOptions.includeRubric || generationOptions.includeInstructions) && (
            <span> • Plus: {[
              generationOptions.includeQuestions && 'Questions',
              generationOptions.includeRubric && 'Rubric', 
              generationOptions.includeInstructions && 'Instructions'
            ].filter(Boolean).join(', ')}</span>
          )}
        </Typography>
      </Alert>
    </Stack>
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
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Framework</Typography>
              <Typography variant="body2">
                {selectedFramework?.name || 'Not selected'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Output Type</Typography>
              <Typography variant="body2">
                {generationOptions.outputType} ({generationOptions.wordCount} length)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>AI Prompt</Typography>
              <Typography variant="body2">
                {aiPrompt ? `${aiPrompt.substring(0, 50)}...` : 'No prompt created'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Content Structure</Typography>
              <Typography variant="body2">
                {contentStructure.elements.filter(el => el.isEnabled).length} elements selected
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ~{contentStructure.totalEstimatedLength} words
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
                    structure: contentStructure,
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
      case 5: return renderStructureStep();
      case 6: return renderOptionsStep();
      case 7: return renderPreviewStep();
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
    <Box sx={{ maxWidth: showPreview ? '100%' : 1200, mx: 'auto', p: 3 }}>
      <Grid container spacing={3}>
        {/* Main Wizard Content */}
        <Grid item xs={12} md={showPreview ? 6 : 12}>
          {/* Header */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Case Study Generation Wizard
          </Typography>
          <Stack direction="row" spacing={1}>
            {canShowPreview() && (
              <Tooltip title={showPreview ? "Hide Preview" : "Show Preview"}>
                <IconButton onClick={togglePreview}>
                  {showPreview ? <VisibilityOffIcon /> : <PreviewIcon />}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Session Management">
              <IconButton onClick={() => setShowSessionManager(true)}>
                <FolderIcon />
              </IconButton>
            </Tooltip>
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
        </Grid>

        {/* Preview Panel */}
        {showPreview && canShowPreview() && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: 'fit-content', position: 'sticky', top: 20 }}>
              <RealTimePreview
                framework={selectedFramework}
                contentStructure={contentStructure}
                formData={formData}
                aiPrompt={aiPrompt}
                generationOptions={generationOptions}
                onContentEdit={handleContentEdit}
                onContentRegenerate={handleContentRegenerate}
                onExport={handleExport}
                isGenerating={isGenerating}
                disabled={false}
              />
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Session Management Dialog */}
      <Dialog 
        open={showSessionManager} 
        onClose={() => setShowSessionManager(false)} 
        maxWidth="xl" 
        fullWidth
        scroll="body"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Session Management</Typography>
            <IconButton onClick={() => setShowSessionManager(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <GenerationSessionManager
            currentSession={getCurrentSession()}
            onLoadSession={handleLoadSession}
            onSaveSession={handleSaveSession}
            onDeleteSession={handleDeleteSession}
            onExportSession={handleExportSession}
            onImportSession={handleImportSession}
            disabled={isGenerating}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CaseStudyWizard;