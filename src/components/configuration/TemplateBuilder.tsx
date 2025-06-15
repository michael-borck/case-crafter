// Template builder for creating custom configuration templates

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Stack,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import {
  ConfigurationSchema,
  FieldDefinition,
  SectionDefinition,
  FIELD_TYPES,
} from '../../types/configuration';

interface TemplateBuilderProps {
  initialSchema?: ConfigurationSchema;
  onSave?: (schema: ConfigurationSchema) => void;
  onPreview?: (schema: ConfigurationSchema) => void;
}

const BUILDER_STEPS = [
  'Basic Information',
  'Sections & Fields',
  'Validation Rules',
  'Conditional Logic',
  'Preview & Save',
];

const FIELD_TYPE_OPTIONS = [
  { value: FIELD_TYPES.TEXT, label: 'Text Input', description: 'Single line text input' },
  { value: FIELD_TYPES.TEXT_AREA, label: 'Text Area', description: 'Multi-line text input' },
  { value: FIELD_TYPES.NUMBER, label: 'Number', description: 'Numeric input' },
  { value: FIELD_TYPES.EMAIL, label: 'Email', description: 'Email address input' },
  { value: FIELD_TYPES.URL, label: 'URL', description: 'Web address input' },
  { value: FIELD_TYPES.DATE, label: 'Date', description: 'Date picker' },
  { value: FIELD_TYPES.TIME, label: 'Time', description: 'Time picker' },
  { value: FIELD_TYPES.DATE_TIME, label: 'Date & Time', description: 'Date and time picker' },
  { value: FIELD_TYPES.SELECT, label: 'Dropdown', description: 'Single selection dropdown' },
  { value: FIELD_TYPES.MULTI_SELECT, label: 'Multi-Select', description: 'Multiple selection dropdown' },
  { value: FIELD_TYPES.RADIO, label: 'Radio Buttons', description: 'Single choice from options' },
  { value: FIELD_TYPES.CHECKBOX, label: 'Checkbox', description: 'Boolean true/false input' },
  { value: FIELD_TYPES.CHECKBOX_GROUP, label: 'Checkbox Group', description: 'Multiple checkboxes' },
  { value: FIELD_TYPES.SLIDER, label: 'Slider', description: 'Range slider input' },
  { value: FIELD_TYPES.RATING, label: 'Rating', description: 'Star rating input' },
  { value: FIELD_TYPES.FILE_UPLOAD, label: 'File Upload', description: 'File selection input' },
  { value: FIELD_TYPES.COLOR, label: 'Color Picker', description: 'Color selection input' },
  { value: FIELD_TYPES.RICH_TEXT, label: 'Rich Text Editor', description: 'Formatted text editor' },
  { value: FIELD_TYPES.JSON, label: 'JSON Editor', description: 'Structured data editor' },
  { value: FIELD_TYPES.FIELD_ARRAY, label: 'Dynamic List', description: 'Repeatable field list' },
];


