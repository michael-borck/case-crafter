import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Slider,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  IconButton,
  Paper,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Article as ArticleIcon,
  Quiz as QuizIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  Analytics as AnalyticsIcon,
  Timeline as TimelineIcon,
  Description as DescriptionIcon,
  QuestionAnswer as QuestionIcon,
  Assessment as RubricIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  DragIndicator as DragIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';

export interface ContentElement {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'analysis' | 'supplementary' | 'assessment';
  icon: React.ReactNode;
  isRequired?: boolean;
  isEnabled: boolean;
  priority: number;
  estimatedLength?: number;
  dependencies?: string[];
  customOptions?: {
    includeCharts?: boolean;
    includeTimeline?: boolean;
    includeFinancials?: boolean;
    detailLevel?: 'basic' | 'detailed' | 'comprehensive';
    wordCount?: number;
  };
}

export interface ContentStructureConfig {
  elements: ContentElement[];
  totalEstimatedLength: number;
  includedCategories: string[];
  customInstructions: string;
}

export interface ContentStructureSelectorProps {
  value: ContentStructureConfig;
  onChange: (config: ContentStructureConfig) => void;
  outputType: 'full' | 'outline' | 'questions_only';
  framework?: string;
  disabled?: boolean;
}

const defaultElements: ContentElement[] = [
  // Core Elements
  {
    id: 'executive_summary',
    name: 'Executive Summary',
    description: 'Brief overview of the case scenario and key issues',
    category: 'core',
    icon: <DescriptionIcon />,
    isRequired: true,
    isEnabled: true,
    priority: 1,
    estimatedLength: 200,
    customOptions: { detailLevel: 'basic', wordCount: 200 },
  },
  {
    id: 'background',
    name: 'Company/Situation Background',
    description: 'Detailed context about the organization and industry',
    category: 'core',
    icon: <BusinessIcon />,
    isRequired: true,
    isEnabled: true,
    priority: 2,
    estimatedLength: 400,
    customOptions: { includeTimeline: false, detailLevel: 'detailed', wordCount: 400 },
  },
  {
    id: 'problem_statement',
    name: 'Problem Statement',
    description: 'Clear articulation of the central challenge or decision',
    category: 'core',
    icon: <ArticleIcon />,
    isRequired: true,
    isEnabled: true,
    priority: 3,
    estimatedLength: 300,
    customOptions: { detailLevel: 'detailed', wordCount: 300 },
  },
  {
    id: 'key_players',
    name: 'Key Stakeholders',
    description: 'Important people and their roles in the scenario',
    category: 'core',
    icon: <SchoolIcon />,
    isRequired: false,
    isEnabled: true,
    priority: 4,
    estimatedLength: 200,
    customOptions: { detailLevel: 'basic', wordCount: 200 },
  },
  
  // Analysis Elements
  {
    id: 'financial_data',
    name: 'Financial Information',
    description: 'Relevant financial data, statements, and metrics',
    category: 'analysis',
    icon: <AnalyticsIcon />,
    isRequired: false,
    isEnabled: false,
    priority: 5,
    estimatedLength: 300,
    customOptions: { includeCharts: true, includeFinancials: true, detailLevel: 'detailed', wordCount: 300 },
  },
  {
    id: 'market_analysis',
    name: 'Market Analysis',
    description: 'Industry trends, competitive landscape, and market conditions',
    category: 'analysis',
    icon: <TimelineIcon />,
    isRequired: false,
    isEnabled: false,
    priority: 6,
    estimatedLength: 350,
    customOptions: { includeCharts: true, detailLevel: 'detailed', wordCount: 350 },
  },
  {
    id: 'swot_analysis',
    name: 'SWOT Analysis',
    description: 'Strengths, weaknesses, opportunities, and threats',
    category: 'analysis',
    icon: <AnalyticsIcon />,
    isRequired: false,
    isEnabled: false,
    priority: 7,
    estimatedLength: 250,
    dependencies: ['background'],
    customOptions: { detailLevel: 'detailed', wordCount: 250 },
  },
  
  // Supplementary Elements
  {
    id: 'exhibits',
    name: 'Exhibits & Data',
    description: 'Charts, graphs, and supporting documents',
    category: 'supplementary',
    icon: <AssignmentIcon />,
    isRequired: false,
    isEnabled: false,
    priority: 8,
    estimatedLength: 150,
    customOptions: { includeCharts: true, includeFinancials: true, detailLevel: 'basic' },
  },
  {
    id: 'timeline',
    name: 'Timeline of Events',
    description: 'Chronological sequence of important events',
    category: 'supplementary',
    icon: <TimelineIcon />,
    isRequired: false,
    isEnabled: false,
    priority: 9,
    estimatedLength: 200,
    customOptions: { includeTimeline: true, detailLevel: 'basic', wordCount: 200 },
  },
  {
    id: 'appendices',
    name: 'Appendices',
    description: 'Additional supporting materials and references',
    category: 'supplementary',
    icon: <InfoIcon />,
    isRequired: false,
    isEnabled: false,
    priority: 10,
    estimatedLength: 100,
    customOptions: { detailLevel: 'basic' },
  },
  
  // Assessment Elements
  {
    id: 'discussion_questions',
    name: 'Discussion Questions',
    description: 'Thought-provoking questions for analysis and debate',
    category: 'assessment',
    icon: <QuestionIcon />,
    isRequired: false,
    isEnabled: true,
    priority: 11,
    estimatedLength: 100,
    customOptions: { detailLevel: 'detailed' },
  },
  {
    id: 'assignment_prompts',
    name: 'Assignment Prompts',
    description: 'Structured assignments and deliverables',
    category: 'assessment',
    icon: <AssignmentIcon />,
    isRequired: false,
    isEnabled: false,
    priority: 12,
    estimatedLength: 150,
    customOptions: { detailLevel: 'detailed', wordCount: 150 },
  },
  {
    id: 'grading_rubric',
    name: 'Grading Rubric',
    description: 'Assessment criteria and scoring guidelines',
    category: 'assessment',
    icon: <RubricIcon />,
    isRequired: false,
    isEnabled: false,
    priority: 13,
    estimatedLength: 200,
    dependencies: ['discussion_questions'],
    customOptions: { detailLevel: 'comprehensive', wordCount: 200 },
  },
  {
    id: 'teaching_notes',
    name: 'Teaching Notes',
    description: 'Instructor guidance and facilitation tips',
    category: 'assessment',
    icon: <SchoolIcon />,
    isRequired: false,
    isEnabled: false,
    priority: 14,
    estimatedLength: 250,
    customOptions: { detailLevel: 'comprehensive', wordCount: 250 },
  },
];

