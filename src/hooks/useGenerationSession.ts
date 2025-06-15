import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface GenerationSession {
  id: string;
  name: string;
  framework: string;
  status: 'draft' | 'generating' | 'completed' | 'error';
  progress: number;
  createdAt: string;
  updatedAt: string;
  data: Record<string, any>;
  result?: GeneratedCaseStudy;
  error?: string;
}

export interface GeneratedCaseStudy {
  id: string;
  title: string;
  content: string;
  sections: CaseStudySection[];
  metadata: CaseStudyMetadata;
  generatedAt: string;
}

export interface CaseStudySection {
  id: string;
  title: string;
  content: string;
  type: string;
  order: number;
}

export interface CaseStudyMetadata {
  framework: string;
  wordCount: number;
  estimatedReadTime: number;
  difficulty: string;
  keywords: string[];
  learningObjectives: string[];
}

export interface GenerationOptions {
  outputType: 'full' | 'outline' | 'questions_only';
  wordCount: 'short' | 'medium' | 'long';
  includeQuestions: boolean;
  includeRubric: boolean;
  includeInstructions: boolean;
  tone: 'academic' | 'professional' | 'conversational';
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export interface UseGenerationSessionReturn {
  sessions: GenerationSession[];
  currentSession: GenerationSession | null;
  isGenerating: boolean;
  error: string | null;
  
  // Session management
  createSession: (name: string, framework: string) => Promise<string>;
  loadSession: (sessionId: string) => Promise<void>;
  saveSession: (sessionId: string, data: Record<string, any>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  duplicateSession: (sessionId: string, newName: string) => Promise<string>;
  
  // Generation
  generateCaseStudy: (
    sessionId: string,
    configurationId: string,
    formData: Record<string, any>,
    options: GenerationOptions
  ) => Promise<void>;
  
  // Progress tracking
  getGenerationProgress: (sessionId: string) => number;
  cancelGeneration: (sessionId: string) => Promise<void>;
  
  // Export/Import
  exportSession: (sessionId: string) => Promise<string>;
  importSession: (filePath: string) => Promise<string>;
  
  // Utilities
  clearError: () => void;
  refreshSessions: () => Promise<void>;
}

export function useGenerationSession(): UseGenerationSessionReturn {
  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const [currentSession, setCurrentSession] = useState<GenerationSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of active generation requests for cancellation
  const generationControllers = useRef<Map<string, AbortController>>(new Map());

  const clearError = useCallback(() => setError(null), []);

  // Session management
  const createSession = useCallback(async (name: string, framework: string): Promise<string> => {
    try {
      clearError();
      
      const sessionId = crypto.randomUUID();
      const newSession: GenerationSession = {
        id: sessionId,
        name,
        framework,
        status: 'draft',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: {},
      };

      setSessions(prev => [...prev, newSession]);
      setCurrentSession(newSession);
      
      return sessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to create session: ${errorMessage}`);
      throw err;
    }
  }, [clearError]);

  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      clearError();
      
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      setCurrentSession(session);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to load session: ${errorMessage}`);
      throw err;
    }
  }, [sessions, clearError]);

  const saveSession = useCallback(async (sessionId: string, data: Record<string, any>): Promise<void> => {
    try {
      clearError();
      
      const updatedSession: GenerationSession = {
        ...sessions.find(s => s.id === sessionId)!,
        data,
        updatedAt: new Date().toISOString(),
      };

      setSessions(prev => prev.map(s => s.id === sessionId ? updatedSession : s));
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(updatedSession);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to save session: ${errorMessage}`);
      throw err;
    }
  }, [sessions, currentSession, clearError]);

  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      clearError();
      
      // Cancel any active generation for this session
      const controller = generationControllers.current.get(sessionId);
      if (controller) {
        controller.abort();
        generationControllers.current.delete(sessionId);
      }
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to delete session: ${errorMessage}`);
      throw err;
    }
  }, [currentSession, clearError]);