export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  initialSchema,
  onSave,
  onPreview,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [schema, setSchema] = useState<ConfigurationSchema>(
    initialSchema || {
      id: '',
      name: '',
      description: '',
      version: '1.0.0',
      framework: '',
      category: '',
      sections: [],
      global_validations: [],
      conditional_logic: [],
      defaults: {},
      metadata: {
        tags: [],
        target_audience: [],
        difficulty_level: 'Intermediate',
        estimated_minutes: 60,
        is_template: true,
        is_active: true,
        locale: 'en',
        custom: {},
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'template-builder',
    }
  );

  const [currentSection, setCurrentSection] = useState<SectionDefinition | null>(null);
  const [currentField, setCurrentField] = useState<FieldDefinition | null>(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSave = () => {
    try {
      // Validate schema
      if (!schema.name || !schema.description) {
        setError('Name and description are required');
        return;
      }

      if (schema.sections.length === 0) {
        setError('At least one section is required');
        return;
      }

      // Update timestamps
      const updatedSchema = {
        ...schema,
        id: schema.id || `template-${Date.now()}`,
        updated_at: new Date().toISOString(),
      };

      onSave?.(updatedSchema);
      setError(null);
    } catch (err) {
      setError('Failed to save template');
      console.error('Error saving template:', err);
    }
  };

  const handlePreview = () => {
    onPreview?.(schema);
  };

  // Section Management
  const handleAddSection = () => {
    setCurrentSection({
      id: '',
      title: '',
      description: '',
      order: schema.sections.length + 1,
      collapsible: false,
      collapsed_by_default: false,
      icon: '',
      fields: [],
    });
    setSectionDialogOpen(true);
  };

  const handleEditSection = (section: SectionDefinition) => {
    setCurrentSection({ ...section });
    setSectionDialogOpen(true);
  };

  const handleSaveSection = () => {
    if (!currentSection) return;

    const sectionWithId = {
      ...currentSection,
      id: currentSection.id || `section-${Date.now()}`,
    };

    if (currentSection.id) {
      // Update existing section
      setSchema(prev => ({
        ...prev,
        sections: prev.sections.map(s => 
          s.id === currentSection.id ? sectionWithId : s
        ),
      }));
    } else {
      // Add new section
      setSchema(prev => ({
        ...prev,
        sections: [...prev.sections, sectionWithId],
      }));
    }

    setSectionDialogOpen(false);
    setCurrentSection(null);
  };

  const handleDeleteSection = (sectionId: string) => {
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId),
    }));
  };

  // Field Management
  const handleAddField = () => {
    setCurrentField({
      id: '',
      label: '',
      field_type: { type: FIELD_TYPES.TEXT },
      required: false,
      placeholder: '',
      help_text: '',
      default_value: '',
      validations: [],
      options: { static_options: [], allow_custom: false },
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
    });
    setFieldDialogOpen(true);
  };

  const handleEditField = (field: FieldDefinition) => {
    setCurrentField({ ...field });
    setFieldDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!currentField || schema.sections.length === 0) return;

    const fieldWithId = {
      ...currentField,
      id: currentField.id || `field-${Date.now()}`,
    };

    const targetSectionId = schema.sections[0]?.id; // For now, add to first section
    if (!targetSectionId) return;

    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === targetSectionId) {
          if (currentField.id) {
            // Update existing field
            return {
              ...section,
              fields: section.fields.map(f => 
                f.id === currentField.id ? fieldWithId : f
              ),
            };
          } else {
            // Add new field
            return {
              ...section,
              fields: [...section.fields, fieldWithId],
            };
          }
        }
        return section;
      }),
    }));

    setFieldDialogOpen(false);
    setCurrentField(null);
  };

  const handleDeleteField = (sectionId: string, fieldId: string) => {
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            fields: section.fields.filter(f => f.id !== fieldId),
          };
        }
        return section;
      }),
    }));
  };

  const renderBasicInformation = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Template Information
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Template Name"
              value={schema.name}
              onChange={(e) => setSchema(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={schema.description}
              onChange={(e) => setSchema(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              required
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Framework"
              value={schema.framework}
              onChange={(e) => setSchema(prev => ({ ...prev, framework: e.target.value }))}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={schema.category}
                onChange={(e) => setSchema(prev => ({ ...prev, category: e.target.value }))}
                label="Category"
              >
                <MenuItem value="case_study_generation">Case Study Generation</MenuItem>
                <MenuItem value="assessment_tools">Assessment Tools</MenuItem>
                <MenuItem value="educational_content">Educational Content</MenuItem>
                <MenuItem value="research_methodology">Research Methodology</MenuItem>
                <MenuItem value="business_analysis">Business Analysis</MenuItem>
                <MenuItem value="custom_workflow">Custom Workflow</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Difficulty Level</InputLabel>
              <Select
                value={schema.metadata.difficulty_level || 'Intermediate'}
                onChange={(e) => setSchema(prev => ({
                  ...prev,
                  metadata: { ...prev.metadata, difficulty_level: e.target.value as string }
                }))}
                label="Difficulty Level"
              >
                <MenuItem value="Beginner">Beginner</MenuItem>
                <MenuItem value="Intermediate">Intermediate</MenuItem>
                <MenuItem value="Advanced">Advanced</MenuItem>
                <MenuItem value="Expert">Expert</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Estimated Minutes"
              type="number"
              value={schema.metadata.estimated_minutes}
              onChange={(e) => setSchema(prev => ({
                ...prev,
                metadata: { ...prev.metadata, estimated_minutes: parseInt(e.target.value) }
              }))}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Tags (comma-separated)"
              value={schema.metadata.tags.join(', ')}
              onChange={(e) => setSchema(prev => ({
                ...prev,
                metadata: { 
                  ...prev.metadata, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                }
              }))}
              placeholder="e.g., business, strategy, analysis"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderSectionsAndFields = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Sections & Fields
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddSection}
        >
          Add Section
        </Button>
      </Box>

      {schema.sections.length === 0 ? (
        <Alert severity="info">
          No sections created yet. Add your first section to start building your template.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {schema.sections.map((section) => (
            <Accordion key={section.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <DragIcon sx={{ color: 'text.secondary' }} />
                  <Typography variant="h6">{section.title}</Typography>
                  <Chip 
                    size="small" 
                    label={`${section.fields.length} fields`}
                    color="primary"
                    variant="outlined"
                  />
                  <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSection(section);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSection(section.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {section.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">Fields</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddField}
                    >
                      Add Field
                    </Button>
                  </Box>
                  
                  {section.fields.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      No fields in this section. Add fields to capture user input.
                    </Alert>
                  ) : (
                    <Grid container spacing={2}>
                      {section.fields.map((field) => (
                        <Grid item xs={12} md={6} key={field.id}>
                          <Card variant="outlined">
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2">{field.label}</Typography>
                                <Box>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditField(field)}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteField(section.id, field.id)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                Type: {FIELD_TYPE_OPTIONS.find(opt => opt.value === field.field_type.type)?.label}
                              </Typography>
                              {field.required && (
                                <Chip label="Required" size="small" color="error" variant="outlined" sx={{ mt: 1 }} />
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </Box>
  );

  const renderValidationRules = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Global Validation Rules
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define cross-field validation rules that apply to multiple fields.
        </Typography>
        
        {/* Placeholder for validation rule builder */}
        <Alert severity="info">
          Global validation rules configuration will be implemented here.
          Individual field validations are configured in the field settings.
        </Alert>
      </CardContent>
    </Card>
  );

  const renderConditionalLogic = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Conditional Logic
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configure when fields or sections should be shown or hidden based on other field values.
        </Typography>
        
        {/* Placeholder for conditional logic builder */}
        <Alert severity="info">
          Conditional logic configuration will be implemented here.
          This allows fields to show/hide based on other field values.
        </Alert>
      </CardContent>
    </Card>
  );

  const renderPreview = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Template Summary
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Name:</strong> {schema.name}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Framework:</strong> {schema.framework}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Category:</strong> {schema.category}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Difficulty:</strong> {schema.metadata.difficulty_level}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                <strong>Description:</strong> {schema.description}
              </Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" color="text.secondary">
            <strong>Sections:</strong> {schema.sections.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Total Fields:</strong> {schema.sections.reduce((acc, section) => acc + section.fields.length, 0)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Estimated Time:</strong> {schema.metadata.estimated_minutes} minutes
          </Typography>
        </CardContent>
      </Card>
      
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button
          variant="outlined"
          startIcon={<PreviewIcon />}
          onClick={handlePreview}
          size="large"
        >
          Preview Template
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          size="large"
        >
          Save Template
        </Button>
      </Stack>
    </Box>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: return renderBasicInformation();
      case 1: return renderSectionsAndFields();
      case 2: return renderValidationRules();
      case 3: return renderConditionalLogic();
      case 4: return renderPreview();
      default: return 'Unknown step';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Template Builder
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Stepper activeStep={activeStep} orientation="horizontal">
          {BUILDER_STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Box sx={{ mb: 4 }}>
        {renderStepContent(activeStep)}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        
        <Button
          variant="contained"
          onClick={activeStep === BUILDER_STEPS.length - 1 ? handleSave : handleNext}
        >
          {activeStep === BUILDER_STEPS.length - 1 ? 'Save Template' : 'Next'}
        </Button>
      </Box>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onClose={() => setSectionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentSection?.id ? 'Edit Section' : 'Add Section'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Section Title"
              value={currentSection?.title || ''}
              onChange={(e) => setCurrentSection(prev => prev ? { ...prev, title: e.target.value } : null)}
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              value={currentSection?.description || ''}
              onChange={(e) => setCurrentSection(prev => prev ? { ...prev, description: e.target.value } : null)}
              multiline
              rows={2}
            />
            
            <TextField
              fullWidth
              label="Icon (emoji or text)"
              value={currentSection?.icon || ''}
              onChange={(e) => setCurrentSection(prev => prev ? { ...prev, icon: e.target.value } : null)}
              placeholder="📊"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={currentSection?.collapsible || false}
                  onChange={(e) => setCurrentSection(prev => prev ? { ...prev, collapsible: e.target.checked } : null)}
                />
              }
              label="Collapsible Section"
            />
            
            {currentSection?.collapsible && (
              <FormControlLabel
                control={
                  <Switch
                    checked={currentSection?.collapsed_by_default || false}
                    onChange={(e) => setCurrentSection(prev => prev ? { ...prev, collapsed_by_default: e.target.checked } : null)}
                  />
                }
                label="Collapsed by Default"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveSection} 
            variant="contained"
            disabled={!currentSection?.title}
          >
            {currentSection?.id ? 'Update' : 'Add'} Section
          </Button>
        </DialogActions>
      </Dialog>

      {/* Field Dialog */}
      <Dialog open={fieldDialogOpen} onClose={() => setFieldDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {currentField?.id ? 'Edit Field' : 'Add Field'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Field Label"
                value={currentField?.label || ''}
                onChange={(e) => setCurrentField(prev => prev ? { ...prev, label: e.target.value } : null)}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Field Type</InputLabel>
                <Select
                  value={currentField?.field_type.type || ''}
                  onChange={(e) => setCurrentField(prev => prev ? { 
                    ...prev, 
                    field_type: { type: e.target.value }
                  } : null)}
                  label="Field Type"
                >
                  {FIELD_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box>
                        <Typography variant="body1">{option.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Help Text"
                value={currentField?.help_text || ''}
                onChange={(e) => setCurrentField(prev => prev ? { ...prev, help_text: e.target.value } : null)}
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Placeholder"
                value={currentField?.placeholder || ''}
                onChange={(e) => setCurrentField(prev => prev ? { ...prev, placeholder: e.target.value } : null)}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Default Value"
                value={currentField?.default_value || ''}
                onChange={(e) => setCurrentField(prev => prev ? { ...prev, default_value: e.target.value } : null)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentField?.required || false}
                    onChange={(e) => setCurrentField(prev => prev ? { ...prev, required: e.target.checked } : null)}
                  />
                }
                label="Required Field"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveField} 
            variant="contained"
            disabled={!currentField?.label || !currentField?.field_type.type}
          >
            {currentField?.id ? 'Update' : 'Add'} Field
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};