export const ContentStructureSelector: React.FC<ContentStructureSelectorProps> = ({
  value,
  onChange,
  outputType,
  framework,
  disabled = false,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string>('core');

  // Initialize with default elements if value is empty
  const elements = value.elements.length > 0 ? value.elements : defaultElements;

  const handleElementToggle = useCallback((elementId: string) => {
    const newElements = elements.map(element => 
      element.id === elementId 
        ? { ...element, isEnabled: !element.isEnabled }
        : element
    );
    
    const totalLength = newElements
      .filter(el => el.isEnabled)
      .reduce((sum, el) => sum + (el.estimatedLength || 0), 0);
    
    const includedCategories = [...new Set(
      newElements.filter(el => el.isEnabled).map(el => el.category)
    )];

    onChange({
      ...value,
      elements: newElements,
      totalEstimatedLength: totalLength,
      includedCategories,
    });
  }, [elements, value, onChange]);

  const handleElementOptionChange = useCallback((elementId: string, optionKey: string, optionValue: any) => {
    const newElements = elements.map(element => 
      element.id === elementId 
        ? { 
            ...element, 
            customOptions: { 
              ...element.customOptions, 
              [optionKey]: optionValue 
            } 
          }
        : element
    );

    const totalLength = newElements
      .filter(el => el.isEnabled)
      .reduce((sum, el) => sum + (el.customOptions?.wordCount || el.estimatedLength || 0), 0);

    onChange({
      ...value,
      elements: newElements,
      totalEstimatedLength: totalLength,
    });
  }, [elements, value, onChange]);

  const handleCustomInstructionsChange = useCallback((instructions: string) => {
    onChange({
      ...value,
      customInstructions: instructions,
    });
  }, [value, onChange]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core': return <ArticleIcon />;
      case 'analysis': return <AnalyticsIcon />;
      case 'supplementary': return <AssignmentIcon />;
      case 'assessment': return <QuizIcon />;
      default: return <InfoIcon />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'primary';
      case 'analysis': return 'secondary';
      case 'supplementary': return 'info';
      case 'assessment': return 'success';
      default: return 'default';
    }
  };

  const getOutputTypeRecommendations = () => {
    switch (outputType) {
      case 'full':
        return {
          recommended: ['executive_summary', 'background', 'problem_statement', 'financial_data', 'discussion_questions'],
          title: 'Recommended for Full Case Study',
          description: 'Complete narrative with comprehensive analysis elements.'
        };
      case 'outline':
        return {
          recommended: ['executive_summary', 'problem_statement', 'key_players', 'discussion_questions'],
          title: 'Recommended for Outline Format',
          description: 'Key structural elements for guided discussion.'
        };
      case 'questions_only':
        return {
          recommended: ['discussion_questions', 'assignment_prompts', 'grading_rubric'],
          title: 'Recommended for Questions Only',
          description: 'Assessment-focused elements for student analysis.'
        };
      default:
        return { recommended: [], title: '', description: '' };
    }
  };

  const recommendations = getOutputTypeRecommendations();
  
  const categories = [
    { id: 'core', name: 'Core Elements', description: 'Essential case study components' },
    { id: 'analysis', name: 'Analysis Elements', description: 'Analytical frameworks and data' },
    { id: 'supplementary', name: 'Supplementary', description: 'Supporting materials and exhibits' },
    { id: 'assessment', name: 'Assessment', description: 'Questions, rubrics, and teaching tools' },
  ];

  const enabledElements = elements.filter(el => el.isEnabled);
  const totalEstimatedWords = enabledElements.reduce((sum, el) => 
    sum + (el.customOptions?.wordCount || el.estimatedLength || 0), 0
  );

  return (
    <Stack spacing={3}>
      <Typography variant="h6" gutterBottom>
        Content Structure Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select which elements to include in your case study and customize their details.
      </Typography>

      {/* Output Type Recommendations */}
      {recommendations.recommended.length > 0 && (
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            {recommendations.title}
          </Typography>
          <Typography variant="body2">
            {recommendations.description}
          </Typography>
        </Alert>
      )}

      {/* Summary Stats */}
      <Paper elevation={1} sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <Typography variant="h4" color="primary" gutterBottom>
              {enabledElements.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Elements Selected
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="h4" color="secondary" gutterBottom>
              {Math.round(totalEstimatedWords)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estimated Words
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" gutterBottom>
              Categories: {value.includedCategories.join(', ') || 'None'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {categories.map(cat => {
                const count = enabledElements.filter(el => el.category === cat.id).length;
                return count > 0 ? (
                  <Chip 
                    key={cat.id}
                    label={`${cat.name} (${count})`}
                    size="small"
                    color={getCategoryColor(cat.id)}
                    variant="outlined"
                  />
                ) : null;
              })}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Content Elements by Category */}
      {categories.map(category => {
        const categoryElements = elements.filter(el => el.category === category.id);
        const enabledCount = categoryElements.filter(el => el.isEnabled).length;
        
        return (
          <Accordion 
            key={category.id}
            expanded={expandedCategory === category.id}
            onChange={() => setExpandedCategory(expandedCategory === category.id ? '' : category.id)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                {getCategoryIcon(category.id)}
                <Box sx={{ ml: 1, flexGrow: 1 }}>
                  <Typography variant="h6">
                    {category.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {category.description} • {enabledCount}/{categoryElements.length} selected
                  </Typography>
                </Box>
                <Chip 
                  label={`${enabledCount} enabled`}
                  size="small"
                  color={enabledCount > 0 ? getCategoryColor(category.id) : 'default'}
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {categoryElements.map(element => {
                  const isRecommended = recommendations.recommended.includes(element.id);
                  
                  return (
                    <Card 
                      key={element.id}
                      variant={element.isEnabled ? 'elevation' : 'outlined'}
                      sx={{
                        border: element.isEnabled ? '2px solid' : '1px solid',
                        borderColor: element.isEnabled ? 
                          (isRecommended ? 'success.main' : 'primary.main') : 'divider',
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Box sx={{ mr: 2, mt: 0.5 }}>
                            {element.icon}
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                {element.name}
                                {element.isRequired && (
                                  <Chip label="Required" size="small" color="error" sx={{ ml: 1 }} />
                                )}
                                {isRecommended && (
                                  <Chip label="Recommended" size="small" color="success" sx={{ ml: 1 }} />
                                )}
                              </Typography>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={element.isEnabled}
                                    onChange={() => handleElementToggle(element.id)}
                                    disabled={disabled || element.isRequired}
                                  />
                                }
                                label=""
                              />
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {element.description}
                            </Typography>

                            {element.isEnabled && element.customOptions && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Customization Options
                                </Typography>
                                <Grid container spacing={2}>
                                  {element.customOptions.wordCount !== undefined && (
                                    <Grid item xs={12} sm={6}>
                                      <Typography variant="body2" gutterBottom>
                                        Word Count: {element.customOptions.wordCount}
                                      </Typography>
                                      <Slider
                                        value={element.customOptions.wordCount}
                                        onChange={(_, value) => 
                                          handleElementOptionChange(element.id, 'wordCount', value)
                                        }
                                        min={50}
                                        max={1000}
                                        step={50}
                                        marks={[
                                          { value: 100, label: '100' },
                                          { value: 500, label: '500' },
                                          { value: 1000, label: '1000' },
                                        ]}
                                        disabled={disabled}
                                      />
                                    </Grid>
                                  )}
                                  
                                  {element.customOptions.includeCharts !== undefined && (
                                    <Grid item xs={12} sm={6}>
                                      <FormControlLabel
                                        control={
                                          <Switch
                                            checked={element.customOptions.includeCharts}
                                            onChange={(e) => 
                                              handleElementOptionChange(element.id, 'includeCharts', e.target.checked)
                                            }
                                            disabled={disabled}
                                          />
                                        }
                                        label="Include Charts & Graphs"
                                      />
                                    </Grid>
                                  )}
                                  
                                  {element.customOptions.includeFinancials !== undefined && (
                                    <Grid item xs={12} sm={6}>
                                      <FormControlLabel
                                        control={
                                          <Switch
                                            checked={element.customOptions.includeFinancials}
                                            onChange={(e) => 
                                              handleElementOptionChange(element.id, 'includeFinancials', e.target.checked)
                                            }
                                            disabled={disabled}
                                          />
                                        }
                                        label="Include Financial Data"
                                      />
                                    </Grid>
                                  )}
                                </Grid>
                              </Box>
                            )}

                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Est. {element.customOptions?.wordCount || element.estimatedLength} words
                              </Typography>
                              {element.dependencies && element.dependencies.length > 0 && (
                                <Tooltip title={`Depends on: ${element.dependencies.join(', ')}`}>
                                  <InfoIcon fontSize="small" color="info" />
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Custom Instructions */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Custom Instructions
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Add any specific requirements or modifications for the selected elements.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={value.customInstructions || ''}
            onChange={(e) => handleCustomInstructionsChange(e.target.value)}
            placeholder="e.g., Focus on sustainability aspects, include international perspective, emphasize ethical considerations..."
            disabled={disabled}
          />
        </CardContent>
      </Card>
    </Stack>
  );
};