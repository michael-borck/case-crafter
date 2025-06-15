// TypeScript types for configuration system

export interface ConfigurationSchema {
  id: string;
  name: string;
  description?: string;
  version: string;
  framework?: string;
  category: string;
  sections: FieldSection[];
  global_validations: CrossFieldValidation[];
  conditional_logic: ConditionalRule[];
  defaults: Record<string, any>;
  metadata: SchemaMetadata;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface FieldSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  collapsible: boolean;
  collapsed_by_default: boolean;
  icon?: string;
  fields: FieldDefinition[];
  visibility_conditions?: ConditionalExpression;
}

export interface FieldDefinition {
  id: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  placeholder?: string;
  help_text?: string;
  default_value?: any;
  validations: ValidationRule[];
  options?: FieldOptions;
  display: FieldDisplay;
  visibility_conditions?: ConditionalExpression;
  dependent_fields: string[];
  framework_mapping?: FrameworkMapping;
}

export interface FieldType {
  type: string;
  config?: any;
}

export interface FieldOptions {
  static_options?: OptionItem[];
  dynamic_options?: DynamicOptionsConfig;
  allow_custom: boolean;
  custom_validation?: ValidationRule;
}

export interface OptionItem {
  value: any;
  label: string;
  description?: string;
  disabled: boolean;
  icon?: string;
  group?: string;
  metadata?: Record<string, any>;
}

export interface DynamicOptionsConfig {
  source_type: string;
  source_config: Record<string, any>;
  dependencies: string[];
  cache_config?: CacheConfig;
}

export interface CacheConfig {
  duration: number;
  per_user: boolean;
  key_template?: string;
}

export interface FieldDisplay {
  css_classes: string[];
  styles: Record<string, string>;
  grid: GridLayout;
  disabled: boolean;
  readonly: boolean;
  auto_focus: boolean;
  tab_index?: number;
  tooltip?: string;
  width: string;
}

export interface GridLayout {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  offset?: number;
}

export interface ValidationRule {
  type: string;
  config?: any;
}

export interface CrossFieldValidation {
  id: string;
  name: string;
  fields: string[];
  expression: string;
  message: string;
  trigger: ValidationTrigger;
}

export type ValidationTrigger = 'OnChange' | 'OnSubmit' | 'OnBlur' | { Custom: string };

export interface ConditionalRule {
  id: string;
  target: string;
  action: ConditionalAction;
  condition: ConditionalExpression;
}

export type ConditionalAction = 
  | 'Show' 
  | 'Hide' 
  | 'Enable' 
  | 'Disable' 
  | { SetValue: any } 
  | 'ClearValue' 
  | { ShowError: string } 
  | { SetOptions: OptionItem[] };

export interface ConditionalExpression {
  type: string;
  config?: any;
}

export interface FrameworkMapping {
  framework: string;
  component: string;
  element?: string;
  description?: string;
  metadata: Record<string, any>;
}

export interface SchemaMetadata {
  tags: string[];
  target_audience: string[];
  difficulty_level?: string;
  estimated_minutes?: number;
  is_template: boolean;
  is_active: boolean;
  locale: string;
  custom: Record<string, any>;
}

