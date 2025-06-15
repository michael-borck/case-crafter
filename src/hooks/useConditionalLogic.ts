import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ConditionalResult, ConditionalExpression } from '../types/configuration';

export interface UseConditionalLogicProps {
  configurationId: string;
  formData: Record<string, any>;
  enabled?: boolean;
}

export interface UseConditionalLogicReturn {
  fieldStates: Record<string, ConditionalResult>;
  dependencies: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
  evaluateExpression: (
    expression: ConditionalExpression,
    targetFieldId: string
  ) => Promise<boolean>;
  clearError: () => void;
  refresh: () => void;
}

export function useConditionalLogic({
  configurationId,
  formData,
  enabled = true,
}: UseConditionalLogicProps): UseConditionalLogicReturn {
  const [fieldStates, setFieldStates] = useState<Record<string, ConditionalResult>>({});
  const [dependencies, setDependencies] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize form data to prevent unnecessary re-evaluations
  const memoizedFormData = useMemo(() => formData, [
    JSON.stringify(formData)
  ]);

  const clearError = useCallback(() => setError(null), []);

  // Load field dependencies
  const loadDependencies = useCallback(async () => {
    if (!configurationId || !enabled) return;

    try {
      const deps = await invoke<Record<string, string[]>>('get_conditional_dependencies', {
        configurationId,
      });
      setDependencies(deps);
    } catch (err) {
      console.error('Failed to load conditional dependencies:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [configurationId, enabled]);

  // Evaluate all conditional logic for the form
  const evaluateFormConditions = useCallback(async () => {
    if (!configurationId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await invoke<Record<string, ConditionalResult>>('evaluate_form_conditions', {
        configurationId,
        formData: memoizedFormData,
      });
      setFieldStates(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to evaluate conditions: ${errorMessage}`);
      console.error('Failed to evaluate form conditions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [configurationId, memoizedFormData, enabled]);

  // Evaluate a single conditional expression
  const evaluateExpression = useCallback(async (
    expression: ConditionalExpression,
    targetFieldId: string
  ): Promise<boolean> => {
    if (!configurationId) return false;

    try {
      const result = await invoke<boolean>('evaluate_conditional_expression', {
        configurationId,
        expression,
        formData: memoizedFormData,
        targetFieldId,
      });
      return result;
    } catch (err) {
      console.error('Failed to evaluate expression:', err);
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [configurationId, memoizedFormData]);

  const refresh = useCallback(() => {
    loadDependencies();
    evaluateFormConditions();
  }, [loadDependencies, evaluateFormConditions]);

  // Load dependencies on mount and when configuration changes
  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  // Re-evaluate conditions when form data changes
  useEffect(() => {
    evaluateFormConditions();
  }, [evaluateFormConditions]);

  return {
    fieldStates,
    dependencies,
    isLoading,
    error,
    evaluateExpression,
    clearError,
    refresh,
  };
}

// Helper hook for checking if a field should be visible
export function useFieldVisibility(
  fieldId: string,
  conditionalResult?: ConditionalResult
): boolean {
  return useMemo(() => {
    if (!conditionalResult) return true;
    return conditionalResult.is_visible;
  }, [conditionalResult]);
}

// Helper hook for checking if a field should be enabled
export function useFieldEnabled(
  fieldId: string,
  conditionalResult?: ConditionalResult,
  defaultEnabled: boolean = true
): boolean {
  return useMemo(() => {
    if (!conditionalResult) return defaultEnabled;
    return conditionalResult.is_enabled;
  }, [conditionalResult, defaultEnabled]);
}

// Helper hook for getting field value override
export function useFieldValueOverride(
  fieldId: string,
  conditionalResult?: ConditionalResult
): any {
  return useMemo(() => {
    if (!conditionalResult) return undefined;
    return conditionalResult.value_override;
  }, [conditionalResult]);
}

// Helper hook for getting field options override
export function useFieldOptionsOverride(
  fieldId: string,
  conditionalResult?: ConditionalResult
): any[] | undefined {
  return useMemo(() => {
    if (!conditionalResult) return undefined;
    return conditionalResult.options_override;
  }, [conditionalResult]);
}

// Helper hook for getting field error override
export function useFieldErrorOverride(
  fieldId: string,
  conditionalResult?: ConditionalResult
): string | undefined {
  return useMemo(() => {
    if (!conditionalResult) return undefined;
    return conditionalResult.error_override;
  }, [conditionalResult]);
}