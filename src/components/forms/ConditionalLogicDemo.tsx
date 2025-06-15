// Demo showcasing conditional logic capabilities

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  Button,
  Divider,
  Stack,
  Tabs,
  Tab,
  CodeBlock,
} from '@mui/material';
import {
  Psychology as LogicIcon,
  Visibility as VisibilityIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { DynamicForm } from './DynamicForm';
import { ConditionalLogicBuilder } from './ConditionalLogicBuilder';
import {
  ConfigurationSchema,
  ConditionalRule,
  FIELD_TYPES,
} from '../../types/configuration';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Example schema with conditional logic
const createConditionalSchema = (): ConfigurationSchema => ({
  id: 'conditional-demo',
  name: 'Conditional Logic Demo',
  description: 'Showcase dynamic field behavior based on user input',
  version: '1.0.0',
  framework: 'Demo',
  category: 'demonstration',
  sections: [
    {
      id: 'user-type',
      title: 'User Information',
      description: 'Tell us about yourself to customize the form',
      order: 1,
      collapsible: false,
      collapsed_by_default: false,
      fields: [
        {
          id: 'user_type',
          label: 'I am a...',
          field_type: { type: FIELD_TYPES.SELECT },
          required: true,
          placeholder: 'Select your type',
          help_text: 'This will determine which additional fields appear',
          default_value: '',
          validations: [],
          options: {
            static_options: [
              { value: 'student', label: 'Student', disabled: false },
              { value: 'teacher', label: 'Teacher', disabled: false },
              { value: 'business_owner', label: 'Business Owner', disabled: false },
              { value: 'other', label: 'Other', disabled: false },
            ],
            allow_custom: false,
          },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, md: 6 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: 'full',
          },
          dependent_fields: [],
        },
        {
          id: 'experience_level',
          label: 'Experience Level',
          field_type: { type: FIELD_TYPES.RADIO },
          required: false,
          help_text: 'How experienced are you?',
          default_value: '',
          validations: [],
          options: {
            static_options: [
              { value: 'beginner', label: 'Beginner (0-1 years)', disabled: false },
              { value: 'intermediate', label: 'Intermediate (2-5 years)', disabled: false },
              { value: 'advanced', label: 'Advanced (5+ years)', disabled: false },
            ],
            allow_custom: false,
          },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, md: 6 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: 'full',
          },
          dependent_fields: [],
        },
      ],
    },
    {
      id: 'student-fields',
      title: 'Student Information',
      description: 'Additional information for students',
      order: 2,
      collapsible: true,
      collapsed_by_default: false,
      fields: [
        {
          id: 'school_name',
          label: 'School/University Name',
          field_type: { type: FIELD_TYPES.TEXT },
          required: true,
          placeholder: 'Enter your school name',
          help_text: 'Name of your educational institution',
          default_value: '',
          validations: [],
          options: { allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: 'full',
          },
          dependent_fields: [],
        },
        {
          id: 'graduation_year',
          label: 'Expected Graduation Year',
          field_type: { type: FIELD_TYPES.NUMBER },
          required: true,
          placeholder: '2025',
          help_text: 'When do you plan to graduate?',
          default_value: '',
          validations: [],
          options: { allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, md: 6 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: 'full',
          },
          dependent_fields: [],
        },
      ],
    },
    {
      id: 'teacher-fields',
      title: 'Teacher Information',
      description: 'Additional information for teachers',
      order: 3,
      collapsible: true,
      collapsed_by_default: false,
      fields: [
        {
          id: 'subject_taught',
          label: 'Subject(s) Taught',
          field_type: { type: FIELD_TYPES.MULTI_SELECT },
          required: true,
          help_text: 'What subjects do you teach?',
          default_value: [],
          validations: [],
          options: {
            static_options: [
              { value: 'math', label: 'Mathematics', disabled: false },
              { value: 'science', label: 'Science', disabled: false },
              { value: 'english', label: 'English', disabled: false },
              { value: 'history', label: 'History', disabled: false },
              { value: 'art', label: 'Art', disabled: false },
              { value: 'pe', label: 'Physical Education', disabled: false },
            ],
            allow_custom: true,
          },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: 'full',
          },
          dependent_fields: [],
        },
        {
          id: 'years_teaching',
          label: 'Years of Teaching Experience',
          field_type: { type: FIELD_TYPES.SLIDER },
          required: true,
          help_text: 'How many years have you been teaching?',
          default_value: 1,
          validations: [],
          options: { 
            allow_custom: false,
            // Slider specific config would go in field_type.config
          },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, md: 6 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: 'full',
          },
          dependent_fields: [],
        },
      ],
    },
    {
      id: 'business-fields',
      title: 'Business Information',
      description: 'Information for business owners',
      order: 4,
      collapsible: true,
      collapsed_by_default: false,
      fields: [
        {
          id: 'business_name',
          label: 'Business Name',
          field_type: { type: FIELD_TYPES.TEXT },
          required: true,
          placeholder: 'Enter your business name',
          help_text: 'Legal name of your business',
          default_value: '',
          validations: [],
          options: { allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: 'full',
          },
          dependent_fields: [],
        },
        {
          id: 'annual_revenue',
          label: 'Annual Revenue',
          field_type: { type: FIELD_TYPES.SELECT },
          required: true,
          help_text: 'Approximate annual revenue of your business',
          default_value: '',
          validations: [],
          options: {
            static_options: [
              { value: '0-50k', label: '$0 - $50,000', disabled: false },
              { value: '50k-100k', label: '$50,000 - $100,000', disabled: false },
              { value: '100k-500k', label: '$100,000 - $500,000', disabled: false },
              { value: '500k-1m', label: '$500,000 - $1,000,000', disabled: false },
              { value: '1m+', label: '$1,000,000+', disabled: false },
            ],
            allow_custom: false,
          },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, md: 6 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: 'full',
          },
          dependent_fields: [],
        },
      ],
    },
    {
      id: 'advanced-options',
      title: 'Advanced Options',
      description: 'Additional options for experienced users',
      order: 5,
      collapsible: true,
      collapsed_by_default: true,
      fields: [
        {
          id: 'custom_config',
          label: 'Custom Configuration',
          field_type: { type: FIELD_TYPES.JSON },
          required: false,
          help_text: 'Advanced JSON configuration (only for experienced users)',
          default_value: '',
          validations: [],
          options: { allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: 'full',
          },
          dependent_fields: [],
        },
      ],
    },
  ],
  global_validations: [],
  conditional_logic: [
    // Show student fields only when user_type is 'student'
    {
      id: 'show_student_fields',
      target: 'school_name',
      action: 'Show',
      condition: {
        type: 'equals',
        config: {
          field: 'user_type',
          value: 'student',
        },
      },
    },
    {
      id: 'show_graduation_year',
      target: 'graduation_year',
      action: 'Show',
      condition: {
        type: 'equals',
        config: {
          field: 'user_type',
          value: 'student',
        },
      },
    },
    // Show teacher fields only when user_type is 'teacher'
    {
      id: 'show_subject_taught',
      target: 'subject_taught',
      action: 'Show',
      condition: {
        type: 'equals',
        config: {
          field: 'user_type',
          value: 'teacher',
        },
      },
    },
    {
      id: 'show_years_teaching',
      target: 'years_teaching',
      action: 'Show',
      condition: {
        type: 'equals',
        config: {
          field: 'user_type',
          value: 'teacher',
        },
      },
    },
    // Show business fields only when user_type is 'business_owner'
    {
      id: 'show_business_name',
      target: 'business_name',
      action: 'Show',
      condition: {
        type: 'equals',
        config: {
          field: 'user_type',
          value: 'business_owner',
        },
      },
    },
    {
      id: 'show_annual_revenue',
      target: 'annual_revenue',
      action: 'Show',
      condition: {
        type: 'equals',
        config: {
          field: 'user_type',
          value: 'business_owner',
        },
      },
    },
    // Show advanced options only for intermediate/advanced users
    {
      id: 'show_custom_config',
      target: 'custom_config',
      action: 'Show',
      condition: {
        type: 'in_list',
        config: {
          field: 'experience_level',
          values: ['intermediate', 'advanced'],
        },
      },
    },
  ],
  defaults: {},
  metadata: {
    tags: ['demo', 'conditional', 'dynamic'],
    target_audience: ['developers', 'designers'],
    difficulty_level: 'Intermediate',
    estimated_minutes: 10,
    is_template: true,
    is_active: true,
    locale: 'en',
    custom: {},
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'system',
});

