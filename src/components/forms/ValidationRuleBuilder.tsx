// Visual builder for creating cross-field validation rules

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Chip,
  Alert,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Stack,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as TestIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  ConfigurationSchema,
  CrossFieldValidation,
  ValidationTrigger,
} from '../../types/configuration';
import { CrossFieldValidator } from './CrossFieldValidator';

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  fields: string[];
  operator: string;
  value: any;
  message: string;
  trigger: ValidationTrigger;
  isActive: boolean;
}

interface ValidationRuleBuilderProps {
  schema: ConfigurationSchema;
  existingRules?: CrossFieldValidation[];
  onRulesChange: (rules: CrossFieldValidation[]) => void;
  testData?: Record<string, any>;
}

const OPERATORS = [
  { value: 'equals', label: 'Equals', requiresValue: true },
  { value: 'notEquals', label: 'Not Equals', requiresValue: true },
  { value: 'greaterThan', label: 'Greater Than', requiresValue: true },
  { value: 'lessThan', label: 'Less Than', requiresValue: true },
  { value: 'greaterThanOrEqual', label: 'Greater Than or Equal', requiresValue: true },
  { value: 'lessThanOrEqual', label: 'Less Than or Equal', requiresValue: true },
  { value: 'isEmpty', label: 'Is Empty', requiresValue: false },
  { value: 'isNotEmpty', label: 'Is Not Empty', requiresValue: false },
  { value: 'includes', label: 'Contains', requiresValue: true },
  { value: 'sum', label: 'Sum of Fields', requiresValue: true },
  { value: 'count', label: 'Count of Fields', requiresValue: true },
  { value: 'allSelected', label: 'All Fields Selected', requiresValue: false },
  { value: 'anySelected', label: 'Any Field Selected', requiresValue: false },
  { value: 'custom', label: 'Custom Expression', requiresValue: true },
];

const TRIGGERS = [
  { value: 'OnChange' as const, label: 'On Change' },
  { value: 'OnBlur' as const, label: 'On Blur' },
  { value: 'OnSubmit' as const, label: 'On Submit' },
];