  const duplicateSession = useCallback(async (sessionId: string, newName: string): Promise<string> => {
    try {
      clearError();
      
      const originalSession = sessions.find(s => s.id === sessionId);
      if (!originalSession) {
        throw new Error('Session not found');
      }
      
      const newSessionId = crypto.randomUUID();
      const duplicatedSession: GenerationSession = {
        ...originalSession,
        id: newSessionId,
        name: newName,
        status: 'draft',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        result: undefined, // Don't copy the generated result
        error: undefined,
      };

      setSessions(prev => [...prev, duplicatedSession]);
      
      return newSessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to duplicate session: ${errorMessage}`);
      throw err;
    }
  }, [sessions, clearError]);

  // Generation
  const generateCaseStudy = useCallback(async (
    sessionId: string,
    configurationId: string,
    formData: Record<string, any>,
    options: GenerationOptions
  ): Promise<void> => {
    try {
      clearError();
      setIsGenerating(true);

      // Update session status
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, status: 'generating' as const, progress: 0, updatedAt: new Date().toISOString() }
          : s
      ));

      // Create abort controller for cancellation
      const controller = new AbortController();
      generationControllers.current.set(sessionId, controller);

      try {
        // Call the Rust backend to generate case study
        const result = await invoke<GeneratedCaseStudy>('generate_case_study_enhanced', {
          configurationId,
          formData,
          options,
          signal: controller.signal,
        });

        // Update session with result
        setSessions(prev => prev.map(s => 
          s.id === sessionId 
            ? { 
                ...s, 
                status: 'completed' as const, 
                progress: 100, 
                result,
                updatedAt: new Date().toISOString() 
              }
            : s
        ));

        if (currentSession?.id === sessionId) {
          setCurrentSession(prev => prev ? { ...prev, status: 'completed', progress: 100, result } : null);
        }

      } catch (generationError) {
        if (generationError instanceof Error && generationError.name === 'AbortError') {
          // Generation was cancelled
          setSessions(prev => prev.map(s => 
            s.id === sessionId 
              ? { ...s, status: 'draft' as const, progress: 0, updatedAt: new Date().toISOString() }
              : s
          ));
        } else {
          // Generation failed
          const errorMessage = generationError instanceof Error ? generationError.message : String(generationError);
          setSessions(prev => prev.map(s => 
            s.id === sessionId 
              ? { 
                  ...s, 
                  status: 'error' as const, 
                  error: errorMessage,
                  updatedAt: new Date().toISOString() 
                }
              : s
          ));
          throw generationError;
        }
      } finally {
        generationControllers.current.delete(sessionId);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to generate case study: ${errorMessage}`);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [currentSession, clearError]);

  const getGenerationProgress = useCallback((sessionId: string): number => {
    const session = sessions.find(s => s.id === sessionId);
    return session?.progress || 0;
  }, [sessions]);

  const cancelGeneration = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const controller = generationControllers.current.get(sessionId);
      if (controller) {
        controller.abort();
        generationControllers.current.delete(sessionId);
      }
      
      // Update session status
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, status: 'draft' as const, progress: 0, updatedAt: new Date().toISOString() }
          : s
      ));
      
      setIsGenerating(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to cancel generation: ${errorMessage}`);
      throw err;
    }
  }, []);

  // Export/Import
  const exportSession = useCallback(async (sessionId: string): Promise<string> => {
    try {
      clearError();
      
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const exportData = {
        session,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      const filePath = await invoke<string>('export_generation_session', {
        sessionData: exportData,
      });

      return filePath;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to export session: ${errorMessage}`);
      throw err;
    }
  }, [sessions, clearError]);

  const importSession = useCallback(async (filePath: string): Promise<string> => {
    try {
      clearError();
      
      const importData = await invoke<{ session: GenerationSession }>('import_generation_session', {
        filePath,
      });

      const importedSession: GenerationSession = {
        ...importData.session,
        id: crypto.randomUUID(), // Generate new ID
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSessions(prev => [...prev, importedSession]);
      
      return importedSession.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to import session: ${errorMessage}`);
      throw err;
    }
  }, [clearError]);

  const refreshSessions = useCallback(async (): Promise<void> => {
    try {
      clearError();
      
      // In a real implementation, this would load sessions from the backend
      // For now, we'll just keep the current sessions
      console.log('Refreshing sessions...');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to refresh sessions: ${errorMessage}`);
      throw err;
    }
  }, [clearError]);

  return {
    sessions,
    currentSession,
    isGenerating,
    error,
    
    // Session management
    createSession,
    loadSession,
    saveSession,
    deleteSession,
    duplicateSession,
    
    // Generation
    generateCaseStudy,
    getGenerationProgress,
    cancelGeneration,
    
    // Export/Import
    exportSession,
    importSession,
    
    // Utilities
    clearError,
    refreshSessions,
  };
}