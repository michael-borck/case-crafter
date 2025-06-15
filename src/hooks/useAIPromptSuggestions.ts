import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface PromptSuggestion {
  id: string;
  text: string;
  category: 'scenario' | 'challenge' | 'context' | 'objective' | 'constraint' | 'stakeholder';
  confidence: number;
  framework?: string;
  industry?: string;
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  keywords: string[];
  isFavorite?: boolean;
  usage_count?: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  category: string;
  framework?: string;
  industry?: string;
  variables: string[];
  usage_count: number;
  is_custom: boolean;
  created_by?: string;
  tags: string[];
}

export interface PromptAnalysis {
  clarity_score: number;
  completeness_score: number;
  specificity_score: number;
  framework_alignment: number;
  suggestions: string[];
  missing_elements: string[];
  strengths: string[];
}

export interface UseAIPromptSuggestionsProps {
  framework?: string;
  industry?: string;
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  enableRealTimeAnalysis?: boolean;
  maxSuggestions?: number;
}

export interface UseAIPromptSuggestionsReturn {
  suggestions: PromptSuggestion[];
  templates: PromptTemplate[];
  analysis: PromptAnalysis | null;
  isLoadingSuggestions: boolean;
  isLoadingAnalysis: boolean;
  error: string | null;
  
  // Suggestion management
  generateSuggestions: (prompt: string, context?: Record<string, any>) => Promise<void>;
  acceptSuggestion: (suggestion: PromptSuggestion) => void;
  rejectSuggestion: (suggestionId: string) => void;
  toggleFavorite: (suggestionId: string) => Promise<void>;
  
  // Template management
  loadTemplates: (filters?: { category?: string; framework?: string; industry?: string }) => Promise<void>;
  saveTemplate: (template: Omit<PromptTemplate, 'id' | 'usage_count' | 'created_by'>) => Promise<string>;
  deleteTemplate: (templateId: string) => Promise<void>;
  
  // Analysis
  analyzePrompt: (prompt: string) => Promise<void>;
  getPromptScore: () => number;
  
  // History
  saveToHistory: (prompt: string) => void;
  getHistory: () => string[];
  clearHistory: () => void;
  
  // Utilities
  clearError: () => void;
  refreshData: () => Promise<void>;
}

export function useAIPromptSuggestions({
  framework,
  industry,
  complexity = 'intermediate',
  enableRealTimeAnalysis = true,
  maxSuggestions = 10,
}: UseAIPromptSuggestionsProps = {}): UseAIPromptSuggestionsReturn {
  
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();
  const suggestionCacheRef = useRef<Map<string, PromptSuggestion[]>>(new Map());

  const clearError = useCallback(() => setError(null), []);

  // Generate AI-powered suggestions
  const generateSuggestions = useCallback(async (prompt: string, context?: Record<string, any>) => {
    if (!prompt.trim() || prompt.length < 10) {
      setSuggestions([]);
      return;
    }

    // Check cache first
    const cacheKey = `${prompt.substring(0, 100)}-${framework}-${industry}`;
    const cachedSuggestions = suggestionCacheRef.current.get(cacheKey);
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions.slice(0, maxSuggestions));
      return;
    }

    setIsLoadingSuggestions(true);
    clearError();

    try {
      const requestData = {
        prompt: prompt.trim(),
        framework,
        industry,
        complexity,
        context: context || {},
        max_suggestions: maxSuggestions,
      };

      const generatedSuggestions = await invoke<PromptSuggestion[]>('generate_prompt_suggestions', requestData);
      
      // Cache results
      suggestionCacheRef.current.set(cacheKey, generatedSuggestions);
      
      // Limit cache size
      if (suggestionCacheRef.current.size > 50) {
        const firstKey = suggestionCacheRef.current.keys().next().value;
        suggestionCacheRef.current.delete(firstKey);
      }
      
      setSuggestions(generatedSuggestions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to generate suggestions: ${errorMessage}`);
      
      // Fallback to sample suggestions
      const fallbackSuggestions = generateFallbackSuggestions(prompt, framework, industry);
      setSuggestions(fallbackSuggestions);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [framework, industry, complexity, maxSuggestions, clearError]);

  // Accept a suggestion (track usage)
  const acceptSuggestion = useCallback((suggestion: PromptSuggestion) => {
    try {
      invoke('track_suggestion_usage', {
        suggestion_id: suggestion.id,
        action: 'accept',
        framework,
        industry,
      });
    } catch (error) {
      console.warn('Failed to track suggestion usage:', error);
    }
  }, [framework, industry]);

  // Reject a suggestion (improve future suggestions)
  const rejectSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    
    try {
      invoke('track_suggestion_usage', {
        suggestion_id: suggestionId,
        action: 'reject',
        framework,
        industry,
      });
    } catch (error) {
      console.warn('Failed to track suggestion rejection:', error);
    }
  }, [framework, industry]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    const newFavoriteStatus = !suggestion.isFavorite;
    
    setSuggestions(prev => prev.map(s => 
      s.id === suggestionId ? { ...s, isFavorite: newFavoriteStatus } : s
    ));

    try {
      await invoke('update_suggestion_favorite', {
        suggestion_id: suggestionId,
        is_favorite: newFavoriteStatus,
      });
    } catch (err) {
      // Revert on error
      setSuggestions(prev => prev.map(s => 
        s.id === suggestionId ? { ...s, isFavorite: !newFavoriteStatus } : s
      ));
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to update favorite: ${errorMessage}`);
    }
  }, [suggestions]);

  // Load prompt templates
  const loadTemplates = useCallback(async (filters?: { category?: string; framework?: string; industry?: string }) => {
    try {
      const templateFilters = {
        category: filters?.category,
        framework: filters?.framework || framework,
        industry: filters?.industry || industry,
        complexity,
      };

      const loadedTemplates = await invoke<PromptTemplate[]>('get_prompt_templates', templateFilters);
      setTemplates(loadedTemplates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to load templates: ${errorMessage}`);
      
      // Fallback to sample templates
      setTemplates(generateFallbackTemplates());
    }
  }, [framework, industry, complexity]);

  // Save a new template
  const saveTemplate = useCallback(async (template: Omit<PromptTemplate, 'id' | 'usage_count' | 'created_by'>): Promise<string> => {
    try {
      const templateData = {
        ...template,
        framework: template.framework || framework,
        industry: template.industry || industry,
        is_custom: true,
      };

      const templateId = await invoke<string>('save_prompt_template', templateData);
      
      // Refresh templates
      await loadTemplates();
      
      return templateId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to save template: ${errorMessage}`);
      throw err;
    }
  }, [framework, industry, loadTemplates]);

  // Delete a template
  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      await invoke('delete_prompt_template', { template_id: templateId });
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to delete template: ${errorMessage}`);
      throw err;
    }
  }, []);

  // Analyze prompt quality
  const analyzePrompt = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setAnalysis(null);
      return;
    }

    setIsLoadingAnalysis(true);
    clearError();

    try {
      const analysisData = {
        prompt: prompt.trim(),
        framework,
        industry,
        complexity,
      };

      const promptAnalysis = await invoke<PromptAnalysis>('analyze_prompt_quality', analysisData);
      setAnalysis(promptAnalysis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to analyze prompt: ${errorMessage}`);
      
      // Fallback analysis
      setAnalysis(generateFallbackAnalysis(prompt));
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [framework, industry, complexity, clearError]);

  // Get overall prompt score
  const getPromptScore = useCallback((): number => {
    if (!analysis) return 0;
    
    return Math.round(
      (analysis.clarity_score + analysis.completeness_score + analysis.specificity_score + analysis.framework_alignment) / 4
    );
  }, [analysis]);

  // Real-time analysis with debouncing
  useEffect(() => {
    if (!enableRealTimeAnalysis) return;

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [enableRealTimeAnalysis]);

  // History management
  const saveToHistory = useCallback((prompt: string) => {
    if (!prompt.trim()) return;

    try {
      const history = getHistory();
      const newHistory = [prompt, ...history.filter(p => p !== prompt)].slice(0, 20);
      localStorage.setItem('ai-prompt-history', JSON.stringify(newHistory));
    } catch (error) {
      console.warn('Failed to save prompt to history:', error);
    }
  }, []);

  const getHistory = useCallback((): string[] => {
    try {
      const history = localStorage.getItem('ai-prompt-history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.warn('Failed to load prompt history:', error);
      return [];
    }
  }, []);

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem('ai-prompt-history');
    } catch (error) {
      console.warn('Failed to clear prompt history:', error);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadTemplates(),
      // Clear suggestion cache to force refresh
      (() => suggestionCacheRef.current.clear())(),
    ]);
  }, [loadTemplates]);

  // Initialize templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    suggestions,
    templates,
    analysis,
    isLoadingSuggestions,
    isLoadingAnalysis,
    error,
    
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    toggleFavorite,
    
    loadTemplates,
    saveTemplate,
    deleteTemplate,
    
    analyzePrompt,
    getPromptScore,
    
    saveToHistory,
    getHistory,
    clearHistory,
    
    clearError,
    refreshData,
  };
}

