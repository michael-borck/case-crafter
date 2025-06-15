import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Grid,
  Stack,
  Chip,
  Button,
  IconButton,
  Paper,
  Divider,
  TextField,
  LinearProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Category as CategoryIcon,
  Label as TagIcon,
  Psychology as AnalysisIcon,
  TrendingUp as TrendingIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
  Lightbulb as SuggestionIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  Science as ScienceIcon,
  Engineering as EngineeringIcon,
  StarBorder as StarIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
} from '@mui/icons-material';
import { Category, Tag } from './CategoryManager';
import { TagSelector } from './TagSelector';

interface CategorizationResult {
  category: {
    suggested: string;
    confidence: number;
    reasons: string[];
    alternatives: Array<{
      name: string;
      confidence: number;
      reason: string;
    }>;
  };
  tags: Array<{
    name: string;
    confidence: number;
    reason: string;
    type: 'ai' | 'keyword' | 'content' | 'context';
  }>;
  difficulty: {
    level: 'beginner' | 'intermediate' | 'advanced';
    confidence: number;
    indicators: string[];
  };
  contentType: {
    suggested: string;
    confidence: number;
    characteristics: string[];
  };
  metadata: {
    wordCount: number;
    readingTime: number;
    complexity: number;
    topics: string[];
    entities: string[];
  };
}

interface CategorizationAssistantProps {
  content: {
    title: string;
    description: string;
    fullContent?: string;
  };
  categories: Category[];
  availableTags: Tag[];
  currentCategory?: string;
  currentTags?: string[];
  onCategoryChange?: (category: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onSave?: (result: CategorizationResult) => void;
  autoAnalyze?: boolean;
  showAdvanced?: boolean;
}

export const CategorizationAssistant: React.FC<CategorizationAssistantProps> = ({
  content,
  categories,
  availableTags,
  currentCategory,
  currentTags = [],
  onCategoryChange,
  onTagsChange,
  onSave,
  autoAnalyze = true,
  showAdvanced = false,
}) => {
  // State management
  const [analysisResult, setAnalysisResult] = useState<CategorizationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [userFeedback, setUserFeedback] = useState<Record<string, 'positive' | 'negative'>>({});
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory || '');
  const [selectedTags, setSelectedTags] = useState(currentTags);
  const [showDetails, setShowDetails] = useState(false);
  const [confidence, setConfidence] = useState(0);

  // Auto-analyze when content changes
  useEffect(() => {
    if (autoAnalyze && (content.title || content.description)) {
      analyzeContent();
    }
  }, [content.title, content.description, content.fullContent, autoAnalyze]);

  // Simulate AI-powered content analysis
  const analyzeContent = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const text = [content.title, content.description, content.fullContent].filter(Boolean).join(' ');
      const wordCount = text.split(' ').length;
      
      // Analyze content characteristics
      const result: CategorizationResult = {
        category: {
          suggested: determineCategoryFromContent(text, categories),
          confidence: 0.85,
          reasons: [
            'Content mentions business strategy concepts',
            'Uses management terminology',
            'Focuses on organizational challenges'
          ],
          alternatives: [
            { name: 'Technology', confidence: 0.72, reason: 'Contains technical references' },
            { name: 'Finance', confidence: 0.68, reason: 'Mentions financial metrics' }
          ]
        },
        tags: generateTagSuggestions(text, availableTags),
        difficulty: {
          level: determineDifficulty(text),
          confidence: 0.78,
          indicators: [
            'Advanced vocabulary usage',
            'Complex sentence structures',
            'Industry-specific terminology'
          ]
        },
        contentType: {
          suggested: determineContentType(text),
          confidence: 0.82,
          characteristics: [
            'Structured problem presentation',
            'Multiple stakeholders mentioned',
            'Decision-making scenario'
          ]
        },
        metadata: {
          wordCount,
          readingTime: Math.ceil(wordCount / 200),
          complexity: calculateComplexity(text),
          topics: extractTopics(text),
          entities: extractEntities(text)
        }
      };

