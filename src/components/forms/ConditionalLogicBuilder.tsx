// Visual builder for creating conditional logic rules

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Stack,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Psychology as LogicIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import {
  ConditionalRule,
  ConditionalExpression,
  ConditionalAction,
  FieldDefinition,
  OptionItem,
} from '../../types/configuration';

interface ConditionalLogicBuilderProps {
  rules: ConditionalRule[];
  fields: FieldDefinition[];
  onChange: (rules: ConditionalRule[]) => void;
  disabled?: boolean;
}

interface RuleBuilderProps {
  rule: ConditionalRule;
  fields: FieldDefinition[];
  onChange: (rule: ConditionalRule) => void;
  onDelete: () => void;
  disabled?: boolean;
}

interface ExpressionBuilderProps {
  expression: ConditionalExpression;
  fields: FieldDefinition[];
  onChange: (expression: ConditionalExpression) => void;
  disabled?: boolean;
}

const CONDITION_TYPES = [
  { value: 'equals', label: 'Equals', description: 'Field value equals specified value' },
  { value: 'not_equals', label: 'Not Equals', description: 'Field value does not equal specified value' },
  { value: 'greater_than', label: 'Greater Than', description: 'Field value is greater than specified value' },
  { value: 'less_than', label: 'Less Than', description: 'Field value is less than specified value' },
  { value: 'greater_equal', label: 'Greater Than or Equal', description: 'Field value is greater than or equal to specified value' },
  { value: 'less_equal', label: 'Less Than or Equal', description: 'Field value is less than or equal to specified value' },
  { value: 'contains', label: 'Contains', description: 'Field value contains specified text' },
  { value: 'regex', label: 'Matches Pattern', description: 'Field value matches regular expression pattern' },
  { value: 'is_empty', label: 'Is Empty', description: 'Field value is empty or null' },
  { value: 'is_not_empty', label: 'Is Not Empty', description: 'Field value is not empty' },
  { value: 'in_list', label: 'In List', description: 'Field value is in specified list' },
  { value: 'not_in_list', label: 'Not In List', description: 'Field value is not in specified list' },
  { value: 'and', label: 'AND (All Conditions)', description: 'All nested conditions must be true' },
  { value: 'or', label: 'OR (Any Condition)', description: 'At least one nested condition must be true' },
  { value: 'not', label: 'NOT (Inverse)', description: 'Nested condition must be false' },
];

const ACTION_TYPES = [
  { value: 'Show', label: 'Show Field', icon: <VisibilityIcon />, description: 'Make field visible' },
  { value: 'Hide', label: 'Hide Field', icon: <VisibilityOffIcon />, description: 'Hide field from view' },
  { value: 'Enable', label: 'Enable Field', icon: <LockOpenIcon />, description: 'Enable field for input' },
  { value: 'Disable', label: 'Disable Field', icon: <LockIcon />, description: 'Disable field input' },
  { value: 'SetValue', label: 'Set Value', icon: <LogicIcon />, description: 'Set field to specific value' },
  { value: 'ClearValue', label: 'Clear Value', icon: <LogicIcon />, description: 'Clear field value' },
  { value: 'ShowError', label: 'Show Error', icon: <LogicIcon />, description: 'Display error message' },
  { value: 'SetOptions', label: 'Set Options', icon: <LogicIcon />, description: 'Override field options' },
];

