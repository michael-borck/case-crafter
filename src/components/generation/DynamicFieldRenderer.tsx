import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
  Switch,
  Slider,
  Typography,
  Chip,
  Autocomplete,
  Button,
  IconButton,
  Stack,
  Card,
  CardContent,
  Divider,
  Alert,
  Tooltip,
  InputAdornment,
  TextareaAutosize,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Upload as UploadIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Percent as PercentIcon,
  Link as LinkIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { DynamicField } from '../../types/configuration';

export interface DynamicFieldRendererProps {
  field: DynamicField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  readonly?: boolean;
  showValidation?: boolean;
  compact?: boolean;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
  readonly = false,
  showValidation = true,
  compact = false,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isDirty, setIsDirty] = useState(false);

  // Sync internal value with prop value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = useCallback((newValue: any) => {
    setInternalValue(newValue);
    setIsDirty(true);
    onChange(newValue);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    if (isDirty && field.validation?.onBlur) {
      // Trigger validation on blur if configured
      setIsDirty(false);
    }
  }, [isDirty, field.validation]);

  const getInputAdornment = () => {
    const icons: Record<string, React.ReactNode> = {
      currency: <MoneyIcon />,
      percentage: <PercentIcon />,
      url: <LinkIcon />,
      email: <EmailIcon />,
      phone: <PhoneIcon />,
      date: <CalendarIcon />,
    };
    
    if (field.inputType && icons[field.inputType]) {
      return (
        <InputAdornment position="start">
          {icons[field.inputType]}
        </InputAdornment>
      );
    }
    
    return null;
  };

  const renderField = () => {
    const commonProps = {
      disabled: disabled || readonly,
      error: Boolean(error),
      helperText: error || field.description,
      fullWidth: !compact,
      size: compact ? 'small' as const : 'medium' as const,
      onBlur: handleBlur,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        return (
          <TextField
            {...commonProps}
            type={field.type === 'text' ? 'text' : field.type}
            label={field.label}
            value={internalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            multiline={field.inputType === 'textarea'}
            rows={field.inputType === 'textarea' ? (field.rows || 3) : undefined}
            InputProps={{
              startAdornment: getInputAdornment(),
            }}
            inputProps={{
              maxLength: field.maxLength,
              pattern: field.pattern,
            }}
          />
        );

      case 'number':
        return (
          <TextField
            {...commonProps}
            type="number"
            label={field.label}
            value={internalValue || ''}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            placeholder={field.placeholder}
            InputProps={{
              startAdornment: getInputAdornment(),
            }}
            inputProps={{
              min: field.min,
              max: field.max,
              step: field.step || 1,
            }}
          />
        );

      case 'currency':
        return (
          <TextField
            {...commonProps}
            type="number"
            label={field.label}
            value={internalValue || ''}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            placeholder={field.placeholder}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {field.currency || '$'}
                </InputAdornment>
              ),
            }}
            inputProps={{
              min: field.min || 0,
              max: field.max,
              step: field.step || 0.01,
            }}
          />
        );

      case 'percentage':
        return (
          <TextField
            {...commonProps}
            type="number"
            label={field.label}
            value={internalValue || ''}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            placeholder={field.placeholder}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            inputProps={{
              min: field.min || 0,
              max: field.max || 100,
              step: field.step || 1,
            }}
          />
        );

      case 'textarea':
        return (
          <TextField
            {...commonProps}
            multiline
            rows={field.rows || 4}
            label={field.label}
            value={internalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            inputProps={{
              maxLength: field.maxLength,
            }}
          />
        );

      case 'select':
        return (
          <FormControl {...commonProps}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={internalValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              label={field.label}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(error || field.description) && (
              <FormHelperText error={Boolean(error)}>
                {error || field.description}
              </FormHelperText>
            )}
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl {...commonProps}>
            <Autocomplete
              multiple
              options={field.options || []}
              getOptionLabel={(option) => option.label}
              value={field.options?.filter(opt => (internalValue || []).includes(opt.value)) || []}
              onChange={(_, newValue) => {
                handleChange(newValue.map(opt => opt.value));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={field.label}
                  placeholder={field.placeholder}
                  error={Boolean(error)}
                  helperText={error || field.description}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.value}
                    label={option.label}
                    size="small"
                  />
                ))
              }
            />
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(internalValue)}
                onChange={(e) => handleChange(e.target.checked)}
                disabled={disabled || readonly}
              />
            }
            label={field.label}
          />
        );

      case 'radio':
        return (
          <FormControl component="fieldset" error={Boolean(error)}>
            <FormLabel component="legend">{field.label}</FormLabel>
            <RadioGroup
              value={internalValue || ''}
              onChange={(e) => handleChange(e.target.value)}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio disabled={disabled || readonly} />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
            {(error || field.description) && (
              <FormHelperText error={Boolean(error)}>
                {error || field.description}
              </FormHelperText>
            )}
          </FormControl>
        );

      case 'switch':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(internalValue)}
                onChange={(e) => handleChange(e.target.checked)}
                disabled={disabled || readonly}
              />
            }
            label={field.label}
          />
        );

      case 'slider':
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              {field.label}
            </Typography>
            <Slider
              value={internalValue || field.min || 0}
              onChange={(_, newValue) => handleChange(newValue)}
              min={field.min || 0}
              max={field.max || 100}
              step={field.step || 1}
              marks={field.marks}
              valueLabelDisplay="auto"
              disabled={disabled || readonly}
            />
            {(error || field.description) && (
              <FormHelperText error={Boolean(error)}>
                {error || field.description}
              </FormHelperText>
            )}
          </Box>
        );

      case 'date':
        return (
          <DatePicker
            label={field.label}
            value={internalValue ? new Date(internalValue) : null}
            onChange={(newValue) => handleChange(newValue?.toISOString())}
            disabled={disabled || readonly}
            slotProps={{
              textField: {
                ...commonProps,
                error: Boolean(error),
                helperText: error || field.description,
              },
            }}
          />
        );

      case 'time':
        return (
          <TimePicker
            label={field.label}
            value={internalValue ? new Date(internalValue) : null}
            onChange={(newValue) => handleChange(newValue?.toISOString())}
            disabled={disabled || readonly}
            slotProps={{
              textField: {
                ...commonProps,
                error: Boolean(error),
                helperText: error || field.description,
              },
            }}
          />
        );

      case 'datetime':
        return (
          <DateTimePicker
            label={field.label}
            value={internalValue ? new Date(internalValue) : null}
            onChange={(newValue) => handleChange(newValue?.toISOString())}
            disabled={disabled || readonly}
            slotProps={{
              textField: {
                ...commonProps,
                error: Boolean(error),
                helperText: error || field.description,
              },
            }}
          />
        );

      case 'file':
        return (
          <Box>
            <input
              type="file"
              id={`file-${field.id}`}
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleChange({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    file: file,
                  });
                }
              }}
              accept={field.accept}
              multiple={field.multiple}
              disabled={disabled || readonly}
            />
            <label htmlFor={`file-${field.id}`}>
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                disabled={disabled || readonly}
                fullWidth={!compact}
              >
                {internalValue?.name || field.label}
              </Button>
            </label>
            {(error || field.description) && (
              <FormHelperText error={Boolean(error)}>
                {error || field.description}
              </FormHelperText>
            )}
          </Box>
        );

      case 'tags':
        return (
          <Autocomplete
            multiple
            freeSolo
            options={field.options?.map(opt => opt.label) || []}
            value={internalValue || []}
            onChange={(_, newValue) => handleChange(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                placeholder={field.placeholder}
                error={Boolean(error)}
                helperText={error || field.description}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={index}
                  label={option}
                  size="small"
                />
              ))
            }
            disabled={disabled || readonly}
          />
        );

      case 'array':
        return (
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {field.label}
                </Typography>
                {!readonly && (
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const newArray = [...(internalValue || []), ''];
                      handleChange(newArray);
                    }}
                    size="small"
                    disabled={disabled}
                  >
                    Add Item
                  </Button>
                )}
              </Box>
              
              <Stack spacing={2}>
                {(internalValue || []).map((item: any, index: number) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      value={item}
                      onChange={(e) => {
                        const newArray = [...(internalValue || [])];
                        newArray[index] = e.target.value;
                        handleChange(newArray);
                      }}
                      placeholder={`${field.label} ${index + 1}`}
                      size="small"
                      sx={{ flexGrow: 1 }}
                      disabled={disabled || readonly}
                    />
                    {!readonly && (
                      <IconButton
                        onClick={() => {
                          const newArray = (internalValue || []).filter((_: any, i: number) => i !== index);
                          handleChange(newArray);
                        }}
                        size="small"
                        disabled={disabled}
                      >
                        <RemoveIcon />
                      </IconButton>
                    )}
                  </Box>
                ))}
                
                {(!internalValue || internalValue.length === 0) && (
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    No items added yet
                  </Typography>
                )}
              </Stack>
              
              {(error || field.description) && (
                <FormHelperText error={Boolean(error)} sx={{ mt: 1 }}>
                  {error || field.description}
                </FormHelperText>
              )}
            </CardContent>
          </Card>
        );

      case 'object':
        return (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {field.label}
              </Typography>
              {field.description && (
                <Typography variant="body2" color="text.secondary" paragraph>
                  {field.description}
                </Typography>
              )}
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={2}>
                {field.properties?.map((property) => (
                  <DynamicFieldRenderer
                    key={property.id}
                    field={property}
                    value={internalValue?.[property.id]}
                    onChange={(newValue) => {
                      const newObject = { ...(internalValue || {}), [property.id]: newValue };
                      handleChange(newObject);
                    }}
                    disabled={disabled}
                    readonly={readonly}
                    showValidation={showValidation}
                    compact={compact}
                  />
                ))}
              </Stack>
              
              {error && (
                <FormHelperText error sx={{ mt: 1 }}>
                  {error}
                </FormHelperText>
              )}
            </CardContent>
          </Card>
        );

      default:
        return (
          <Alert severity="warning">
            Unsupported field type: {field.type}
          </Alert>
        );
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {field.tooltip && (
        <Tooltip title={field.tooltip} placement="top-start">
          <IconButton
            size="small"
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              zIndex: 1,
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      
      {renderField()}
      
      {showValidation && field.required && !internalValue && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          <WarningIcon color="warning" fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="caption" color="warning.main">
            This field is required
          </Typography>
        </Box>
      )}
    </Box>
  );
};