      setAnalysisResult(result);
      setSelectedCategory(result.category.suggested);
      setSelectedTags(result.tags.slice(0, 5).map(t => t.name));
      setConfidence(result.category.confidence);
      
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [content, categories, availableTags]);

  // Handle user feedback on suggestions
  const handleFeedback = useCallback((suggestionId: string, feedback: 'positive' | 'negative') => {
    setUserFeedback(prev => ({ ...prev, [suggestionId]: feedback }));
    
    // In a real app, this would send feedback to improve the AI model
    console.log(`User feedback for ${suggestionId}: ${feedback}`);
  }, []);

  // Save the categorization result
  const handleSave = useCallback(() => {
    if (!analysisResult) return;
    
    const finalResult: CategorizationResult = {
      ...analysisResult,
      category: {
        ...analysisResult.category,
        suggested: selectedCategory
      },
      tags: selectedTags.map(tag => ({
        name: tag,
        confidence: 0.9,
        reason: 'User confirmed',
        type: 'ai' as const
      }))
    };
    
    if (onCategoryChange) onCategoryChange(selectedCategory);
    if (onTagsChange) onTagsChange(selectedTags);
    if (onSave) onSave(finalResult);
  }, [analysisResult, selectedCategory, selectedTags, onCategoryChange, onTagsChange, onSave]);

  // Render analysis steps
  const steps = [
    {
      label: 'Content Analysis',
      description: 'AI analyzes the content structure and characteristics',
      completed: !!analysisResult
    },
    {
      label: 'Category Suggestion',
      description: 'Suggests the most appropriate category',
      completed: !!selectedCategory
    },
    {
      label: 'Tag Recommendations',
      description: 'Identifies relevant tags and topics',
      completed: selectedTags.length > 0
    },
    {
      label: 'Review & Confirm',
      description: 'Review and adjust the suggestions',
      completed: false
    }
  ];

  const renderAnalysisStep = () => (
    <Card>
      <CardContent>
        {isAnalyzing ? (
          <Box>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Analyzing content with AI...
            </Typography>
          </Box>
        ) : analysisResult ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Analysis completed with {Math.round(confidence * 100)}% confidence
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="h6" color="primary">
                  {analysisResult.metadata.wordCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Words
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="h6" color="success.main">
                  {analysisResult.metadata.readingTime}min
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Reading Time
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="h6" color="info.main">
                  {analysisResult.difficulty.level}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Difficulty
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="h6" color="warning.main">
                  {analysisResult.metadata.complexity}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Complexity
                </Typography>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Button
            variant="contained"
            startIcon={<AnalysisIcon />}
            onClick={analyzeContent}
            disabled={!content.title && !content.description}
          >
            Analyze Content
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const renderCategoryStep = () => (
    <Card>
      <CardHeader
        title="Category Suggestion"
        action={
          analysisResult && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {Math.round(analysisResult.category.confidence * 100)}% confident
              </Typography>
              <IconButton size="small" onClick={() => handleFeedback('category', 'positive')}>
                <ThumbUpIcon color={userFeedback.category === 'positive' ? 'primary' : 'inherit'} />
              </IconButton>
              <IconButton size="small" onClick={() => handleFeedback('category', 'negative')}>
                <ThumbDownIcon color={userFeedback.category === 'negative' ? 'error' : 'inherit'} />
              </IconButton>
            </Box>
          )
        }
      />
      <CardContent>
        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            label="Category"
          >
            {categories.map(category => (
              <MenuItem key={category.id} value={category.name}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CategoryIcon sx={{ color: category.color, mr: 1 }} />
                  {category.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {analysisResult && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Why this category?
            </Typography>
            <Stack spacing={1}>
              {analysisResult.category.reasons.map((reason, index) => (
                <Typography key={index} variant="body2" color="text.secondary">
                  • {reason}
                </Typography>
              ))}
            </Stack>
            
            {analysisResult.category.alternatives.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Alternative categories:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {analysisResult.category.alternatives.map((alt, index) => (
                    <Tooltip key={index} title={alt.reason}>
                      <Chip
                        label={`${alt.name} (${Math.round(alt.confidence * 100)}%)`}
                        size="small"
                        variant="outlined"
                        clickable
                        onClick={() => setSelectedCategory(alt.name)}
                      />
                    </Tooltip>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderTagStep = () => (
    <Card>
      <CardHeader
        title="Tag Suggestions"
        action={
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={analyzeContent}
            disabled={isAnalyzing}
          >
            Refresh
          </Button>
        }
      />
      <CardContent>
        <TagSelector
          selectedTags={selectedTags}
          onChange={setSelectedTags}
          categories={categories}
          availableTags={availableTags}
          contentType={analysisResult?.contentType.suggested}
          contentCategory={selectedCategory}
          difficulty={analysisResult?.difficulty.level}
          maxTags={10}
          showSuggestions={true}
          showTrending={true}
          showRecent={true}
        />
        
        {analysisResult && analysisResult.tags.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              AI Suggested Tags:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {analysisResult.tags.map((tagSuggestion, index) => (
                <Tooltip key={index} title={tagSuggestion.reason}>
                  <Chip
                    label={`${tagSuggestion.name} (${Math.round(tagSuggestion.confidence * 100)}%)`}
                    size="small"
                    color={selectedTags.includes(tagSuggestion.name) ? 'primary' : 'default'}
                    variant={selectedTags.includes(tagSuggestion.name) ? 'filled' : 'outlined'}
                    clickable
                    onClick={() => {
                      if (selectedTags.includes(tagSuggestion.name)) {
                        setSelectedTags(prev => prev.filter(t => t !== tagSuggestion.name));
                      } else {
                        setSelectedTags(prev => [...prev, tagSuggestion.name]);
                      }
                    }}
                    icon={<TagIcon />}
                  />
                </Tooltip>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderReviewStep = () => (
    <Card>
      <CardHeader
        title="Review & Confirm"
        action={
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!selectedCategory || selectedTags.length === 0}
          >
            Save Categorization
          </Button>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Category
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CategoryIcon sx={{ mr: 1 }} />
                <Typography variant="body1">{selectedCategory || 'None selected'}</Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Tags ({selectedTags.length})
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, minHeight: 60 }}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {selectedTags.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    color="primary"
                    onDelete={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                  />
                ))}
                {selectedTags.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No tags selected
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
        
        {analysisResult && (
          <Box sx={{ mt: 3 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandIcon />}>
                <Typography variant="subtitle2">Content Analysis Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Detected Topics
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {analysisResult.metadata.topics.map(topic => (
                        <Chip key={topic} label={topic} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Key Entities
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {analysisResult.metadata.entities.map(entity => (
                        <Chip key={entity} label={entity} size="small" variant="outlined" color="secondary" />
                      ))}
                    </Stack>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Content Categorization Assistant
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AIIcon />}
            onClick={analyzeContent}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
          </Button>
        </Box>
      </Box>

      {/* Progress Stepper */}
      <Stepper orientation="vertical" sx={{ mb: 3 }}>
        {steps.map((step, index) => (
          <Step key={step.label} active={index === activeStep} completed={step.completed}>
            <StepLabel>
              <Typography variant="subtitle1">{step.label}</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {step.description}
              </Typography>
              {index === 0 && renderAnalysisStep()}
              {index === 1 && renderCategoryStep()}
              {index === 2 && renderTagStep()}
              {index === 3 && renderReviewStep()}
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(index + 1)}
                  disabled={index === steps.length - 1}
                  sx={{ mr: 1 }}
                >
                  {index === steps.length - 1 ? 'Complete' : 'Continue'}
                </Button>
                <Button
                  disabled={index === 0}
                  onClick={() => setActiveStep(index - 1)}
                >
                  Back
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

// Helper functions for content analysis
function determineCategoryFromContent(text: string, categories: Category[]): string {
  const lowerText = text.toLowerCase();
  
  // Simple keyword-based categorization
  if (lowerText.includes('business') || lowerText.includes('strategy') || lowerText.includes('management')) {
    return 'Business';
  }
  if (lowerText.includes('technology') || lowerText.includes('software') || lowerText.includes('digital')) {
    return 'Technology';
  }
  if (lowerText.includes('education') || lowerText.includes('learning') || lowerText.includes('student')) {
    return 'Education';
  }
  
  return categories[0]?.name || 'General';
}

function generateTagSuggestions(text: string, availableTags: Tag[]) {
  const lowerText = text.toLowerCase();
  const suggestions: Array<{name: string, confidence: number, reason: string, type: 'ai' | 'keyword' | 'content' | 'context'}> = [];
  
  // Find matching tags based on keywords
  availableTags.forEach(tag => {
    const tagName = tag.name.toLowerCase();
    if (lowerText.includes(tagName)) {
      suggestions.push({
        name: tag.name,
        confidence: 0.9,
        reason: `Found direct mention of "${tag.name}"`,
        type: 'keyword'
      });
    }
    
    // Check synonyms
    tag.synonyms.forEach(synonym => {
      if (lowerText.includes(synonym.toLowerCase())) {
        suggestions.push({
          name: tag.name,
          confidence: 0.7,
          reason: `Found synonym "${synonym}"`,
          type: 'keyword'
        });
      }
    });
  });
  
  return suggestions.slice(0, 8);
}

function determineDifficulty(text: string): 'beginner' | 'intermediate' | 'advanced' {
  const wordCount = text.split(' ').length;
  const avgWordLength = text.replace(/[^a-zA-Z\s]/g, '').split(' ')
    .reduce((sum, word) => sum + word.length, 0) / wordCount;
  
  if (avgWordLength > 6 || wordCount > 1000) return 'advanced';
  if (avgWordLength > 5 || wordCount > 500) return 'intermediate';
  return 'beginner';
}

function determineContentType(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('case study') || lowerText.includes('scenario')) return 'case_study';
  if (lowerText.includes('template') || lowerText.includes('framework')) return 'template';
  if (lowerText.includes('assessment') || lowerText.includes('question')) return 'assessment';
  if (lowerText.includes('example') || lowerText.includes('sample')) return 'example';
  
  return 'case_study';
}

function calculateComplexity(text: string): number {
  const sentences = text.split(/[.!?]+/).length;
  const words = text.split(' ').length;
  const avgSentenceLength = words / sentences;
  
  return Math.min(100, Math.round((avgSentenceLength / 20) * 100));
}

function extractTopics(text: string): string[] {
  // Simple topic extraction based on common business/academic terms
  const topics = [];
  const lowerText = text.toLowerCase();
  
  const topicKeywords = [
    'strategy', 'marketing', 'finance', 'operations', 'leadership',
    'innovation', 'technology', 'digital transformation', 'analytics',
    'customer experience', 'supply chain', 'competitive analysis'
  ];
  
  topicKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      topics.push(keyword);
    }
  });
  
  return topics.slice(0, 5);
}

function extractEntities(text: string): string[] {
  // Simple entity extraction for common business entities
  const entities = [];
  const words = text.split(' ');
  
  // Look for capitalized words that might be company names or proper nouns
  words.forEach(word => {
    if (word.length > 3 && /^[A-Z][a-z]+$/.test(word) && 
        !['The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'Who', 'Why', 'How'].includes(word)) {
      entities.push(word);
    }
  });
  
  return [...new Set(entities)].slice(0, 5);
}