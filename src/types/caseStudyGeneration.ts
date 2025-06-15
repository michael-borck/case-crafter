// TypeScript interfaces for case study generation

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

export interface CaseStudyGenerationParams {
  industry: string;
  difficulty_level: DifficultyLevel;
  duration_minutes: number;
  learning_objectives: string[];
  company_size: CompanySize;
  target_length: number;
  additional_requirements?: string;
  geographical_context?: string;
  time_period?: string;
  specific_focus_areas: string[];
}

export interface CaseStudyMetadata {
  word_count: number;
  estimated_reading_time: number;
  complexity_score: number;
  primary_business_functions: string[];
  key_stakeholders: string[];
  decision_points: string[];
}

export interface GeneratedCaseStudy {
  title: string;
  content: string;
  summary: string;
  key_learning_points: string[];
  suggested_analysis_framework?: string;
  metadata: CaseStudyMetadata;
}

export interface CaseStudyGenerationRequest {
  params: CaseStudyGenerationParams;
  save_to_database?: boolean;
  generate_questions?: boolean;
}

export interface CaseStudyGenerationResult {
  case_study: GeneratedCaseStudy;
  validation_errors?: string[];
  generation_time_ms: number;
}

// Helper functions for working with case study generation
export class CaseStudyGenerationHelper {
  static createDefaultParams(): CaseStudyGenerationParams {
    return {
      industry: 'Technology',
      difficulty_level: 'intermediate',
      duration_minutes: 60,
      learning_objectives: ['Strategic analysis', 'Decision making'],
      company_size: 'medium',
      target_length: 800,
      specific_focus_areas: [],
    };
  }

  static validateParams(params: CaseStudyGenerationParams): string[] {
    const errors: string[] = [];

    // Industry validation
    if (!params.industry?.trim()) {
      errors.push('Industry cannot be empty');
    }
    if (params.industry?.length > 100) {
      errors.push('Industry name too long (max 100 characters)');
    }

    // Duration validation
    if (params.duration_minutes < 5) {
      errors.push('Duration must be at least 5 minutes');
    }
    if (params.duration_minutes > 480) {
      errors.push('Duration cannot exceed 8 hours');
    }

    // Learning objectives validation
    if (!params.learning_objectives?.length) {
      errors.push('At least one learning objective is required');
    }
    if (params.learning_objectives?.length > 10) {
      errors.push('Too many learning objectives (max 10)');
    }
    
    for (const objective of params.learning_objectives || []) {
      if (!objective?.trim()) {
        errors.push('Learning objectives cannot be empty');
        break;
      }
      if (objective.length > 200) {
        errors.push('Learning objective too long (max 200 characters)');
        break;
      }
    }

    // Target length validation
    if (params.target_length < 200) {
      errors.push('Target length must be at least 200 words');
    }
    if (params.target_length > 5000) {
      errors.push('Target length cannot exceed 5000 words');
    }

    // Focus areas validation
    if (params.specific_focus_areas?.length > 5) {
      errors.push('Too many focus areas (max 5)');
    }

    return errors;
  }

  static estimateGenerationTime(params: CaseStudyGenerationParams): number {
    // Estimate generation time based on complexity
    let baseTime = 30; // 30 seconds base time
    
    // Add time based on length
    baseTime += Math.floor(params.target_length / 100) * 5;
    
    // Add time based on difficulty
    switch (params.difficulty_level) {
      case 'advanced':
        baseTime += 20;
        break;
      case 'intermediate':
        baseTime += 10;
        break;
      case 'beginner':
        baseTime += 5;
        break;
    }
    
    // Add time for additional requirements
    if (params.additional_requirements) baseTime += 10;
    if (params.geographical_context) baseTime += 5;
    if (params.time_period) baseTime += 5;
    if (params.specific_focus_areas.length > 0) baseTime += params.specific_focus_areas.length * 3;
    
    return baseTime;
  }

  static formatReadingTime(minutes: number): string {
    if (minutes < 1) {
      return 'Less than 1 minute';
    } else if (minutes === 1) {
      return '1 minute';
    } else {
      return `${minutes} minutes`;
    }
  }

  static getComplexityLabel(score: number): string {
    if (score <= 1.5) return 'Simple';
    if (score <= 2.5) return 'Moderate';
    if (score <= 3.5) return 'Complex';
    return 'Very Complex';
  }

  static getDifficultyColor(level: DifficultyLevel): string {
    switch (level) {
      case 'beginner': return '#4CAF50'; // Green
      case 'intermediate': return '#FF9800'; // Orange
      case 'advanced': return '#F44336'; // Red
      default: return '#666666'; // Gray
    }
  }

  static getCompanySizeLabel(size: CompanySize): string {
    switch (size) {
      case 'startup': return 'Startup (1-10 employees)';
      case 'small': return 'Small (11-50 employees)';
      case 'medium': return 'Medium (51-250 employees)';
      case 'large': return 'Large (251-1000 employees)';
      case 'enterprise': return 'Enterprise (1000+ employees)';
      default: return 'Unknown size';
    }
  }
}

// Common industry options
export const INDUSTRY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Consulting',
  'Real Estate',
  'Transportation',
  'Energy',
  'Media & Entertainment',
  'Hospitality',
  'Agriculture',
  'Construction',
  'Government',
  'Non-profit',
] as const;

// Common learning objectives
export const LEARNING_OBJECTIVES_OPTIONS = [
  'Strategic analysis',
  'Decision making',
  'Problem solving',
  'Leadership development',
  'Financial analysis',
  'Market research',
  'Risk management',
  'Project management',
  'Change management',
  'Team collaboration',
  'Innovation',
  'Customer relations',
  'Operations management',
  'Quality assurance',
  'Regulatory compliance',
] as const;

// Common focus areas
export const FOCUS_AREAS_OPTIONS = [
  'Digital transformation',
  'Sustainability',
  'International expansion',
  'Cost reduction',
  'Revenue growth',
  'Market entry',
  'Competitive positioning',
  'Organizational change',
  'Technology adoption',
  'Customer experience',
  'Supply chain optimization',
  'Data analytics',
  'Cybersecurity',
  'Compliance',
  'Mergers & acquisitions',
] as const;