// Fallback functions for when backend is not available
function generateFallbackSuggestions(prompt: string, framework?: string, industry?: string): PromptSuggestion[] {
  const baseKeywords = prompt.toLowerCase().split(' ').filter(word => word.length > 3);
  
  return [
    {
      id: 'fallback-1',
      text: `Consider the regulatory environment and compliance requirements that may impact the scenario.`,
      category: 'context',
      confidence: 0.85,
      framework,
      industry,
      keywords: ['regulatory', 'compliance', 'environment'],
    },
    {
      id: 'fallback-2', 
      text: `Analyze the competitive landscape and potential market disruptions.`,
      category: 'challenge',
      confidence: 0.80,
      framework,
      industry,
      keywords: ['competitive', 'market', 'disruption'],
    },
    {
      id: 'fallback-3',
      text: `Define specific, measurable success criteria and key performance indicators.`,
      category: 'objective',
      confidence: 0.90,
      framework,
      industry,
      keywords: ['success', 'KPI', 'measurable'],
    },
  ];
}

function generateFallbackTemplates(): PromptTemplate[] {
  return [
    {
      id: 'fallback-template-1',
      name: 'Basic Business Scenario',
      description: 'A simple template for general business scenarios',
      template: 'A {{company_type}} company faces {{challenge}} and must {{action}} to {{outcome}}.',
      category: 'General',
      variables: ['company_type', 'challenge', 'action', 'outcome'],
      usage_count: 0,
      is_custom: false,
      tags: ['basic', 'general', 'business'],
    },
  ];
}

function generateFallbackAnalysis(prompt: string): PromptAnalysis {
  const words = prompt.trim().split(/\s+/);
  const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  return {
    clarity_score: Math.min(90, Math.max(40, 60 + (sentences.length * 5))),
    completeness_score: Math.min(90, Math.max(30, words.length * 2)),
    specificity_score: Math.min(85, Math.max(35, words.length * 1.5)),
    framework_alignment: 70,
    suggestions: [
      'Add more specific details about the industry context',
      'Include quantifiable metrics or constraints',
      'Clarify the timeline and urgency of the situation',
    ],
    missing_elements: ['stakeholder analysis', 'financial constraints', 'competitive factors'],
    strengths: ['clear problem statement', 'good industry context'],
  };
}