// Dynamic form rendering system based on configuration schema

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  ConfigurationSchema,
  FieldSection,
  ValidationResults,
} from '../../types/configuration';
import { DynamicField } from './DynamicField';
import { FormValidationEngine } from './FormValidationEngine';

export interface DynamicFormProps {
  schema: ConfigurationSchema;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onSave?: (data: Record<string, any>) => Promise<void>;
  onValidationChange?: (results: ValidationResults) => void;
  disabled?: boolean;
  showProgress?: boolean;
  mode?: 'create' | 'edit' | 'view';
}

export interface FormState {
  data: Record<string, any>;
  errors: Record<string, string[]>;
  touched: Set<string>;
  isValid: boolean;
  isSubmitting: boolean;
  currentStep: number;
  visibleSections: Set<string>;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  schema,
  initialData = {},
  onSubmit,
  onSave,
  onValidationChange,
  disabled = false,
  showProgress = false,
  mode = 'create',
}) => {
  const [formState, setFormState] = useState<FormState>({
    data: { ...schema.defaults, ...initialData },
    errors: {},
    touched: new Set(),
    isValid: false,
    isSubmitting: false,
    currentStep: 0,
    visibleSections: new Set(schema.sections.map(s => s.id)),
  });

  const [validationEngine] = useState(() => new FormValidationEngine(schema));
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Validate form data
  const validateForm = useCallback(async () => {
    const results = await validationEngine.validateAll(formState.data);
    
    setFormState(prev => ({
      ...prev,
      errors: results.field_errors,
      isValid: results.is_valid,
    }));

    onValidationChange?.(results);
    return results;
  }, [formState.data, validationEngine, onValidationChange]);

  // Handle field value change
  const handleFieldChange = useCallback(async (fieldId: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      data: { ...prev.data, [fieldId]: value },
      touched: new Set([...prev.touched, fieldId]),
    }));

    // Clear existing auto-save timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new auto-save timer if onSave is provided
    if (onSave) {
      const timer = setTimeout(() => {
        onSave({ ...formState.data, [fieldId]: value });
      }, 2000);
      setAutoSaveTimer(timer);
    }
  }, [formState.data, onSave, autoSaveTimer]);

  // Handle field blur
  const handleFieldBlur = useCallback(async (fieldId: string) => {
    const results = await validationEngine.validateFieldWithDependencies(fieldId, formState.data, 'OnBlur');
    
    setFormState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        ...results.field_errors,
      },
    }));
  }, [formState.data, validationEngine]);

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setFormState(prev => ({ ...prev, isSubmitting: true }));
    
    try {
      const results = await validateForm();
      
      if (results.is_valid) {
        await onSubmit(formState.data);
      }
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Update visibility based on conditional logic
  const updateVisibility = useCallback(() => {
    const visibleSections = new Set<string>();
    
    schema.sections.forEach(section => {
      if (validationEngine.evaluateCondition(section.visibility_conditions, formState.data)) {
        visibleSections.add(section.id);
      }
    });

    setFormState(prev => ({
      ...prev,
      visibleSections,
    }));
  }, [schema.sections, formState.data, validationEngine]);

  // Validate form when data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      validateForm();
      updateVisibility();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [formState.data, validateForm, updateVisibility]);

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // Calculate form progress
  const getFormProgress = (): number => {
    const totalFields = schema.sections.reduce((count, section) => count + section.fields.length, 0);
    const completedFields = Object.keys(formState.data).filter(key => {
      const value = formState.data[key];
      return value !== undefined && value !== null && value !== '';
    }).length;
    
    return totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
  };

  // Get visible sections
  const getVisibleSections = (): FieldSection[] => {
    return schema.sections
      .filter(section => formState.visibleSections.has(section.id))
      .sort((a, b) => a.order - b.order);
  };

  // Render section
  const renderSection = (section: FieldSection) => {
    const sectionFields = section.fields.filter(field => 
      validationEngine.evaluateCondition(field.visibility_conditions, formState.data)
    );

    if (sectionFields.length === 0) {
      return null;
    }

    const content = (
      <Stack spacing={3}>
        {section.description && (
          <Typography variant="body2" color="text.secondary">
            {section.description}
          </Typography>
        )}
        
        {sectionFields.map(field => (
          <DynamicField
            key={field.id}
            field={field}
            value={formState.data[field.id]}
            error={formState.errors[field.id]?.[0] || undefined}
            touched={formState.touched.has(field.id)}
            onChange={(value) => handleFieldChange(field.id, value)}
            onBlur={() => handleFieldBlur(field.id)}
            disabled={disabled}
            formData={formState.data}
            mode={mode}
          />
        ))}
      </Stack>
    );

    if (section.collapsible) {
      return (
        <Accordion
          key={section.id}
          defaultExpanded={!section.collapsed_by_default}
          variant="outlined"
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {section.icon && <span>{section.icon}</span>}
              <Typography variant="h6">{section.title}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {content}
          </AccordionDetails>
        </Accordion>
      );
    }

    return (
      <Paper key={section.id} variant="outlined" sx={{ p: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {section.icon && <span style={{ marginRight: 8 }}>{section.icon}</span>}
            {section.title}
          </Typography>
        </Box>
        {content}
      </Paper>
    );
  };

  const visibleSections = getVisibleSections();
  const progress = getFormProgress();

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Form Header */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {schema.name}
        </Typography>
        
        {schema.description && (
          <Typography variant="body1" color="text.secondary" paragraph>
            {schema.description}
          </Typography>
        )}

        {/* Progress Indicator */}
        {showProgress && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Form Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {/* Validation Summary */}
        {formState.touched.size > 0 && !formState.isValid && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Please correct the errors below before submitting.
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Form Sections */}
      <Stack spacing={3}>
        {visibleSections.map(renderSection)}
      </Stack>

      {/* Form Actions */}
      {mode !== 'view' && (
        <Paper variant="outlined" sx={{ p: 3, mt: 3, position: 'sticky', bottom: 0, zIndex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {formState.isValid ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                  <CheckCircleIcon fontSize="small" />
                  <Typography variant="body2">Form is valid</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                  <ErrorIcon fontSize="small" />
                  <Typography variant="body2">Form has errors</Typography>
                </Box>
              )}
            </Box>

            <Stack direction="row" spacing={2}>
              {onSave && (
                <Button
                  variant="outlined"
                  onClick={() => onSave(formState.data)}
                  disabled={disabled || formState.isSubmitting}
                  startIcon={<SaveIcon />}
                >
                  Save Draft
                </Button>
              )}
              
              <Button
                type="submit"
                variant="contained"
                disabled={disabled || !formState.isValid || formState.isSubmitting}
                startIcon={formState.isSubmitting ? <CircularProgress size={16} /> : undefined}
              >
                {formState.isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}
    </Box>
  );
};