const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({
  expression,
  fields,
  onChange,
  disabled = false,
}) => {
  const [expressionType, setExpressionType] = useState(expression.type);
  const [config, setConfig] = useState(expression.config || {});

  useEffect(() => {
    onChange({
      type: expressionType,
      config: Object.keys(config).length > 0 ? config : undefined,
    });
  }, [expressionType, config, onChange]);

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const selectedCondition = CONDITION_TYPES.find(c => c.value === expressionType);
  const isLogicalOperator = ['and', 'or', 'not'].includes(expressionType);
  const needsValue = !['is_empty', 'is_not_empty'].includes(expressionType);

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Condition Type</InputLabel>
            <Select
              value={expressionType}
              onChange={(e) => setExpressionType(e.target.value)}
              label="Condition Type"
              disabled={disabled}
            >
              {CONDITION_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box>
                    <Typography variant="body2">{type.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {type.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedCondition && (
            <Typography variant="caption" color="text.secondary">
              {selectedCondition.description}
            </Typography>
          )}

          {!isLogicalOperator && (
            <FormControl fullWidth size="small">
              <InputLabel>Field</InputLabel>
              <Select
                value={config.field || ''}
                onChange={(e) => handleConfigChange('field', e.target.value)}
                label="Field"
                disabled={disabled}
              >
                {fields.map((field) => (
                  <MenuItem key={field.id} value={field.id}>
                    {field.label} ({field.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {!isLogicalOperator && needsValue && (
            <TextField
              fullWidth
              size="small"
              label="Value"
              value={config.value || ''}
              onChange={(e) => handleConfigChange('value', e.target.value)}
              disabled={disabled}
              helperText="The value to compare against"
            />
          )}

          {expressionType === 'regex' && (
            <TextField
              fullWidth
              size="small"
              label="Pattern"
              value={config.pattern || ''}
              onChange={(e) => handleConfigChange('pattern', e.target.value)}
              disabled={disabled}
              helperText="Regular expression pattern"
            />
          )}

          {['in_list', 'not_in_list'].includes(expressionType) && (
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={config.values || []}
              onChange={(_, newValue) => handleConfigChange('values', newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Values"
                  helperText="Enter values and press Enter to add"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={index}
                    variant="outlined"
                    label={option}
                    size="small"
                    {...getTagProps({ index })}
                  />
                ))
              }
              disabled={disabled}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

const RuleBuilder: React.FC<RuleBuilderProps> = ({
  rule,
  fields,
  onChange,
  onDelete,
  disabled = false,
}) => {
  const handleTargetChange = (targetId: string) => {
    onChange({ ...rule, target: targetId });
  };

  const handleActionChange = (action: ConditionalAction) => {
    onChange({ ...rule, action });
  };

  const handleConditionChange = (condition: ConditionalExpression) => {
    onChange({ ...rule, condition });
  };

  const targetField = fields.find(f => f.id === rule.target);

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DragIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Rule: {rule.id}
          </Typography>
          <IconButton 
            onClick={onDelete} 
            disabled={disabled}
            color="error"
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </Box>

        <Stack spacing={3}>
          {/* Target Field Selection */}
          <FormControl fullWidth>
            <InputLabel>Target Field</InputLabel>
            <Select
              value={rule.target}
              onChange={(e) => handleTargetChange(e.target.value)}
              label="Target Field"
              disabled={disabled}
            >
              {fields.map((field) => (
                <MenuItem key={field.id} value={field.id}>
                  {field.label} ({field.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {targetField && (
            <Alert severity="info" sx={{ py: 0 }}>
              Target: <strong>{targetField.label}</strong> ({targetField.field_type.type})
            </Alert>
          )}

          {/* Action Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Action
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {ACTION_TYPES.map((actionType) => (
                <Chip
                  key={actionType.value}
                  label={actionType.label}
                  icon={actionType.icon}
                  variant={
                    (typeof rule.action === 'string' && rule.action === actionType.value) ||
                    (typeof rule.action === 'object' && Object.keys(rule.action)[0] === actionType.value)
                      ? 'filled'
                      : 'outlined'
                  }
                  clickable
                  onClick={() => {
                    if (actionType.value === 'SetValue') {
                      handleActionChange({ SetValue: null });
                    } else if (actionType.value === 'ShowError') {
                      handleActionChange({ ShowError: '' });
                    } else if (actionType.value === 'SetOptions') {
                      handleActionChange({ SetOptions: [] });
                    } else {
                      handleActionChange(actionType.value as ConditionalAction);
                    }
                  }}
                  disabled={disabled}
                />
              ))}
            </Stack>
          </Box>

          {/* Action Configuration */}
          {typeof rule.action === 'object' && (
            <Box>
              {rule.action.SetValue !== undefined && (
                <TextField
                  fullWidth
                  size="small"
                  label="Value to Set"
                  value={rule.action.SetValue || ''}
                  onChange={(e) => handleActionChange({ SetValue: e.target.value })}
                  disabled={disabled}
                />
              )}
              {rule.action.ShowError !== undefined && (
                <TextField
                  fullWidth
                  size="small"
                  label="Error Message"
                  value={rule.action.ShowError || ''}
                  onChange={(e) => handleActionChange({ ShowError: e.target.value })}
                  disabled={disabled}
                />
              )}
              {rule.action.SetOptions !== undefined && (
                <Alert severity="info">
                  Options configuration not yet implemented in this demo
                </Alert>
              )}
            </Box>
          )}

          <Divider />

          {/* Condition Builder */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Condition
            </Typography>
            <ExpressionBuilder
              expression={rule.condition}
              fields={fields}
              onChange={handleConditionChange}
              disabled={disabled}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const ConditionalLogicBuilder: React.FC<ConditionalLogicBuilderProps> = ({
  rules,
  fields,
  onChange,
  disabled = false,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddRule = () => {
    const newRule: ConditionalRule = {
      id: `rule_${Date.now()}`,
      target: fields[0]?.id || '',
      action: 'Show',
      condition: {
        type: 'equals',
        config: {
          field: fields[0]?.id || '',
          value: '',
        },
      },
    };
    onChange([...rules, newRule]);
    setDialogOpen(false);
  };

  const handleUpdateRule = (index: number, updatedRule: ConditionalRule) => {
    const newRules = [...rules];
    newRules[index] = updatedRule;
    onChange(newRules);
  };

  const handleDeleteRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    onChange(newRules);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Conditional Logic Rules
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={disabled || fields.length === 0}
        >
          Add Rule
        </Button>
      </Box>

      {fields.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No fields available. Add some fields to the form before creating conditional logic rules.
        </Alert>
      )}

      {rules.length === 0 ? (
        <Alert severity="info">
          No conditional logic rules defined. Click "Add Rule" to create your first rule.
        </Alert>
      ) : (
        <Box>
          {rules.map((rule, index) => (
            <RuleBuilder
              key={rule.id}
              rule={rule}
              fields={fields}
              onChange={(updatedRule) => handleUpdateRule(index, updatedRule)}
              onDelete={() => handleDeleteRule(index)}
              disabled={disabled}
            />
          ))}
        </Box>
      )}

      {/* Add Rule Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Add Conditional Logic Rule</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Create a new rule that will automatically show, hide, enable, disable, or modify
            fields based on the values of other fields in your form.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Rules are evaluated in real-time as users interact with the form, providing
            a dynamic and context-aware user experience.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddRule} variant="contained">
            Create Rule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConditionalLogicBuilder;