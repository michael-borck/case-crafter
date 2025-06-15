// Framework field mapping and configuration component

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Build as MappingIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { BusinessFramework, FrameworkField } from './FrameworkSelector';
import {
  ConfigurationSchema,
  FieldDefinition,
  FIELD_TYPES,
  VALIDATION_TYPES,
} from '../../types/configuration';

interface FrameworkMapping {
  frameworkFieldId: string;
  configFieldId: string;
  transformationType: 'direct' | 'calculated' | 'conditional' | 'template';
  transformationConfig?: any;
  isRequired: boolean;
  defaultValue?: any;
}

interface FrameworkMapperProps {
  framework: BusinessFramework;
  onMappingComplete: (schema: ConfigurationSchema) => void;
}

const TRANSFORMATION_TYPES = [
  { value: 'direct', label: 'Direct Mapping', description: 'Map field directly to framework field' },
  { value: 'calculated', label: 'Calculated', description: 'Calculate value from multiple fields' },
  { value: 'conditional', label: 'Conditional', description: 'Map based on conditions' },
  { value: 'template', label: 'Template', description: 'Use predefined template or prompt' },
];

export const FrameworkMapper: React.FC<FrameworkMapperProps> = ({
  framework,
  onMappingComplete,
}) => {
  const [mappings, setMappings] = useState<FrameworkMapping[]>([]);
  const [generatedSchema, setGeneratedSchema] = useState<ConfigurationSchema | null>(null);
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(true);

  // Initialize mappings for framework fields
  useEffect(() => {
    const initialMappings: FrameworkMapping[] = framework.requiredFields.map(field => ({
      frameworkFieldId: field.id,
      configFieldId: field.id,
      transformationType: 'direct',
      isRequired: field.required,
      defaultValue: undefined,
    }));
    setMappings(initialMappings);
  }, [framework]);

  // Generate configuration schema from mappings
  const generateSchema = (): ConfigurationSchema => {
    const now = new Date().toISOString();
    
    // Create framework-specific fields
    const frameworkFields: FieldDefinition[] = mappings.map(mapping => {
      const frameworkField = framework.requiredFields.find(f => f.id === mapping.frameworkFieldId);
      if (!frameworkField) throw new Error(`Framework field ${mapping.frameworkFieldId} not found`);

      return {
        id: mapping.configFieldId,
        label: frameworkField.label,
        field_type: mapFieldType(frameworkField.type),
        required: mapping.isRequired,
        placeholder: frameworkField.placeholder || '',
        help_text: frameworkField.helpText || frameworkField.description,
        default_value: mapping.defaultValue,
        validations: [
          ...(mapping.isRequired ? [{ type: VALIDATION_TYPES.REQUIRED }] : []),
          ...generateValidationsForField(frameworkField)
        ],
        options: {
          static_options: frameworkField.options?.map(opt => ({
            value: opt,
            label: opt,
            description: '',
            disabled: false,
          })) || [],
          allow_custom: frameworkField.type === 'text',
        },
        display: {
          css_classes: [],
          styles: {},
          grid: { xs: 12, sm: 6, md: 6, lg: 6 },
          disabled: false,
          readonly: false,
          auto_focus: mapping.frameworkFieldId === framework.requiredFields[0]?.id,
          width: '100%',
        },
        dependent_fields: [],
        framework_mapping: {
          framework: framework.id,
          component: mapping.frameworkFieldId,
          element: frameworkField.label,
          description: frameworkField.description,
          metadata: {
            transformationType: mapping.transformationType,
            transformationConfig: mapping.transformationConfig,
          },
        },
      };
    });

    // Add common case study fields
    const commonFields: FieldDefinition[] = [
      {
        id: 'case_title',
        label: 'Case Study Title',
        field_type: { type: FIELD_TYPES.TEXT },
        required: true,
        placeholder: 'Enter a compelling title for your case study',
        help_text: 'A clear, engaging title that reflects the case study content',
        default_value: '',
        validations: [
          { type: VALIDATION_TYPES.REQUIRED },
          { type: VALIDATION_TYPES.MIN_LENGTH, config: { length: 10 } },
          { type: VALIDATION_TYPES.MAX_LENGTH, config: { length: 100 } },
        ],
        options: { static_options: [], allow_custom: true },
        display: {
          css_classes: [],
          styles: {},
          grid: { xs: 12, sm: 12, md: 12, lg: 12 },
          disabled: false,
          readonly: false,
          auto_focus: false,
          width: '100%',
        },
        dependent_fields: [],
      },
      {
        id: 'learning_objectives',
        label: 'Learning Objectives',
        field_type: { type: FIELD_TYPES.FIELD_ARRAY },
        required: true,
        help_text: 'What should students learn from this case study?',
        default_value: framework.learningObjectives,
        validations: [
          { type: VALIDATION_TYPES.REQUIRED },
        ],
        options: { static_options: [], allow_custom: true },
        display: {
          css_classes: [],
          styles: {},
          grid: { xs: 12, sm: 12, md: 12, lg: 12 },
          disabled: false,
          readonly: false,
          auto_focus: false,
          width: '100%',
        },
        dependent_fields: [],
      },
      {
        id: 'target_audience',
        label: 'Target Audience',
        field_type: { type: FIELD_TYPES.MULTI_SELECT },
        required: true,
        help_text: 'Who is this case study designed for?',
        default_value: [],
        validations: [{ type: VALIDATION_TYPES.REQUIRED }],
        options: {
          static_options: [
            { value: 'undergraduate', label: 'Undergraduate Students', description: '', disabled: false },
            { value: 'graduate', label: 'Graduate Students', description: '', disabled: false },
            { value: 'mba', label: 'MBA Students', description: '', disabled: false },
            { value: 'executive', label: 'Executive Education', description: '', disabled: false },
            { value: 'professionals', label: 'Working Professionals', description: '', disabled: false },
          ],
          allow_custom: true,
        },
        display: {
          css_classes: [],
          styles: {},
          grid: { xs: 12, sm: 6, md: 6, lg: 6 },
          disabled: false,
          readonly: false,
          auto_focus: false,
          width: '100%',
        },
        dependent_fields: [],
      },
      {
        id: 'difficulty_level',
        label: 'Difficulty Level',
        field_type: { type: FIELD_TYPES.SELECT },
        required: true,
        help_text: 'How challenging should this case study be?',
        default_value: framework.complexity,
        validations: [{ type: VALIDATION_TYPES.REQUIRED }],
        options: {
          static_options: [
            { value: 'Beginner', label: 'Beginner', description: 'Basic concepts, clear guidance', disabled: false },
            { value: 'Intermediate', label: 'Intermediate', description: 'Some complexity, moderate analysis', disabled: false },
            { value: 'Advanced', label: 'Advanced', description: 'Complex scenarios, deep analysis', disabled: false },
            { value: 'Expert', label: 'Expert', description: 'Highly complex, minimal guidance', disabled: false },
          ],
          allow_custom: false,
        },
        display: {
          css_classes: [],
          styles: {},
          grid: { xs: 12, sm: 6, md: 6, lg: 6 },
          disabled: false,
          readonly: false,
          auto_focus: false,
          width: '100%',
        },
        dependent_fields: [],
      },
    ];

    return {
      id: `${framework.id}-config`,
      name: `${framework.name} Case Study Configuration`,
      description: `Generate case studies using the ${framework.name} framework. ${framework.description}`,
      version: '1.0.0',
      framework: framework.name,
      category: 'case_study_generation',
      sections: [
        {
          id: 'case-basics',
          title: 'Case Study Basics',
          description: 'Basic information about the case study',
          order: 1,
          collapsible: false,
          collapsed_by_default: false,
          icon: '📚',
          fields: commonFields,
        },
        {
          id: 'framework-specific',
          title: `${framework.name} Parameters`,
          description: `Framework-specific parameters for ${framework.name} analysis`,
          order: 2,
          collapsible: false,
          collapsed_by_default: false,
          icon: framework.icon,
          fields: frameworkFields,
        },
      ],
      global_validations: [
        {
          id: 'title_complexity_match',
          name: 'Title Complexity Match',
          fields: ['case_title', 'difficulty_level'],
          expression: 'case_title.length >= (difficulty_level === "Expert" ? 20 : difficulty_level === "Advanced" ? 15 : 10)',
          message: 'Case title should reflect the complexity level',
          trigger: 'OnSubmit',
        },
      ],
      conditional_logic: [],
      defaults: {
        case_title: '',
        learning_objectives: framework.learningObjectives,
        target_audience: ['undergraduate'],
        difficulty_level: framework.complexity,
        ...Object.fromEntries(frameworkFields.map(f => [f.id, f.default_value])),
      },
      metadata: {
        tags: [framework.category.toLowerCase(), framework.id, 'case-study'],
        target_audience: ['educators', 'students'],
        difficulty_level: framework.complexity,
        estimated_minutes: framework.estimatedMinutes,
        is_template: true,
        is_active: true,
        locale: 'en',
        custom: {
          framework: framework,
          outputSections: framework.outputSections,
          keyQuestions: framework.keyQuestions,
          useCases: framework.useCases,
        },
      },
      created_at: now,
      updated_at: now,
      created_by: 'framework-mapper',
    };
  };

  // Auto-generate schema when mappings change
  useEffect(() => {
    if (autoGenerateEnabled && mappings.length > 0) {
      try {
        const schema = generateSchema();
        setGeneratedSchema(schema);
      } catch (error) {
        console.error('Error generating schema:', error);
      }
    }
  }, [mappings, autoGenerateEnabled]);

  // Map framework field types to configuration field types
  const mapFieldType = (frameworkType: string): { type: string; config?: any } => {
    switch (frameworkType) {
      case 'text': return { type: FIELD_TYPES.TEXT };
      case 'textarea': return { type: FIELD_TYPES.TEXT_AREA };
      case 'select': return { type: FIELD_TYPES.SELECT };
      case 'multiselect': return { type: FIELD_TYPES.MULTI_SELECT };
      case 'number': return { type: FIELD_TYPES.NUMBER };
      case 'date': return { type: FIELD_TYPES.DATE };
      case 'checkbox': return { type: FIELD_TYPES.CHECKBOX };
      default: return { type: FIELD_TYPES.TEXT };
    }
  };

  // Generate validations for field
  const generateValidationsForField = (field: FrameworkField) => {
    const validations: any[] = [];
    
    if (field.type === 'text' && field.label.toLowerCase().includes('name')) {
      validations.push({ type: VALIDATION_TYPES.MIN_LENGTH, config: { length: 2 } });
    }
    
    if (field.type === 'number') {
      validations.push({ type: VALIDATION_TYPES.MIN, config: { value: 0 } });
    }

    return validations;
  };

  // Update mapping
  const updateMapping = (frameworkFieldId: string, updates: Partial<FrameworkMapping>) => {
    setMappings(prev => prev.map(mapping => 
      mapping.frameworkFieldId === frameworkFieldId 
        ? { ...mapping, ...updates }
        : mapping
    ));
  };

  // Handle final configuration generation
  const handleComplete = () => {
    if (generatedSchema) {
      onMappingComplete(generatedSchema);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Framework Field Mapping
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure how {framework.name} framework fields map to form inputs
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoGenerateEnabled}
                onChange={(e) => setAutoGenerateEnabled(e.target.checked)}
              />
            }
            label="Auto-generate"
          />
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleComplete}
            disabled={!generatedSchema}
          >
            Complete Mapping
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Mapping Configuration */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MappingIcon />
                Field Mappings
              </Typography>
              
              <Stack spacing={2}>
                {mappings.map((mapping) => {
                  const frameworkField = framework.requiredFields.find(f => f.id === mapping.frameworkFieldId);
                  if (!frameworkField) return null;

                  return (
                    <Accordion key={mapping.frameworkFieldId}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Typography variant="subtitle1">{frameworkField.label}</Typography>
                          <Chip 
                            size="small" 
                            label={mapping.transformationType} 
                            color="primary" 
                            variant="outlined"
                          />
                          {mapping.isRequired && (
                            <Chip size="small" label="Required" color="error" variant="outlined" />
                          )}
                        </Box>
                      </AccordionSummary>
                      
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {frameworkField.description}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Configuration Field ID"
                              value={mapping.configFieldId}
                              onChange={(e) => updateMapping(mapping.frameworkFieldId, { configFieldId: e.target.value })}
                              size="small"
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Transformation Type</InputLabel>
                              <Select
                                value={mapping.transformationType}
                                onChange={(e) => updateMapping(mapping.frameworkFieldId, { transformationType: e.target.value as any })}
                              >
                                {TRANSFORMATION_TYPES.map(type => (
                                  <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={mapping.isRequired}
                                  onChange={(e) => updateMapping(mapping.frameworkFieldId, { isRequired: e.target.checked })}
                                />
                              }
                              label="Required Field"
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Default Value"
                              value={mapping.defaultValue || ''}
                              onChange={(e) => updateMapping(mapping.frameworkFieldId, { defaultValue: e.target.value })}
                              size="small"
                            />
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Framework Summary */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Framework Summary
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Name:</strong> {framework.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Category:</strong> {framework.category}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Complexity:</strong> {framework.complexity}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Duration:</strong> {framework.estimatedMinutes} minutes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Output Sections:</strong> {framework.outputSections.length}
                </Typography>
              </CardContent>
            </Card>

            {/* Generated Schema Preview */}
            {generatedSchema && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generated Schema
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>Sections:</strong> {generatedSchema.sections.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>Total Fields:</strong> {generatedSchema.sections.reduce((acc, section) => acc + section.fields.length, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>Validations:</strong> {generatedSchema.global_validations.length}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Schema Sections:
                  </Typography>
                  {generatedSchema.sections.map(section => (
                    <Chip 
                      key={section.id} 
                      label={`${section.title} (${section.fields.length})`}
                      size="small" 
                      sx={{ mr: 1, mb: 1 }} 
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Mapping Status */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Mapping Status
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Framework Fields: {framework.requiredFields.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mapped Fields: {mappings.filter(m => m.configFieldId).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Required Fields: {mappings.filter(m => m.isRequired).length}
                  </Typography>
                </Box>
                
                {mappings.length === framework.requiredFields.length ? (
                  <Alert severity="success">
                    All framework fields are mapped
                  </Alert>
                ) : (
                  <Alert severity="warning">
                    Some framework fields are not mapped
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};