export const ConditionalLogicDemo: React.FC = () => {
  const [schema, setSchema] = useState(() => createConditionalSchema());
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleFormSubmit = async (data: Record<string, any>) => {
    console.log('Form submitted:', data);
    alert('Form submitted! Check console for data.');
  };

  const handleRulesChange = (rules: ConditionalRule[]) => {
    setSchema(prev => ({
      ...prev,
      conditional_logic: rules,
    }));
  };

  // Get all fields for the rule builder
  const allFields = schema.sections.flatMap(section => section.fields);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Conditional Logic Demo
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Experience dynamic forms that adapt based on user input
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Introduction */}
          <Grid item xs={12}>
            <Alert severity="info" icon={<LogicIcon />}>
              <Typography variant="body2">
                This demo showcases conditional logic in action. Fields will appear, disappear, 
                or change behavior based on your selections. Try changing the "I am a..." field 
                to see different sections appear!
              </Typography>
            </Alert>
          </Grid>

          {/* Tabs */}
          <Grid item xs={12}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab icon={<VisibilityIcon />} label="Live Demo" />
                <Tab icon={<CodeIcon />} label="Rule Builder" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              {/* Live Form Demo */}
              <DynamicForm
                schema={schema}
                initialData={{}}
                onSubmit={handleFormSubmit}
                showProgress={true}
                mode="create"
              />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Rule Builder */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Conditional Logic Rules
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  These are the rules that control when fields appear or disappear. 
                  You can modify them to see how the form behavior changes.
                </Typography>
              </Box>

              <ConditionalLogicBuilder
                rules={schema.conditional_logic}
                fields={allFields}
                onChange={handleRulesChange}
              />
            </TabPanel>
          </Grid>

          {/* Current Form Data Display */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Form Data
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.875rem' }}
                >
                  <pre>{JSON.stringify(formData, null, 2)}</pre>
                </Paper>
              </CardContent>
            </Card>
          </Grid>

          {/* Examples Section */}
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              How It Works
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Show/Hide Fields
                    </Typography>
                    <Typography variant="body2">
                      Fields can be dynamically shown or hidden based on the values 
                      of other fields. For example, student-specific fields only appear 
                      when "Student" is selected.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Complex Conditions
                    </Typography>
                    <Typography variant="body2">
                      Use logical operators (AND, OR, NOT) and various comparison types 
                      (equals, contains, greater than, etc.) to create sophisticated 
                      conditional logic.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Real-time Updates
                    </Typography>
                    <Typography variant="body2">
                      All conditions are evaluated in real-time as users interact 
                      with the form, providing immediate feedback and a responsive 
                      user experience.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default ConditionalLogicDemo;