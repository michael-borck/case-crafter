// Validation utilities and type guards for TypeScript interfaces

import type {
  User, NewUser,
  Domain, NewDomain,
  CaseStudy, NewCaseStudy,
  AssessmentQuestion, NewAssessmentQuestion,
  UserRole, DifficultyLevel, CaseStudyStatus, QuestionType, ProgressStatus
} from './models';

// ===== TYPE GUARDS =====

export function isUserRole(value: string): value is UserRole {
  return ['admin', 'instructor', 'user'].includes(value);
}

export function isDifficultyLevel(value: string): value is DifficultyLevel {
  return ['beginner', 'intermediate', 'advanced'].includes(value);
}

export function isCaseStudyStatus(value: string): value is CaseStudyStatus {
  return ['draft', 'review', 'published', 'archived'].includes(value);
}

export function isQuestionType(value: string): value is QuestionType {
  return ['multiple_choice', 'short_answer', 'essay', 'analysis', 'reflection'].includes(value);
}

export function isProgressStatus(value: string): value is ProgressStatus {
  return ['not_started', 'in_progress', 'completed', 'reviewed'].includes(value);
}

// ===== VALIDATION FUNCTIONS =====

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateUser(user: Partial<User>): ValidationResult {
  const errors: string[] = [];

  if (user.username !== undefined) {
    if (!user.username || user.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (user.username.length > 50) {
      errors.push('Username must be less than 50 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(user.username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }
  }

  if (user.email !== undefined && user.email !== null) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      errors.push('Invalid email format');
    }
  }

  if (user.role !== undefined && !isUserRole(user.role)) {
    errors.push('Invalid user role');
  }

  return { isValid: errors.length === 0, errors };
}

export function validateNewUser(newUser: NewUser): ValidationResult {
  const errors: string[] = [];

  if (!newUser.username || newUser.username.trim().length < 3) {
    errors.push('Username is required and must be at least 3 characters long');
  }

  const userValidation = validateUser({
    username: newUser.username,
    email: newUser.email ?? null,
    role: newUser.role ?? 'user'
  });
  errors.push(...userValidation.errors);

  return { isValid: errors.length === 0, errors };
}

export function validateDomain(domain: Partial<Domain>): ValidationResult {
  const errors: string[] = [];

  if (domain.name !== undefined) {
    if (!domain.name || domain.name.trim().length < 2) {
      errors.push('Domain name must be at least 2 characters long');
    }
    if (domain.name.length > 100) {
      errors.push('Domain name must be less than 100 characters');
    }
  }

  if (domain.color !== undefined && domain.color !== null) {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(domain.color)) {
      errors.push('Color must be a valid hex color code');
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateNewDomain(newDomain: NewDomain): ValidationResult {
  const errors: string[] = [];

  if (!newDomain.name || newDomain.name.trim().length < 2) {
    errors.push('Domain name is required and must be at least 2 characters long');
  }

  const domainValidation = validateDomain(newDomain);
  errors.push(...domainValidation.errors);

  return { isValid: errors.length === 0, errors };
}

export function validateCaseStudy(caseStudy: Partial<CaseStudy>): ValidationResult {
  const errors: string[] = [];

  if (caseStudy.title !== undefined) {
    if (!caseStudy.title || caseStudy.title.trim().length < 5) {
      errors.push('Case study title must be at least 5 characters long');
    }
    if (caseStudy.title.length > 200) {
      errors.push('Case study title must be less than 200 characters');
    }
  }

  if (caseStudy.difficulty_level !== undefined && caseStudy.difficulty_level !== null) {
    if (!isDifficultyLevel(caseStudy.difficulty_level)) {
      errors.push('Invalid difficulty level');
    }
  }

  if (caseStudy.status !== undefined && !isCaseStudyStatus(caseStudy.status)) {
    errors.push('Invalid case study status');
  }

  if (caseStudy.estimated_duration !== undefined && caseStudy.estimated_duration !== null) {
    if (caseStudy.estimated_duration < 1 || caseStudy.estimated_duration > 480) {
      errors.push('Estimated duration must be between 1 and 480 minutes');
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateNewCaseStudy(newCaseStudy: NewCaseStudy): ValidationResult {
  const errors: string[] = [];

  if (!newCaseStudy.title || newCaseStudy.title.trim().length < 5) {
    errors.push('Case study title is required and must be at least 5 characters long');
  }

  if (!newCaseStudy.content || newCaseStudy.content.trim().length < 10) {
    errors.push('Case study content is required and must be at least 10 characters long');
  }

  if (!newCaseStudy.domain_id || newCaseStudy.domain_id < 1) {
    errors.push('Valid domain ID is required');
  }

  if (!newCaseStudy.created_by || newCaseStudy.created_by < 1) {
    errors.push('Valid creator ID is required');
  }

  const caseStudyValidation = validateCaseStudy({
    title: newCaseStudy.title,
    difficulty_level: newCaseStudy.difficulty_level ?? null,
    status: newCaseStudy.status ?? 'draft',
    estimated_duration: newCaseStudy.estimated_duration ?? null
  });
  errors.push(...caseStudyValidation.errors);

  return { isValid: errors.length === 0, errors };
}

export function validateAssessmentQuestion(question: Partial<AssessmentQuestion>): ValidationResult {
  const errors: string[] = [];

  if (question.question_text !== undefined) {
    if (!question.question_text || question.question_text.trim().length < 5) {
      errors.push('Question text must be at least 5 characters long');
    }
    if (question.question_text.length > 1000) {
      errors.push('Question text must be less than 1000 characters');
    }
  }

  if (question.question_type !== undefined && !isQuestionType(question.question_type)) {
    errors.push('Invalid question type');
  }

  if (question.points !== undefined) {
    if (question.points < 0 || question.points > 100) {
      errors.push('Points must be between 0 and 100');
    }
  }

  if (question.order_index !== undefined) {
    if (question.order_index < 0) {
      errors.push('Order index must be non-negative');
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateNewAssessmentQuestion(newQuestion: NewAssessmentQuestion): ValidationResult {
  const errors: string[] = [];

  if (!newQuestion.question_text || newQuestion.question_text.trim().length < 5) {
    errors.push('Question text is required and must be at least 5 characters long');
  }

  if (!newQuestion.question_type || !isQuestionType(newQuestion.question_type)) {
    errors.push('Valid question type is required');
  }

  if (!newQuestion.case_study_id || newQuestion.case_study_id < 1) {
    errors.push('Valid case study ID is required');
  }

  const questionValidation = validateAssessmentQuestion({
    question_text: newQuestion.question_text,
    question_type: newQuestion.question_type,
    points: newQuestion.points || 1,
    order_index: newQuestion.order_index || 0
  });
  errors.push(...questionValidation.errors);

  return { isValid: errors.length === 0, errors };
}

// ===== JSON VALIDATION UTILITIES =====

export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function parseJSONSafely<T>(str: string | null, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
}

export function validateJSONArray(str: string | null): ValidationResult {
  if (!str) return { isValid: true, errors: [] };
  
  try {
    const parsed = JSON.parse(str);
    if (!Array.isArray(parsed)) {
      return { isValid: false, errors: ['Value must be a JSON array'] };
    }
    return { isValid: true, errors: [] };
  } catch {
    return { isValid: false, errors: ['Invalid JSON format'] };
  }
}

export function validateJSONObject(str: string | null): ValidationResult {
  if (!str) return { isValid: true, errors: [] };
  
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { isValid: false, errors: ['Value must be a JSON object'] };
    }
    return { isValid: true, errors: [] };
  } catch {
    return { isValid: false, errors: ['Invalid JSON format'] };
  }
}

// ===== UTILITY FUNCTIONS =====

export function sanitizeString(str: string | null | undefined, maxLength?: number): string {
  if (!str) return '';
  let sanitized = str.trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { isValid: errors.length === 0, errors };
}