export const ValidationRuleBuilder: React.FC<ValidationRuleBuilderProps> = ({
  schema,
  existingRules = [],
  onRulesChange,
  testData = {},
}) => {
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [validator, setValidator] = useState<CrossFieldValidator | null>(null);

  // Get all available fields from schema
  const availableFields = schema.sections.flatMap(section => 
    section.fields.map(field => ({
      id: field.id,
      label: field.label,
      section: section.title,
    }))
  );

  // Initialize rules from existing validations
  useEffect(() => {
    const initialRules: ValidationRule[] = existingRules.map((validation, index) => ({
      id: validation.id || `rule-${index}`,
      name: validation.name,
      description: validation.name,
      fields: validation.fields,
      operator: 'custom',
      value: validation.expression,
      message: validation.message,
      trigger: validation.trigger,
      isActive: true,
    }));
    setRules(initialRules);
  }, [existingRules]);

  // Update validator when schema changes
  useEffect(() => {
    const updatedSchema = {
      ...schema,
      global_validations: rules.map(rule => convertRuleToValidation(rule)),
    };
    setValidator(new CrossFieldValidator(updatedSchema));
  }, [schema, rules]);

  // Convert internal rule format to CrossFieldValidation
  const convertRuleToValidation = (rule: ValidationRule): CrossFieldValidation => ({
    id: rule.id,
    name: rule.name,
    fields: rule.fields,
    expression: generateExpression(rule),
    message: rule.message,
    trigger: rule.trigger,
  });

  // Generate expression from rule
  const generateExpression = (rule: ValidationRule): string => {
    const { fields, operator, value } = rule;
    
    if (operator === 'custom') {
      return value || 'true';
    }

    if (fields.length === 0) {
      return 'true';
    }

    const fieldRef = fields[0];
    
    switch (operator) {
      case 'equals':
        return `${fieldRef} === ${JSON.stringify(value)}`;
      case 'notEquals':
        return `${fieldRef} !== ${JSON.stringify(value)}`;
      case 'greaterThan':
        return `${fieldRef} > ${value}`;
      case 'lessThan':
        return `${fieldRef} < ${value}`;
      case 'greaterThanOrEqual':
        return `${fieldRef} >= ${value}`;
      case 'lessThanOrEqual':
        return `${fieldRef} <= ${value}`;
      case 'isEmpty':
        return `isEmpty(${fieldRef})`;
      case 'isNotEmpty':
        return `isNotEmpty(${fieldRef})`;
      case 'includes':
        return `includes(${fieldRef}, ${JSON.stringify(value)})`;
      case 'sum':
        return `sum([${fields.join(', ')}]) ${value.operator || '==='} ${value.target || 0}`;
      case 'count':
        return `count([${fields.join(', ')}]) ${value.operator || '==='} ${value.target || 0}`;
      case 'allSelected':
        return fields.map(f => `isNotEmpty(${f})`).join(' && ');
      case 'anySelected':
        return fields.map(f => `isNotEmpty(${f})`).join(' || ');
      default:
        return 'true';
    }
  };

  // Add new rule
  const addRule = () => {
    const newRule: ValidationRule = {
      id: `rule-${Date.now()}`,
      name: 'New Validation Rule',
      description: '',
      fields: [],
      operator: 'equals',
      value: '',
      message: 'Validation failed',
      trigger: 'OnSubmit',
      isActive: true,
    };
    setRules([...rules, newRule]);
  };

  // Update rule
  const updateRule = (ruleId: string, updates: Partial<ValidationRule>) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  };

  // Delete rule
  const deleteRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId));
  };

  // Test rule against test data
  const testRule = async (rule: ValidationRule) => {
    if (!validator) return;

    try {
      const validation = convertRuleToValidation(rule);
      const testSchema = {
        ...schema,
        global_validations: [validation],
      };
      
      const testValidator = new CrossFieldValidator(testSchema);
      const result = await testValidator.validateCrossField({
        formData: testData,
        trigger: rule.trigger,
      });

      setTestResults({
        ...testResults,
        [rule.id]: result,
      });
    } catch (error) {
      setTestResults({
        ...testResults,
        [rule.id]: { error: error instanceof Error ? error.message : 'Test failed' },
      });
    }
  };

  // Save rules
  const saveRules = () => {
    const validations = rules
      .filter(rule => rule.isActive)
      .map(rule => convertRuleToValidation(rule));
    onRulesChange(validations);
  };

  // Render rule editor
  const renderRuleEditor = (rule: ValidationRule) => {
    const selectedOperator = OPERATORS.find(op => op.value === rule.operator);
    const testResult = testResults[rule.id];

    return (
      <Accordion key={rule.id}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Typography variant="subtitle1">{rule.name}</Typography>
            <Chip 
              size="small" 
              label={typeof rule.trigger === 'string' ? rule.trigger : 'Custom'} 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              size="small" 
              label={`${rule.fields.length} fields`} 
              color="secondary" 
              variant="outlined"
            />
            {!rule.isActive && (
              <Chip size="small" label="Disabled" color="default" />
            )}
          </Box>
        </AccordionSummary>
        
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Rule Configuration */}
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Rule Name"
                  value={rule.name}
                  onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={rule.description}
                  onChange={(e) => updateRule(rule.id, { description: e.target.value })}
                />

                <Autocomplete
                  multiple
                  options={availableFields}
                  getOptionLabel={(option) => `${option.label} (${option.section})`}
                  value={availableFields.filter(field => rule.fields.includes(field.id))}
                  onChange={(_, selected) => {
                    updateRule(rule.id, { fields: selected.map(s => s.id) });
                  }}
                  renderInput={(params) => {
                    const { InputLabelProps, ...restParams } = params;
                    return (
                      <TextField {...restParams} label="Fields" placeholder="Select fields" size="small" />
                    );
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option.label}
                        {...getTagProps({ index })}
                        size="small"
                      />
                    ))
                  }
                />

                <FormControl fullWidth>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={rule.operator}
                    onChange={(e) => updateRule(rule.id, { operator: e.target.value })}
                  >
                    {OPERATORS.map(op => (
                      <MenuItem key={op.value} value={op.value}>
                        {op.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedOperator?.requiresValue && (
                  <TextField
                    fullWidth
                    label={rule.operator === 'custom' ? 'Expression' : 'Value'}
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    multiline={rule.operator === 'custom'}
                    rows={rule.operator === 'custom' ? 3 : 1}
                    placeholder={rule.operator === 'custom' ? 'Enter JavaScript expression' : 'Enter comparison value'}
                  />
                )}

                <TextField
                  fullWidth
                  label="Error Message"
                  value={rule.message}
                  onChange={(e) => updateRule(rule.id, { message: e.target.value })}
                />

                <FormControl fullWidth>
                  <InputLabel>Trigger</InputLabel>
                  <Select
                    value={rule.trigger}
                    onChange={(e) => updateRule(rule.id, { trigger: e.target.value as ValidationTrigger })}
                  >
                    {TRIGGERS.map(trigger => (
                      <MenuItem key={trigger.value.toString()} value={trigger.value}>
                        {trigger.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Grid>

            {/* Preview & Testing */}
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Typography variant="h6">Generated Expression</Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {generateExpression(rule)}
                  </Typography>
                </Paper>

                <Button
                  variant="outlined"
                  startIcon={<TestIcon />}
                  onClick={() => testRule(rule)}
                  disabled={rule.fields.length === 0}
                >
                  Test Rule
                </Button>

                {testResult && (
                  <Alert 
                    severity={testResult.error ? 'error' : testResult.is_valid ? 'success' : 'warning'}
                  >
                    {testResult.error ? (
                      `Test Error: ${testResult.error}`
                    ) : testResult.is_valid ? (
                      'Validation passed'
                    ) : (
                      `Validation failed: ${testResult.global_errors?.join(', ') || 'Unknown error'}`
                    )}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    variant="outlined"
                    color={rule.isActive ? 'warning' : 'success'}
                    onClick={() => updateRule(rule.id, { isActive: !rule.isActive })}
                  >
                    {rule.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  
                  <IconButton
                    color="error"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Cross-Field Validation Rules</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addRule}
          >
            Add Rule
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveRules}
            disabled={rules.length === 0}
          >
            Save Rules
          </Button>
        </Box>
      </Box>

      {/* Rules List */}
      {rules.length > 0 ? (
        <Stack spacing={2}>
          {rules.map(renderRuleEditor)}
        </Stack>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Validation Rules
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create cross-field validation rules to ensure data consistency and business logic compliance.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={addRule}>
            Create First Rule
          </Button>
        </Paper>
      )}

      {/* Summary */}
      {rules.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Rules Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Typography variant="h4" color="primary.main">
                  {rules.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Rules
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="h4" color="success.main">
                  {rules.filter(r => r.isActive).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Rules
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="h4" color="warning.main">
                  {rules.filter(r => !r.isActive).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Disabled Rules
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="h4" color="info.main">
                  {new Set(rules.flatMap(r => r.fields)).size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fields Involved
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};