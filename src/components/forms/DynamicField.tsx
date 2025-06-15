// Dynamic field component that renders different field types

import React, { useState, useEffect } from 'react';
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
  RadioGroup,
  Radio,
  Switch,
  Slider,
  Rating,
  Chip,
  Autocomplete,
  Button,
  IconButton,
  Typography,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import {
  DatePicker,
  TimePicker,
  DateTimePicker,
} from '@mui/x-date-pickers';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import {
  FieldDefinition,
  FIELD_TYPES,
} from '../../types/configuration';

export interface DynamicFieldProps {
  field: FieldDefinition;
  value: any;
  error?: string | undefined;
  touched: boolean;
  onChange: (value: any) => void;
  onBlur: () => void;
  disabled?: boolean;
  formData: Record<string, any>;
  mode?: 'create' | 'edit' | 'view';
}

export const DynamicField: React.FC<DynamicFieldProps> = ({
  field,
  value,
  error,
  touched,
  onChange,
  onBlur,
  disabled = false,
  formData,
  mode = 'create',
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [options] = useState(field.options?.static_options || []);

  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle value change with debouncing for text inputs
  const handleChange = (newValue: any) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  // Handle blur event
  const handleBlur = () => {
    onBlur();
  };

  // Load dynamic options if needed
  useEffect(() => {
    if (field.options?.dynamic_options) {
      // TODO: Implement dynamic options loading
      // This would call backend to get options based on dependencies
    }
  }, [field.options?.dynamic_options, formData]);

  // Get field error state
  const hasError = touched && !!error;

  // Common field props
  const commonProps = {
    error: hasError,
    helperText: hasError ? error : field.help_text,
    disabled: disabled || field.display.disabled,
    onBlur: handleBlur,
    fullWidth: true,
  };

  // Render based on field type
  const renderField = () => {
    switch (field.field_type.type) {
      case FIELD_TYPES.TEXT:
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder || ''}
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
            InputProps={{
              readOnly: mode === 'view',
            }}
          />
        );

      case FIELD_TYPES.TEXT_AREA:
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder || ''}
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
            multiline
            rows={field.field_type.config?.rows || 4}
            InputProps={{
              readOnly: mode === 'view',
            }}
          />
        );

      case FIELD_TYPES.NUMBER:
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder || ''}
            type="number"
            value={localValue || ''}
            onChange={(e) => handleChange(Number(e.target.value))}
            required={field.required}
            InputProps={{
              readOnly: mode === 'view',
            }}
          />
        );

      case FIELD_TYPES.EMAIL:
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder || ''}
            type="email"
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
            InputProps={{
              readOnly: mode === 'view',
            }}
          />
        );

      case FIELD_TYPES.URL:
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder || ''}
            type="url"
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
            InputProps={{
              readOnly: mode === 'view',
            }}
          />
        );

      case FIELD_TYPES.SELECT:
        return (
          <FormControl {...commonProps}>
            <InputLabel required={field.required}>{field.label}</InputLabel>
            <Select
              value={localValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              label={field.label}
              disabled={disabled || field.display.disabled || mode === 'view'}
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case FIELD_TYPES.MULTI_SELECT:
        return (
          <Autocomplete
            multiple
            options={options}
            getOptionLabel={(option) => option.label}
            value={options.filter(option => (localValue || []).includes(option.value))}
            onChange={(_, selectedOptions) => {
              handleChange(selectedOptions.map(option => option.value));
            }}
            disabled={disabled || field.display.disabled || mode === 'view'}
            renderInput={(params) => {
              const { InputLabelProps, ...restParams } = params;
              return (
                <TextField
                  {...restParams}
                  {...commonProps}
                  label={field.label}
                  required={field.required}
                  size="small"
                />
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
        );

      case FIELD_TYPES.RADIO:
        return (
          <FormControl {...commonProps}>
            <Typography variant="subtitle2" gutterBottom>
              {field.label} {field.required && '*'}
            </Typography>
            <RadioGroup
              value={localValue || ''}
              onChange={(e) => handleChange(e.target.value)}
            >
              {options.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                  disabled={option.disabled || disabled || field.display.disabled || mode === 'view'}
                />
              ))}
            </RadioGroup>
            {hasError && (
              <FormHelperText error>{error}</FormHelperText>
            )}
          </FormControl>
        );

      case FIELD_TYPES.CHECKBOX:
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={!!localValue}
                onChange={(e) => handleChange(e.target.checked)}
                disabled={disabled || field.display.disabled || mode === 'view'}
              />
            }
            label={field.label}
          />
        );

      case FIELD_TYPES.CHECKBOX_GROUP:
        return (
          <FormControl {...commonProps}>
            <Typography variant="subtitle2" gutterBottom>
              {field.label} {field.required && '*'}
            </Typography>
            <Stack spacing={1}>
              {options.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={(localValue || []).includes(option.value)}
                      onChange={(e) => {
                        const currentValues = localValue || [];
                        if (e.target.checked) {
                          handleChange([...currentValues, option.value]);
                        } else {
                          handleChange(currentValues.filter((v: any) => v !== option.value));
                        }
                      }}
                      disabled={option.disabled || disabled || field.display.disabled || mode === 'view'}
                    />
                  }
                  label={option.label}
                />
              ))}
            </Stack>
            {hasError && (
              <FormHelperText error>{error}</FormHelperText>
            )}
          </FormControl>
        );

      case FIELD_TYPES.TOGGLE:
        return (
          <FormControlLabel
            control={
              <Switch
                checked={!!localValue}
                onChange={(e) => handleChange(e.target.checked)}
                disabled={disabled || field.display.disabled || mode === 'view'}
              />
            }
            label={field.label}
          />
        );

      case FIELD_TYPES.SLIDER:
        const sliderConfig = field.field_type.config || {};
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {field.label} {field.required && '*'}
            </Typography>
            <Slider
              value={localValue || sliderConfig.min || 0}
              onChange={(_, newValue) => handleChange(newValue)}
              min={sliderConfig.min || 0}
              max={sliderConfig.max || 100}
              step={sliderConfig.step || 1}
              marks={sliderConfig.marks}
              valueLabelDisplay="auto"
              disabled={disabled || field.display.disabled || mode === 'view'}
            />
            {hasError && (
              <FormHelperText error>{error}</FormHelperText>
            )}
          </Box>
        );

      case FIELD_TYPES.RATING:
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {field.label} {field.required && '*'}
            </Typography>
            <Rating
              value={localValue || 0}
              onChange={(_, newValue) => handleChange(newValue)}
              max={field.field_type.config?.max || 5}
              precision={field.field_type.config?.precision || 1}
              disabled={disabled || field.display.disabled || mode === 'view'}
            />
            {hasError && (
              <FormHelperText error>{error}</FormHelperText>
            )}
          </Box>
        );

      case FIELD_TYPES.DATE:
        return (
          <DatePicker
            label={field.label}
            value={localValue ? new Date(localValue) : null}
            onChange={(date) => handleChange(date?.toISOString())}
            disabled={disabled || field.display.disabled || mode === 'view'}
            slotProps={{
              textField: {
                ...commonProps,
                required: field.required,
              },
            }}
          />
        );

      case FIELD_TYPES.DATE_TIME:
        return (
          <DateTimePicker
            label={field.label}
            value={localValue ? new Date(localValue) : null}
            onChange={(date) => handleChange(date?.toISOString())}
            disabled={disabled || field.display.disabled || mode === 'view'}
            slotProps={{
              textField: {
                ...commonProps,
                required: field.required,
              },
            }}
          />
        );

      case FIELD_TYPES.TIME:
        return (
          <TimePicker
            label={field.label}
            value={localValue ? new Date(`2000-01-01T${localValue}`) : null}
            onChange={(time) => {
              if (time) {
                const timeString = time.toTimeString().split(' ')[0];
                handleChange(timeString);
              } else {
                handleChange(null);
              }
            }}
            disabled={disabled || field.display.disabled || mode === 'view'}
            slotProps={{
              textField: {
                ...commonProps,
                required: field.required,
              },
            }}
          />
        );

      case FIELD_TYPES.FILE_UPLOAD:
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {field.label} {field.required && '*'}
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              disabled={disabled || field.display.disabled || mode === 'view'}
            >
              Upload File
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleChange({
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      lastModified: file.lastModified,
                    });
                  }
                }}
              />
            </Button>
            {localValue && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected: {localValue.name}
              </Typography>
            )}
            {hasError && (
              <FormHelperText error>{error}</FormHelperText>
            )}
          </Box>
        );

      case FIELD_TYPES.FIELD_ARRAY:
        const arrayValue = localValue || [];
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {field.label} {field.required && '*'}
            </Typography>
            <Stack spacing={2}>
              {arrayValue.map((item: any, index: number) => (
                <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2">Item {index + 1}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newArray = [...arrayValue];
                        newArray.splice(index, 1);
                        handleChange(newArray);
                      }}
                      disabled={disabled || field.display.disabled || mode === 'view'}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </Box>
                  <TextField
                    fullWidth
                    value={item}
                    onChange={(e) => {
                      const newArray = [...arrayValue];
                      newArray[index] = e.target.value;
                      handleChange(newArray);
                    }}
                    disabled={disabled || field.display.disabled || mode === 'view'}
                  />
                </Paper>
              ))}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleChange([...arrayValue, ''])}
                disabled={disabled || field.display.disabled || mode === 'view'}
              >
                Add Item
              </Button>
            </Stack>
            {hasError && (
              <FormHelperText error>{error}</FormHelperText>
            )}
          </Box>
        );

      case FIELD_TYPES.HIDDEN:
        return <input type="hidden" value={localValue || ''} />;

      case FIELD_TYPES.DISPLAY:
        return (
          <Typography variant="body1">
            {field.field_type.config?.content || localValue}
          </Typography>
        );

      case FIELD_TYPES.DIVIDER:
        return <Divider sx={{ my: 2 }} />;

      default:
        return (
          <TextField
            {...commonProps}
            label={field.label}
            placeholder={field.placeholder || ''}
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
            InputProps={{
              readOnly: mode === 'view',
            }}
          />
        );
    }
  };

  // Apply display properties
  const fieldElement = renderField();

  return (
    <Box
      sx={{
        width: field.display.width,
        ...field.display.styles,
      }}
      className={field.display.css_classes.join(' ')}
    >
      {fieldElement}
    </Box>
  );
};