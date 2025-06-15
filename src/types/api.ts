// API-related types for frontend-backend communication

// ===== API RESPONSE TYPES =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// ===== API REQUEST TYPES =====

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  query?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CaseStudyFilters extends SearchParams {
  domain_id?: number;
  difficulty_level?: string;
  status?: string;
  created_by?: number;
  tag?: string;
}

export interface UserProgressFilters extends SearchParams {
  user_id?: number;
  case_study_id?: number;
  status?: string;
  completed_after?: string;
  completed_before?: string;
}

// ===== FORM DATA TYPES =====

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserRegistration {
  username: string;
  email?: string;
  full_name?: string;
  password: string;
  confirm_password: string;
}

export interface CaseStudyFormData {
  title: string;
  description?: string;
  domain_id: number;
  template_id?: number;
  difficulty_level?: string;
  estimated_duration?: number;
  learning_objectives?: string[];
  tags?: string[];
  content: string;
  background_info?: string;
  problem_statement?: string;
  analysis_framework?: string;
  sample_solution?: string;
  status?: string;
}

export interface AssessmentQuestionFormData {
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer?: string;
  sample_answer?: string;
  rubric?: any; // JSON object
  points?: number;
  is_required?: boolean;
}

// ===== AI GENERATION TYPES =====

export interface GenerationRequest {
  type: string;
  case_study_id?: number;
  template_id?: number;
  user_inputs: Record<string, any>;
  options?: GenerationOptions;
}

export interface GenerationOptions {
  ai_provider?: string;
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  include_outline?: boolean;
  include_questions?: boolean;
  include_background?: boolean;
  include_solution?: boolean;
}

export interface GenerationResult {
  success: boolean;
  content?: string;
  questions?: AssessmentQuestionFormData[];
  metadata?: any;
  generation_time_ms?: number;
  error_message?: string;
}

// ===== FILE UPLOAD TYPES =====

export interface FileUploadRequest {
  case_study_id: number;
  file: File;
  description?: string;
}

export interface FileUploadResponse {
  attachment_id: number;
  filename: string;
  file_size: number;
  mime_type: string;
  url: string;
}

// ===== CONFIGURATION TYPES =====

export interface DynamicFormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'boolean' | 'date';
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  default_value?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string; // Custom validation function name
  };
  dependencies?: Array<{
    field: string;
    value: any;
    condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  }>;
}

export interface DynamicFormSchema {
  version: string;
  fields: DynamicFormField[];
  sections?: Array<{
    title: string;
    description?: string;
    fields: string[]; // Field IDs
  }>;
}

// ===== NOTIFICATION TYPES =====

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // milliseconds
  dismissible?: boolean;
}

// ===== THEME TYPES =====

export interface ThemeSettings {
  mode: 'light' | 'dark' | 'system';
  primary_color?: string;
  accent_color?: string;
  font_size?: 'small' | 'medium' | 'large';
  compact_mode?: boolean;
}

// ===== ANALYTICS TYPES =====

export interface UsageAnalytics {
  total_case_studies: number;
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  generations_today: number;
  generations_week: number;
  popular_domains: Array<{ domain: string; count: number }>;
  popular_templates: Array<{ template: string; count: number }>;
}

export interface UserActivity {
  date: string;
  case_studies_created: number;
  case_studies_completed: number;
  time_spent_minutes: number;
  questions_answered: number;
}

// ===== EXPORT TYPES =====

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'html' | 'markdown';
  include_questions?: boolean;
  include_solutions?: boolean;
  include_metadata?: boolean;
  template?: string;
}

export interface ExportResult {
  success: boolean;
  file_path?: string;
  download_url?: string;
  error_message?: string;
}