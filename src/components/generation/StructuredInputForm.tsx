import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  Collapse,
  IconButton,
  Chip,
  Button,
  Divider,
  LinearProgress,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { DynamicForm } from '../forms/DynamicForm';
import { FormValidationEngine } from '../forms/FormValidationEngine';
import { useConfiguration } from '../../hooks/useConfiguration';
import type { BusinessFramework } from '../frameworks/FrameworkSelector';
import type { ConfigurationTemplate, DynamicField } from '../../types/configuration';

export interface StructuredInputFormProps {
  framework?: BusinessFramework;
  configurationId?: string;
  initialData?: Record<string, any>;
  onDataChange?: (data: Record<string, any>) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  showProgress?: boolean;
  allowFieldFiltering?: boolean;
  allowFieldGrouping?: boolean;
  allowAdvancedValidation?: boolean;
  mode?: 'create' | 'edit' | 'readonly';
}

export interface FieldGroup {
  id: string;
  title: string;
  description?: string;
  fields: DynamicField[];
  isExpanded: boolean;
  isRequired: boolean;
  completionRate: number;
}

export const StructuredInputForm: React.FC<StructuredInputFormProps> = ({
  framework,
  configurationId,
  initialData = {},
  onDataChange,
  onValidationChange,
  showProgress = true,
  allowFieldFiltering = true,
  allowFieldGrouping = true,
  allowAdvancedValidation = true,
  mode = 'create',
}) => {
  const { getConfiguration, configurations } = useConfiguration();
  const [configuration, setConfiguration] = useState<ConfigurationTemplate | null>(null);
  const [fieldGroups, setFieldGroups] = useState<FieldGroup[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [validationResults, setValidationResults] = useState<{ isValid: boolean; errors: string[] }>({
    isValid: true,
    errors: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(true);
  const [focusedGroup, setFocusedGroup] = useState<string | null>(null);

  // Load configuration
  useEffect(() => {
    const loadConfiguration = async () => {
      if (configurationId) {
        try {
          const config = await getConfiguration(configurationId);
          setConfiguration(config);
        } catch (error) {
          console.error('Failed to load configuration:', error);
        }
      } else if (framework) {
        // Use framework-based configuration
        const frameworkConfig = configurations.find(
          config => config.framework === framework.id
        );
        setConfiguration(frameworkConfig || null);
      }
    };

    loadConfiguration();
  }, [configurationId, framework, getConfiguration, configurations]);

  // Group fields logically
  const groupFields = useCallback((fields: DynamicField[]): FieldGroup[] => {
    if (!allowFieldGrouping) {
      return [{
        id: 'all-fields',
        title: 'Form Fields',
        fields,
        isExpanded: true,
        isRequired: fields.some(f => f.required),
        completionRate: 0,
      }];
    }

    const groupMap = new Map<string, DynamicField[]>();
    
    fields.forEach(field => {
      const group = field.group || 'general';
      if (!groupMap.has(group)) {
        groupMap.set(group, []);
      }
      groupMap.get(group)!.push(field);
    });

    return Array.from(groupMap.entries()).map(([groupId, groupFields]) => {
      const groupTitle = getGroupTitle(groupId);
      const groupDescription = getGroupDescription(groupId);
      const requiredFields = groupFields.filter(f => f.required);
      const completedFields = groupFields.filter(f => {
        const value = formData[f.id];
        return value !== undefined && value !== null && value !== '';
      });

      return {
        id: groupId,
        title: groupTitle,
        description: groupDescription,
        fields: groupFields.sort((a, b) => {
          // Sort by required first, then by order
          if (a.required && !b.required) return -1;
          if (!a.required && b.required) return 1;
          return (a.order || 0) - (b.order || 0);
        }),
        isExpanded: groupId === 'general' || requiredFields.length > 0,
        isRequired: requiredFields.length > 0,
        completionRate: groupFields.length > 0 ? (completedFields.length / groupFields.length) * 100 : 0,
      };
    }).sort((a, b) => {
      // Sort required groups first
      if (a.isRequired && !b.isRequired) return -1;
      if (!a.isRequired && b.isRequired) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [allowFieldGrouping, formData]);

  // Update field groups when configuration changes
  useEffect(() => {
    if (configuration?.fields) {
      let filteredFields = configuration.fields;

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredFields = filteredFields.filter(field =>
          field.label.toLowerCase().includes(query) ||
          field.id.toLowerCase().includes(query) ||
          (field.description?.toLowerCase().includes(query)) ||
          (field.placeholder?.toLowerCase().includes(query))
        );
      }

      // Apply optional field filter
      if (!showOptionalFields) {
        filteredFields = filteredFields.filter(field => field.required);
      }

      const groups = groupFields(filteredFields);
      setFieldGroups(groups);
    }
  }, [configuration, searchQuery, showOptionalFields, groupFields]);

  const getGroupTitle = (groupId: string): string => {
    const titles: Record<string, string> = {
      general: 'General Information',
      company: 'Company Details',
      financial: 'Financial Information',
      market: 'Market Analysis',
      strategy: 'Strategic Planning',
      operations: 'Operations',
      technology: 'Technology & Innovation',
      legal: 'Legal & Compliance',
      sustainability: 'Sustainability & ESG',
      stakeholders: 'Stakeholder Analysis',
    };
    return titles[groupId] || groupId.charAt(0).toUpperCase() + groupId.slice(1);
  };

  const getGroupDescription = (groupId: string): string | undefined => {
    const descriptions: Record<string, string> = {
      general: 'Basic information about the case study and its context',
      company: 'Details about the organization or entity being studied',
      financial: 'Financial performance, metrics, and analysis',
      market: 'Market conditions, competitors, and industry dynamics',
      strategy: 'Strategic initiatives, goals, and decision-making processes',
      operations: 'Operational processes, efficiency, and management',
      technology: 'Technology usage, digital transformation, and innovation',
      legal: 'Legal considerations, regulations, and compliance requirements',
      sustainability: 'Environmental, social, and governance factors',
      stakeholders: 'Key stakeholders, their interests, and relationships',
    };
    return descriptions[groupId];
  };

  const handleDataChange = useCallback((newData: Record<string, any>) => {
    setFormData(prev => {
      const updated = { ...prev, ...newData };
      onDataChange?.(updated);
      return updated;
    });
  }, [onDataChange]);

  const handleValidationChange = useCallback((isValid: boolean, errors: string[]) => {
    setValidationResults({ isValid, errors });
    onValidationChange?.(isValid, errors);
  }, [onValidationChange]);

  const toggleGroup = (groupId: string) => {
    setFieldGroups(prev => prev.map(group =>
      group.id === groupId
        ? { ...group, isExpanded: !group.isExpanded }
        : group
    ));
  };

  const getOverallProgress = (): number => {
    if (fieldGroups.length === 0) return 0;
    const totalCompletion = fieldGroups.reduce((sum, group) => sum + group.completionRate, 0);
    return totalCompletion / fieldGroups.length;
  };

  const getTotalFields = (): number => {
    return fieldGroups.reduce((sum, group) => sum + group.fields.length, 0);
  };

  const getCompletedFields = (): number => {
    return fieldGroups.reduce((sum, group) => {
      const completedInGroup = group.fields.filter(field => {
        const value = formData[field.id];
        return value !== undefined && value !== null && value !== '';
      }).length;
      return sum + completedInGroup;
    }, 0);
  };

  const getRequiredFields = (): number => {
    return fieldGroups.reduce((sum, group) => {
      return sum + group.fields.filter(field => field.required).length;
    }, 0);
  };

  const getCompletedRequiredFields = (): number => {
    return fieldGroups.reduce((sum, group) => {
      const completedRequiredInGroup = group.fields.filter(field => {
        if (!field.required) return false;
        const value = formData[field.id];
        return value !== undefined && value !== null && value !== '';
      }).length;
      return sum + completedRequiredInGroup;
    }, 0);
  };

  if (!configuration) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            Loading configuration...
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const overallProgress = getOverallProgress();
  const totalFields = getTotalFields();
  const completedFields = getCompletedFields();
  const requiredFields = getRequiredFields();
  const completedRequiredFields = getCompletedRequiredFields();

  return (
    <Box sx={{ width: '100%' }}>
      {/* Progress and Statistics */}
      {showProgress && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Form Progress</Typography>
                <Typography variant="body2" color="text.secondary">
                  {completedFields} of {totalFields} fields completed
                </Typography>
              </Box>
              
              <LinearProgress
                variant="determinate"
                value={overallProgress}
                sx={{ height: 8, borderRadius: 4 }}
              />
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`Required: ${completedRequiredFields}/${requiredFields}`}
                  color={completedRequiredFields === requiredFields ? 'success' : 'default'}
                  size="small"
                />
                <Chip
                  icon={<InfoIcon />}
                  label={`Optional: ${completedFields - completedRequiredFields}/${totalFields - requiredFields}`}
                  color="info"
                  size="small"
                />
                {validationResults.errors.length > 0 && (
                  <Chip
                    icon={<WarningIcon />}
                    label={`${validationResults.errors.length} errors`}
                    color="error"
                    size="small"
                  />
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      {allowFieldFiltering && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                sx={{ flexGrow: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Button
                variant={showOptionalFields ? 'contained' : 'outlined'}
                startIcon={showOptionalFields ? <VisibilityIcon /> : <VisibilityOffIcon />}
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                size="small"
              >
                Optional Fields
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      <Collapse in={validationResults.errors.length > 0}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following errors:
          </Typography>
          <Stack spacing={1}>
            {validationResults.errors.map((error, index) => (
              <Typography key={index} variant="body2">
                • {error}
              </Typography>
            ))}
          </Stack>
        </Alert>
      </Collapse>

      {/* Field Groups */}
      <Stack spacing={2}>
        {fieldGroups.map((group) => (
          <Card
            key={group.id}
            elevation={focusedGroup === group.id ? 3 : 1}
            sx={{
              transition: 'elevation 0.2s ease',
              border: focusedGroup === group.id ? 2 : 0,
              borderColor: 'primary.main',
            }}
          >
            <CardContent sx={{ pb: group.isExpanded ? 2 : 1 }}>
              {/* Group Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  mb: group.isExpanded ? 2 : 0,
                }}
                onClick={() => toggleGroup(group.id)}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6">
                      {group.title}
                    </Typography>
                    {group.isRequired && (
                      <Chip label="Required" color="error" size="small" />
                    )}
                    <LinearProgress
                      variant="determinate"
                      value={group.completionRate}
                      sx={{ 
                        flexGrow: 1, 
                        height: 4, 
                        borderRadius: 2,
                        maxWidth: 100,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {Math.round(group.completionRate)}%
                    </Typography>
                  </Box>
                  {group.description && (
                    <Typography variant="body2" color="text.secondary">
                      {group.description}
                    </Typography>
                  )}
                </Box>
                
                <Tooltip title={group.isExpanded ? 'Collapse' : 'Expand'}>
                  <IconButton>
                    {group.isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Group Content */}
              <Collapse in={group.isExpanded}>
                <Box
                  onFocus={() => setFocusedGroup(group.id)}
                  onBlur={() => setFocusedGroup(null)}
                >
                  <Divider sx={{ mb: 2 }} />
                  <DynamicForm
                    fields={group.fields}
                    initialData={formData}
                    onDataChange={handleDataChange}
                    layout="grid"
                    showProgress={false}
                    readonly={mode === 'readonly'}
                  />
                  {allowAdvancedValidation && (
                    <FormValidationEngine
                      fields={group.fields}
                      data={formData}
                      onValidationChange={handleValidationChange}
                      showInlineErrors={true}
                    />
                  )}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {fieldGroups.length === 0 && (
        <Card>
          <CardContent>
            <Alert severity="info">
              {searchQuery.trim()
                ? `No fields found matching "${searchQuery}"`
                : 'No fields available for this configuration'
              }
            </Alert>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};