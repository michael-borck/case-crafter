import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  CaseStudyGenerationParams,
  GeneratedCaseStudy,
  CaseStudyGenerationHelper,
} from '../types/caseStudyGeneration';

interface UseCaseStudyGenerationReturn {
  // State
  isGenerating: boolean;
  generatedCaseStudy: GeneratedCaseStudy | null;
  error: string | null;
  validationErrors: string[];
  
  // Actions
  generateCaseStudy: (params: CaseStudyGenerationParams) => Promise<GeneratedCaseStudy | null>;
  validateParams: (params: CaseStudyGenerationParams) => Promise<string[]>;
  clearResults: () => void;
  clearError: () => void;
  
  // Utilities
  estimateGenerationTime: (params: CaseStudyGenerationParams) => number;
  getDefaultParams: () => CaseStudyGenerationParams;
}

export const useCaseStudyGeneration = (): UseCaseStudyGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCaseStudy, setGeneratedCaseStudy] = useState<GeneratedCaseStudy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed'
  ): Promise<T | null> => {
    try {
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : errorMessage;
      setError(message);
      console.error('Case study generation operation failed:', err);
      return null;
    }
  }, []);

  const generateCaseStudy = useCallback(async (params: CaseStudyGenerationParams): Promise<GeneratedCaseStudy | null> => {
    // Client-side validation first
    const clientValidationErrors = CaseStudyGenerationHelper.validateParams(params);
    if (clientValidationErrors.length > 0) {
      setValidationErrors(clientValidationErrors);
      return null;
    }

    setIsGenerating(true);
    setValidationErrors([]);
    
    const result = await handleOperation(
      async () => {
        // Server-side validation
        const serverValidationErrors = await invoke<string[]>('validate_case_study_params', { params });
        if (serverValidationErrors.length > 0) {
          setValidationErrors(serverValidationErrors);
          throw new Error(`Validation failed: ${serverValidationErrors.join(', ')}`);
        }

        // Generate case study
        const generated = await invoke<GeneratedCaseStudy>('generate_case_study_enhanced', { params });
        setGeneratedCaseStudy(generated);
        return generated;
      },
      'Failed to generate case study'
    );

    setIsGenerating(false);
    return result;
  }, [handleOperation]);

  const validateParams = useCallback(async (params: CaseStudyGenerationParams): Promise<string[]> => {
    const result = await handleOperation(
      () => invoke<string[]>('validate_case_study_params', { params }),
      'Failed to validate parameters'
    );
    
    const errors = result || [];
    setValidationErrors(errors);
    return errors;
  }, [handleOperation]);

  const clearResults = useCallback(() => {
    setGeneratedCaseStudy(null);
    setValidationErrors([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const estimateGenerationTime = useCallback((params: CaseStudyGenerationParams): number => {
    return CaseStudyGenerationHelper.estimateGenerationTime(params);
  }, []);

  const getDefaultParams = useCallback((): CaseStudyGenerationParams => {
    return CaseStudyGenerationHelper.createDefaultParams();
  }, []);

  return {
    // State
    isGenerating,
    generatedCaseStudy,
    error,
    validationErrors,
    
    // Actions
    generateCaseStudy,
    validateParams,
    clearResults,
    clearError,
    
    // Utilities
    estimateGenerationTime,
    getDefaultParams,
  };
};