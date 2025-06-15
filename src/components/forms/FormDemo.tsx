// Demo page for dynamic form rendering system

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  Grid,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { DynamicForm } from './DynamicForm';
import {
  ConfigurationSchema,
  FIELD_TYPES,
  VALIDATION_TYPES,
} from '../../types/configuration';

// Sample configuration schema for demo
const createSampleSchema = (): ConfigurationSchema => ({
  id: 'demo-form',
  name: 'Business Case Study Configuration',
  description: 'Configure parameters for generating a business case study',
  version: '1.0.0',
  framework: 'SWOT Analysis',
  category: 'case_study_generation',
  sections: [
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Provide basic details about the case study',
      order: 1,
      collapsible: false,
      collapsed_by_default: false,
      icon: '📋',
      fields: [
        {
          id: 'title',
          label: 'Case Study Title',
          field_type: { type: FIELD_TYPES.TEXT },
          required: true,
          placeholder: 'Enter a descriptive title',
          help_text: 'A clear, engaging title for your case study',
          default_value: '',
          validations: [
            { type: VALIDATION_TYPES.REQUIRED },
            { type: VALIDATION_TYPES.MIN_LENGTH, config: { length: 5 } },
            { type: VALIDATION_TYPES.MAX_LENGTH, config: { length: 100 } },
          ],
          options: { static_options: [], allow_custom: true },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 12, md: 12, lg: 12 },
            disabled: false,
            readonly: false,
            auto_focus: true,
            width: '100%',
          },
          dependent_fields: [],
        },
        {
          id: 'industry',
          label: 'Industry',
          field_type: { type: FIELD_TYPES.SELECT },
          required: true,
          help_text: 'Select the primary industry for this case study',
          default_value: '',
          validations: [{ type: VALIDATION_TYPES.REQUIRED }],
          options: {
            static_options: [
              { value: 'technology', label: 'Technology', description: '', disabled: false },
              { value: 'healthcare', label: 'Healthcare', description: '', disabled: false },
              { value: 'finance', label: 'Finance', description: '', disabled: false },
              { value: 'retail', label: 'Retail', description: '', disabled: false },
              { value: 'manufacturing', label: 'Manufacturing', description: '', disabled: false },
              { value: 'consulting', label: 'Consulting', description: '', disabled: false },
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
          dependent_fields: ['company_size', 'business_model'],
        },
        {
          id: 'company_size',
          label: 'Company Size',
          field_type: { type: FIELD_TYPES.RADIO },
          required: true,
          help_text: 'Select the size of the company',
          default_value: '',
          validations: [{ type: VALIDATION_TYPES.REQUIRED }],
          options: {
            static_options: [
              { value: 'startup', label: 'Startup (1-10 employees)', description: '', disabled: false },
              { value: 'small', label: 'Small (11-50 employees)', description: '', disabled: false },
              { value: 'medium', label: 'Medium (51-200 employees)', description: '', disabled: false },
              { value: 'large', label: 'Large (200+ employees)', description: '', disabled: false },
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
      ],
    },
    {
      id: 'content-settings',
      title: 'Content Settings',
      description: 'Configure what content to include in the case study',
      order: 2,
      collapsible: true,
      collapsed_by_default: false,
      icon: '⚙️',
      fields: [
        {
          id: 'include_sections',
          label: 'Include Sections',
          field_type: { type: FIELD_TYPES.CHECKBOX_GROUP },
          required: true,
          help_text: 'Select which sections to include in the case study',
          default_value: ['background', 'problem'],
          validations: [{ type: VALIDATION_TYPES.REQUIRED }],
          options: {
            static_options: [
              { value: 'background', label: 'Background & Context', description: '', disabled: false },
              { value: 'problem', label: 'Problem Statement', description: '', disabled: false },
              { value: 'analysis', label: 'Analysis & Data', description: '', disabled: false },
              { value: 'solutions', label: 'Proposed Solutions', description: '', disabled: false },
              { value: 'implementation', label: 'Implementation Plan', description: '', disabled: false },
              { value: 'results', label: 'Results & Outcomes', description: '', disabled: false },
            ],
            allow_custom: false,
          },
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
          id: 'complexity_level',
          label: 'Complexity Level',
          field_type: { type: FIELD_TYPES.SLIDER, config: { min: 1, max: 5, step: 1, marks: true } },
          required: true,
          help_text: 'Set the complexity level for the case study (1 = Simple, 5 = Very Complex)',
          default_value: 3,
          validations: [
            { type: VALIDATION_TYPES.REQUIRED },
            { type: VALIDATION_TYPES.MIN, config: { value: 1 } },
            { type: VALIDATION_TYPES.MAX, config: { value: 5 } },
          ],
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
        },
        {
          id: 'word_count',
          label: 'Target Word Count',
          field_type: { type: FIELD_TYPES.NUMBER },
          required: true,
          placeholder: 'e.g., 1500',
          help_text: 'Approximate word count for the case study',
          default_value: 1500,
          validations: [
            { type: VALIDATION_TYPES.REQUIRED },
            { type: VALIDATION_TYPES.MIN, config: { value: 500 } },
            { type: VALIDATION_TYPES.MAX, config: { value: 10000 } },
          ],
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
        },
      ],
    },
    {
      id: 'advanced-options',
      title: 'Advanced Options',
      description: 'Additional configuration options',
      order: 3,
      collapsible: true,
      collapsed_by_default: true,
      icon: '🔧',
      fields: [
        {
          id: 'include_references',
          label: 'Include References',
          field_type: { type: FIELD_TYPES.TOGGLE },
          required: false,
          help_text: 'Include academic or industry references',
          default_value: false,
          validations: [],
          options: { static_options: [], allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 6, md: 4, lg: 4 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: '100%',
          },
          dependent_fields: [],
        },
        {
          id: 'difficulty_rating',
          label: 'Difficulty Rating',
          field_type: { type: FIELD_TYPES.RATING, config: { max: 5, precision: 1 } },
          required: false,
          help_text: 'Rate the difficulty for students',
          default_value: 3,
          validations: [],
          options: { static_options: [], allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 6, md: 4, lg: 4 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: '100%',
          },
          dependent_fields: [],
        },
        {
          id: 'tags',
          label: 'Tags',
          field_type: { type: FIELD_TYPES.FIELD_ARRAY },
          required: false,
          help_text: 'Add tags to categorize this case study',
          default_value: [],
          validations: [],
          options: { static_options: [], allow_custom: true },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 12, md: 4, lg: 4 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: '100%',
          },
          dependent_fields: [],
        },
      ],
    },
  ],
  global_validations: [],
  conditional_logic: [],
  defaults: {
    title: '',
    industry: '',
    company_size: '',
    include_sections: ['background', 'problem'],
    complexity_level: 3,
    word_count: 1500,
    include_references: false,
    difficulty_rating: 3,
    tags: [],
  },
  metadata: {
    tags: ['demo', 'business', 'case-study'],
    target_audience: ['educators', 'students'],
    difficulty_level: 'Intermediate',
    estimated_minutes: 15,
    is_template: false,
    is_active: true,
    locale: 'en',
    custom: {},
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'demo',
});

export const FormDemo: React.FC = () => {
  const [schema] = useState<ConfigurationSchema>(createSampleSchema());
  const [validationResults, setValidationResults] = useState<any>(null);
  const [submissionResult, setSubmissionResult] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, any>) => {
    setSubmissionResult(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmissionResult('Form submitted successfully!');
      console.log('Form submitted with data:', data);
    } catch (error) {
      setSubmissionResult('Failed to submit form. Please try again.');
      console.error('Form submission error:', error);
    }
  };

  const handleSave = async (data: Record<string, any>) => {
    console.log('Auto-saving form data:', data);
    // Simulate auto-save
  };

  const handleValidationChange = (results: any) => {
    setValidationResults(results);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dynamic Form Rendering System Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          This demo showcases the dynamic form rendering system that creates forms based on configuration schemas.
          The form includes various field types, validation rules, conditional logic, and real-time validation.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Form */}
        <Grid item xs={12} lg={8}>
          <DynamicForm
            schema={schema}
            initialData={schema.defaults}
            onSubmit={handleSubmit}
            onSave={handleSave}
            onValidationChange={handleValidationChange}
            showProgress={true}
            mode="create"
          />
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Schema Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Schema Information
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Name:</strong> {schema.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Framework:</strong> {schema.framework}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Category:</strong> {schema.category.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Sections:</strong> {schema.sections.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Total Fields:</strong> {schema.sections.reduce((count, section) => count + section.fields.length, 0)}
                </Typography>
              </CardContent>
            </Card>

            {/* Validation Status */}
            {validationResults && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Validation Status
                  </Typography>
                  
                  {validationResults.is_valid ? (
                    <Alert severity="success">
                      Form is valid and ready to submit
                    </Alert>
                  ) : (
                    <Alert severity="error">
                      Form has validation errors
                    </Alert>
                  )}

                  {Object.keys(validationResults.field_errors).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Field Errors:
                      </Typography>
                      {Object.entries(validationResults.field_errors).map(([field, errors]: [string, any]) => (
                        <Typography key={field} variant="body2" color="error.main">
                          • {field}: {errors.join(', ')}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {validationResults.global_errors.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Global Errors:
                      </Typography>
                      {validationResults.global_errors.map((error: string, index: number) => (
                        <Typography key={index} variant="body2" color="error.main">
                          • {error}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submission Result */}
            {submissionResult && (
              <Alert severity={submissionResult.includes('successfully') ? 'success' : 'error'}>
                {submissionResult}
              </Alert>
            )}

            {/* Form Data Preview */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Form Data Preview
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Current form values (updates in real-time):
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                  <Typography variant="body2" color="text.secondary">
                    Form data will appear here as you fill out the form...
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};