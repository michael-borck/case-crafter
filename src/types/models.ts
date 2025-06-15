// TypeScript interfaces matching Rust models from src-tauri/src/database/models.rs

// ===== ENUMS =====

export enum UserRole {
  Admin = 'admin',
  Instructor = 'instructor',
  User = 'user',
}

export enum DifficultyLevel {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
}

export enum CaseStudyStatus {
  Draft = 'draft',
  Review = 'review',
  Published = 'published',
  Archived = 'archived',
}

export enum QuestionType {
  MultipleChoice = 'multiple_choice',
  ShortAnswer = 'short_answer',
  Essay = 'essay',
  Analysis = 'analysis',
  Reflection = 'reflection',
}

export enum ProgressStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  Completed = 'completed',
  Reviewed = 'reviewed',
}

export enum GenerationType {
  CaseStudy = 'case_study',
  Questions = 'questions',
  Outline = 'outline',
  Background = 'background',
}

export enum DataType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Json = 'json',
}

// ===== USER INTERFACES =====

export interface User {
  id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  password_hash: string | null;
  role: string;
  preferences: string | null; // JSON string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface NewUser {
  username: string;
  email?: string | null;
  full_name?: string | null;
  password_hash?: string | null;
  role?: string | null;
  preferences?: string | null;
}

export interface UpdateUser {
  email?: string | null;
  full_name?: string | null;
  password_hash?: string | null;
  role?: string | null;
  preferences?: string | null;
}

// ===== DOMAIN INTERFACES =====

export interface Domain {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string; // ISO date string
}

export interface NewDomain {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}

// ===== CONFIGURATION TEMPLATE INTERFACES =====

