// Re-export all types for easy importing throughout the application

// Core data model types
export * from './models';

// API and communication types  
export * from './api';

// Encryption and security types
export * from './encryption';

// Backup and restore types
export * from './backup';

// Additional utility types for the frontend
export type ID = number;
export type UUID = string;
export type Timestamp = string; // ISO date string
export type JSONString = string;

// Generic utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Form state types
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Loading state types
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface AsyncState<T> extends LoadingState {
  data?: T | null;
}

// Common UI component props
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

// Route parameters
export interface RouteParams {
  id?: string;
  caseStudyId?: string;
  userId?: string;
  domainId?: string;
  collectionId?: string;
}

// App-specific constants as types
export const USER_ROLES = ['admin', 'instructor', 'user'] as const;
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const CASE_STUDY_STATUSES = ['draft', 'review', 'published', 'archived'] as const;
export const QUESTION_TYPES = ['multiple_choice', 'short_answer', 'essay', 'analysis', 'reflection'] as const;
export const PROGRESS_STATUSES = ['not_started', 'in_progress', 'completed', 'reviewed'] as const;
export const GENERATION_TYPES = ['case_study', 'questions', 'outline', 'background'] as const;
export const DATA_TYPES = ['string', 'number', 'boolean', 'json'] as const;

export type UserRoleType = typeof USER_ROLES[number];
export type DifficultyLevelType = typeof DIFFICULTY_LEVELS[number];
export type CaseStudyStatusType = typeof CASE_STUDY_STATUSES[number];
export type QuestionTypeType = typeof QUESTION_TYPES[number];
export type ProgressStatusType = typeof PROGRESS_STATUSES[number];
export type GenerationTypeType = typeof GENERATION_TYPES[number];
export type DataTypeType = typeof DATA_TYPES[number];