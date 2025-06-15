import { useState, useCallback, useEffect } from 'react';

export interface WizardStepState {
  isCompleted: boolean;
  isValid: boolean;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
}

export interface WizardState {
  currentStep: number;
  steps: Record<string, WizardStepState>;
  canProceed: boolean;
  totalSteps: number;
  completedSteps: number;
}

export interface UseWizardStateProps {
  stepIds: string[];
  initialStep?: number;
  onStepChange?: (stepIndex: number, stepId: string) => void;
  onComplete?: (allData: Record<string, any>) => void;
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
}

export interface UseWizardStateReturn {
  wizardState: WizardState;
  currentStepId: string;
  
  // Navigation
  goToStep: (stepIndex: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  
  // Step management
  updateStepData: (stepId: string, data: Record<string, any>) => void;
  setStepValid: (stepId: string, isValid: boolean, errors?: string[]) => void;
  setStepCompleted: (stepId: string, isCompleted: boolean) => void;
  addStepWarning: (stepId: string, warning: string) => void;
  clearStepWarnings: (stepId: string) => void;
  
  // Data management
  getAllData: () => Record<string, any>;
  getStepData: (stepId: string) => Record<string, any>;
  resetWizard: () => void;
  
  // Progress
  getProgress: () => number;
  getStepProgress: (stepId: string) => WizardStepState;
}

export function useWizardState({
  stepIds,
  initialStep = 0,
  onStepChange,
  onComplete,
  autoSave = false,
  autoSaveInterval = 30000,
}: UseWizardStateProps): UseWizardStateReturn {
  
  // Initialize wizard state
  const [wizardState, setWizardState] = useState<WizardState>(() => {
    const initialSteps: Record<string, WizardStepState> = {};
    stepIds.forEach(stepId => {
      initialSteps[stepId] = {
        isCompleted: false,
        isValid: false,
        data: {},
        errors: [],
        warnings: [],
      };
    });

    return {
      currentStep: Math.max(0, Math.min(initialStep, stepIds.length - 1)),
      steps: initialSteps,
      canProceed: false,
      totalSteps: stepIds.length,
      completedSteps: 0,
    };
  });

  const currentStepId = stepIds[wizardState.currentStep] || stepIds[0];

  // Update derived state when steps change
  useEffect(() => {
    const completedCount = Object.values(wizardState.steps).filter(step => step.isCompleted).length;
    const currentStepValid = wizardState.steps[currentStepId]?.isValid || false;

    setWizardState(prev => ({
      ...prev,
      completedSteps: completedCount,
      canProceed: currentStepValid,
    }));
  }, [wizardState.steps, currentStepId]);

  // Navigation functions
  const goToStep = useCallback((stepIndex: number) => {
    const validIndex = Math.max(0, Math.min(stepIndex, stepIds.length - 1));
    setWizardState(prev => ({
      ...prev,
      currentStep: validIndex,
    }));
    
    if (onStepChange) {
      onStepChange(validIndex, stepIds[validIndex]);
    }
  }, [stepIds, onStepChange]);

  const nextStep = useCallback(() => {
    if (wizardState.currentStep < stepIds.length - 1) {
      // Mark current step as completed when moving forward
      const currentStep = stepIds[wizardState.currentStep];
      setStepCompleted(currentStep, true);
      goToStep(wizardState.currentStep + 1);
    } else if (wizardState.currentStep === stepIds.length - 1) {
      // Wizard complete
      if (onComplete) {
        onComplete(getAllData());
      }
    }
  }, [wizardState.currentStep, stepIds, goToStep, onComplete]);

  const prevStep = useCallback(() => {
    if (wizardState.currentStep > 0) {
      goToStep(wizardState.currentStep - 1);
    }
  }, [wizardState.currentStep, goToStep]);

  // Step management functions
  const updateStepData = useCallback((stepId: string, data: Record<string, any>) => {
    setWizardState(prev => ({
      ...prev,
      steps: {
        ...prev.steps,
        [stepId]: {
          ...prev.steps[stepId],
          data: { ...prev.steps[stepId]?.data, ...data },
        },
      },
    }));
  }, []);

  const setStepValid = useCallback((stepId: string, isValid: boolean, errors: string[] = []) => {
    setWizardState(prev => ({
      ...prev,
      steps: {
        ...prev.steps,
        [stepId]: {
          ...prev.steps[stepId],
          isValid,
          errors,
        },
      },
    }));
  }, []);

  const setStepCompleted = useCallback((stepId: string, isCompleted: boolean) => {
    setWizardState(prev => ({
      ...prev,
      steps: {
        ...prev.steps,
        [stepId]: {
          ...prev.steps[stepId],
          isCompleted,
        },
      },
    }));
  }, []);

  const addStepWarning = useCallback((stepId: string, warning: string) => {
    setWizardState(prev => ({
      ...prev,
      steps: {
        ...prev.steps,
        [stepId]: {
          ...prev.steps[stepId],
          warnings: [...(prev.steps[stepId]?.warnings || []), warning],
        },
      },
    }));
  }, []);

  const clearStepWarnings = useCallback((stepId: string) => {
    setWizardState(prev => ({
      ...prev,
      steps: {
        ...prev.steps,
        [stepId]: {
          ...prev.steps[stepId],
          warnings: [],
        },
      },
    }));
  }, []);

  // Data management functions
  const getAllData = useCallback((): Record<string, any> => {
    const allData: Record<string, any> = {};
    Object.entries(wizardState.steps).forEach(([stepId, stepState]) => {
      allData[stepId] = stepState.data;
    });
    return allData;
  }, [wizardState.steps]);

  const getStepData = useCallback((stepId: string): Record<string, any> => {
    return wizardState.steps[stepId]?.data || {};
  }, [wizardState.steps]);

  const resetWizard = useCallback(() => {
    const resetSteps: Record<string, WizardStepState> = {};
    stepIds.forEach(stepId => {
      resetSteps[stepId] = {
        isCompleted: false,
        isValid: false,
        data: {},
        errors: [],
        warnings: [],
      };
    });

    setWizardState({
      currentStep: 0,
      steps: resetSteps,
      canProceed: false,
      totalSteps: stepIds.length,
      completedSteps: 0,
    });
  }, [stepIds]);

  // Progress calculation
  const getProgress = useCallback((): number => {
    if (wizardState.totalSteps === 0) return 0;
    return (wizardState.completedSteps / wizardState.totalSteps) * 100;
  }, [wizardState.completedSteps, wizardState.totalSteps]);

  const getStepProgress = useCallback((stepId: string): WizardStepState => {
    return wizardState.steps[stepId] || {
      isCompleted: false,
      isValid: false,
      data: {},
      errors: [],
      warnings: [],
    };
  }, [wizardState.steps]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || autoSaveInterval <= 0) return;

    const timer = setInterval(() => {
      // Save wizard state to localStorage
      const saveData = {
        wizardState,
        timestamp: Date.now(),
      };
      
      try {
        localStorage.setItem('wizard-autosave', JSON.stringify(saveData));
      } catch (error) {
        console.warn('Failed to auto-save wizard state:', error);
      }
    }, autoSaveInterval);

    return () => clearInterval(timer);
  }, [wizardState, autoSave, autoSaveInterval]);

  // Computed properties
  const canGoNext = wizardState.canProceed;
  const canGoPrev = wizardState.currentStep > 0;
  const isFirstStep = wizardState.currentStep === 0;
  const isLastStep = wizardState.currentStep === stepIds.length - 1;

  return {
    wizardState,
    currentStepId,
    
    // Navigation
    goToStep,
    nextStep,
    prevStep,
    canGoNext,
    canGoPrev,
    isFirstStep,
    isLastStep,
    
    // Step management
    updateStepData,
    setStepValid,
    setStepCompleted,
    addStepWarning,
    clearStepWarnings,
    
    // Data management
    getAllData,
    getStepData,
    resetWizard,
    
    // Progress
    getProgress,
    getStepProgress,
  };
}