export interface ConfigurationTemplate {
  id: number;
  name: string;
  description: string | null;
  domain_id: number | null;
  template_data: string; // JSON schema
  is_default: boolean;
  is_active: boolean;
  created_by: number | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface NewConfigurationTemplate {
  name: string;
  description?: string | null;
  domain_id?: number | null;
  template_data: string;
  is_default?: boolean | null;
  is_active?: boolean | null;
  created_by?: number | null;
}

// ===== CASE STUDY INTERFACES =====

export interface CaseStudy {
  id: number;
  title: string;
  description: string | null;
  domain_id: number;
  template_id: number | null;
  difficulty_level: string | null;
  estimated_duration: number | null; // minutes
  learning_objectives: string | null; // JSON array
  tags: string | null; // JSON array
  content: string; // Markdown content
  background_info: string | null;
  problem_statement: string | null;
  analysis_framework: string | null;
  sample_solution: string | null;
  metadata: string | null; // JSON
  status: string;
  created_by: number;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  published_at: string | null; // ISO date string
}

export interface NewCaseStudy {
  title: string;
  description?: string | null;
  domain_id: number;
  template_id?: number | null;
  difficulty_level?: string | null;
  estimated_duration?: number | null;
  learning_objectives?: string | null;
  tags?: string | null;
  content: string;
  background_info?: string | null;
  problem_statement?: string | null;
  analysis_framework?: string | null;
  sample_solution?: string | null;
  metadata?: string | null;
  status?: string | null;
  created_by: number;
}

export interface UpdateCaseStudy {
  title?: string | null;
  description?: string | null;
  domain_id?: number | null;
  template_id?: number | null;
  difficulty_level?: string | null;
  estimated_duration?: number | null;
  learning_objectives?: string | null;
  tags?: string | null;
  content?: string | null;
  background_info?: string | null;
  problem_statement?: string | null;
  analysis_framework?: string | null;
  sample_solution?: string | null;
  metadata?: string | null;
  status?: string | null;
}

// ===== ASSESSMENT QUESTION INTERFACES =====

export interface AssessmentQuestion {
  id: number;
  case_study_id: number;
  question_text: string;
  question_type: string;
  options: string | null; // JSON array for multiple choice
  correct_answer: string | null;
  sample_answer: string | null;
  rubric: string | null; // JSON rubric
  points: number;
  order_index: number;
  is_required: boolean;
  created_at: string; // ISO date string
}

export interface NewAssessmentQuestion {
  case_study_id: number;
  question_text: string;
  question_type: string;
  options?: string | null;
  correct_answer?: string | null;
  sample_answer?: string | null;
  rubric?: string | null;
  points?: number | null;
  order_index?: number | null;
  is_required?: boolean | null;
}

// ===== GENERATION HISTORY INTERFACES =====

export interface GenerationHistory {
  id: number;
  case_study_id: number | null;
  generation_type: string;
  prompt_template: string | null;
  user_input: string | null; // JSON of user inputs
  ai_provider: string | null;
  model_name: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  generation_time_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_by: number | null;
  created_at: string; // ISO date string
}

export interface NewGenerationHistory {
  case_study_id?: number | null;
  generation_type: string;
  prompt_template?: string | null;
  user_input?: string | null;
  ai_provider?: string | null;
  model_name?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  generation_time_ms?: number | null;
  success?: boolean | null;
  error_message?: string | null;
  created_by?: number | null;
}

// ===== USER PROGRESS INTERFACES =====

export interface UserProgress {
  id: number;
  user_id: number;
  case_study_id: number;
  status: string;
  time_spent: number; // seconds
  answers: string | null; // JSON of user answers
  score: number | null; // percentage
  feedback: string | null;
  notes: string | null;
  started_at: string | null; // ISO date string
  completed_at: string | null; // ISO date string
  last_accessed: string; // ISO date string
  created_at: string; // ISO date string
}

export interface NewUserProgress {
  user_id: number;
  case_study_id: number;
  status?: string | null;
  time_spent?: number | null;
  answers?: string | null;
  score?: number | null;
  feedback?: string | null;
  notes?: string | null;
  started_at?: string | null;
}

// ===== APP SETTING INTERFACES =====

export interface AppSetting {
  id: number;
  key: string;
  value: string;
  data_type: string;
  description: string | null;
  is_user_configurable: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface NewAppSetting {
  key: string;
  value: string;
  data_type?: string | null;
  description?: string | null;
  is_user_configurable?: boolean | null;
}

// ===== ATTACHMENT INTERFACES =====

export interface Attachment {
  id: number;
  case_study_id: number;
  filename: string;
  original_name: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_by: number | null;
  created_at: string; // ISO date string
}

export interface NewAttachment {
  case_study_id: number;
  filename: string;
  original_name?: string | null;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  description?: string | null;
  uploaded_by?: number | null;
}

// ===== COLLECTION INTERFACES =====

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  created_by: number;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface NewCollection {
  name: string;
  description?: string | null;
  is_public?: boolean | null;
  created_by: number;
}

export interface CollectionCaseStudy {
  collection_id: number;
  case_study_id: number;
  order_index: number;
  added_at: string; // ISO date string
}

export interface NewCollectionCaseStudy {
  collection_id: number;
  case_study_id: number;
  order_index?: number | null;
}

// ===== VIEW MODEL INTERFACES =====

export interface CaseStudySummary {
  id: number;
  title: string;
  description: string | null;
  difficulty_level: string | null;
  estimated_duration: number | null;
  status: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  domain_name: string;
  domain_color: string | null;
  author: string;
  question_count: number;
}

export interface UserProgressSummary {
  user_id: number;
  username: string;
  completed_count: number;
  in_progress_count: number;
  total_attempted: number;
  average_score: number | null;
  total_time_spent: number;
}

// ===== DATABASE STATS INTERFACES =====

export interface DatabaseStats {
  user_count: number;
  case_study_count: number;
  domain_count: number;
  question_count: number;
  file_size_bytes: number;
}

export interface PoolStats {
  connections: number;
  idle_connections: number;
  max_connections: number;
}