// Stored configuration models
export interface StoredConfigurationSchema {
  id: string;
  name: string;
  description?: string;
  version: string;
  framework?: string;
  category: string;
  schema_data: string;
  status: ConfigurationStatus;
  is_template: boolean;
  tags: string;
  target_audience: string;
  difficulty_level?: string;
  estimated_minutes?: number;
  locale: string;
  custom_metadata: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type ConfigurationStatus = 'Draft' | 'Active' | 'Archived' | 'Deleted';

export interface NewConfiguration {
  name: string;
  description?: string;
  version: string;
  framework?: string;
  category: string;
  schema: ConfigurationSchema;
  is_template: boolean;
  tags: string[];
  target_audience: string[];
  difficulty_level?: string;
  estimated_minutes?: number;
  locale: string;
  custom_metadata: Record<string, any>;
  created_by?: string;
}

export interface UpdateConfiguration {
  name?: string;
  description?: string;
  version?: string;
  framework?: string;
  category?: string;
  schema?: ConfigurationSchema;
  status?: ConfigurationStatus;
  is_template?: boolean;
  tags?: string[];
  target_audience?: string[];
  difficulty_level?: string;
  estimated_minutes?: number;
  locale?: string;
  custom_metadata?: Record<string, any>;
}

export interface ConfigurationFilter {
  status?: ConfigurationStatus;
  category?: string;
  framework?: string;
  is_template?: boolean;
  tags?: string[];
  target_audience?: string[];
  difficulty_level?: string;
  locale?: string;
  created_by?: string;
  search_query?: string;
}

export interface ValidationResults {
  is_valid: boolean;
  field_errors: Record<string, string[]>;
  global_errors: string[];
  warnings: string[];
}

export interface FormSubmission {
  id: string;
  configuration_id: string;
  user_id?: string;
  form_data: Record<string, any>;
  validation_results: ValidationResults;
  status: SubmissionStatus;
  submitted_at: string;
  updated_at: string;
}

export type SubmissionStatus = 'Processing' | 'Completed' | 'Failed' | 'Cancelled';

export interface ConfigurationUsage {
  configuration_id: string;
  user_id?: string;
  used_at: string;
  usage_context: string;
  usage_metadata: Record<string, any>;
}

export interface ConfigurationStatistics {
  total_configurations: number;
  active_configurations: number;
  template_configurations: number;
  most_used_configurations: [string, number][];
  usage_by_category: Record<string, number>;
  usage_by_framework: Record<string, number>;
  recent_activity: ConfigurationUsage[];
}

export interface DuplicateConfigurationRequest {
  template_id: string;
  new_name: string;
  new_description: string;
  customizations: Record<string, any>;
  created_by?: string;
}

// Field type constants
export const FIELD_TYPES = {
  TEXT: 'Text',
  TEXT_AREA: 'TextArea',
  RICH_TEXT: 'RichText',
  NUMBER: 'Number',
  INTEGER: 'Integer',
  EMAIL: 'Email',
  URL: 'Url',
  PHONE: 'Phone',
  DATE: 'Date',
  DATE_TIME: 'DateTime',
  TIME: 'Time',
  SELECT: 'Select',
  MULTI_SELECT: 'MultiSelect',
  RADIO: 'Radio',
  CHECKBOX_GROUP: 'CheckboxGroup',
  CHECKBOX: 'Checkbox',
  TOGGLE: 'Toggle',
  SLIDER: 'Slider',
  RATING: 'Rating',
  FILE_UPLOAD: 'FileUpload',
  IMAGE_UPLOAD: 'ImageUpload',
  COLOR: 'Color',
  JSON: 'Json',
  FIELD_ARRAY: 'FieldArray',
  DYNAMIC_FIELD_GROUP: 'DynamicFieldGroup',
  HIDDEN: 'Hidden',
  DISPLAY: 'Display',
  DIVIDER: 'Divider',
} as const;

// Validation rule types
export const VALIDATION_TYPES = {
  REQUIRED: 'Required',
  MIN_LENGTH: 'MinLength',
  MAX_LENGTH: 'MaxLength',
  PATTERN: 'Pattern',
  MIN: 'Min',
  MAX: 'Max',
  EMAIL: 'Email',
  URL: 'Url',
  CUSTOM: 'Custom',
  CROSS_FIELD: 'CrossField',
} as const;

// Business frameworks
export const BUSINESS_FRAMEWORKS = [
  'Porter\'s Five Forces',
  'SWOT Analysis',
  'McKinsey 7S Framework',
  'Boston Consulting Group Matrix',
  'Ansoff Matrix',
  'Value Chain Analysis',
  'PESTLE Analysis',
  'Balanced Scorecard',
  'Blue Ocean Strategy',
  'Lean Canvas',
  'Business Model Canvas',
  'Design Thinking',
  'Agile/Scrum',
  'Six Sigma',
  'Theory of Constraints',
] as const;

// Difficulty levels
export const DIFFICULTY_LEVELS = [
  'Beginner',
  'Intermediate', 
  'Advanced',
  'Expert'
] as const;

// Categories
export const CONFIGURATION_CATEGORIES = [
  'case_study_generation',
  'assessment_creation',
  'content_analysis',
  'framework_application',
  'data_collection',
  'evaluation_criteria',
  'learning_objectives',
  'custom',
] as const;