import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Rating,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  TipsAndUpdates as TipsIcon,
  Psychology as BrainIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Lightbulb as IdeaIcon,
  Assessment as AnalysisIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useAIPromptSuggestions, PromptAnalysis } from '../../hooks/useAIPromptSuggestions';

export interface PromptEnhancementDialogProps {
  open: boolean;
  onClose: () => void;
  initialPrompt: string;
  onPromptUpdate: (enhancedPrompt: string) => void;
  framework?: string;
  industry?: string;
  complexity?: 'beginner' | 'intermediate' | 'advanced';
}

export const PromptEnhancementDialog: React.FC<PromptEnhancementDialogProps> = ({
  open,
  onClose,
  initialPrompt,
  onPromptUpdate,
  framework,
  industry,
  complexity = 'intermediate',
}) => {
  const [currentPrompt, setCurrentPrompt] = useState(initialPrompt);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const {
    analysis,
    suggestions,
    isLoadingAnalysis,
    error,
    analyzePrompt,
    generateSuggestions,
    getPromptScore,
    clearError,
  } = useAIPromptSuggestions({
    framework,
    industry,
    complexity,
    enableRealTimeAnalysis: false,
  });

  // Initialize with the provided prompt
  useEffect(() => {
    if (open && initialPrompt) {
      setCurrentPrompt(initialPrompt);
      setEnhancedPrompt('');
      setShowComparison(false);
      analyzePrompt(initialPrompt);
      generateSuggestions(initialPrompt);
    }
  }, [open, initialPrompt, analyzePrompt, generateSuggestions]);

  // Update analysis when prompt changes
  useEffect(() => {
    if (currentPrompt.trim() && currentPrompt !== initialPrompt) {
      const timeoutId = setTimeout(() => {
        analyzePrompt(currentPrompt);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentPrompt, initialPrompt, analyzePrompt]);

  const handleEnhancePrompt = async () => {
    setIsEnhancing(true);
    clearError();

    try {
      // Simulate AI enhancement process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would call the AI service
      const enhanced = await enhancePromptWithAI(currentPrompt, {
        framework,
        industry,
        complexity,
        analysis,
        suggestions,
      });
      
      setEnhancedPrompt(enhanced);
      setShowComparison(true);
    } catch (err) {
      console.error('Enhancement failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAcceptEnhancement = () => {
    onPromptUpdate(enhancedPrompt);
    onClose();
  };

  const handleRejectEnhancement = () => {
    onPromptUpdate(currentPrompt);
    onClose();
  };

  const handleApplySuggestion = (suggestionText: string) => {
    const newPrompt = currentPrompt ? `${currentPrompt}\n\n${suggestionText}` : suggestionText;
    setCurrentPrompt(newPrompt);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const overallScore = getPromptScore();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      scroll="body"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BrainIcon color="primary" sx={{ mr: 1 }} />
            AI Prompt Enhancement
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Current Prompt Section */}
          <Grid item xs={12} md={showComparison ? 6 : 12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Prompt
                  {analysis && (
                    <Chip 
                      label={`${overallScore}% - ${getScoreLabel(overallScore)}`}
                      color={getScoreColor(overallScore)}
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Typography>
                
                <TextField
                  multiline
                  fullWidth
                  rows={8}
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  variant="outlined"
                  placeholder="Enter your case study prompt..."
                />

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<AIIcon />}
                    onClick={handleEnhancePrompt}
                    disabled={!currentPrompt.trim() || isEnhancing}
                    fullWidth
                  >
                    {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Enhanced Prompt Section */}
          {showComparison && (
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ border: '2px solid', borderColor: 'primary.main' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    AI Enhanced Prompt
                    <Chip 
                      label="Enhanced"
                      color="primary"
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </Typography>
                  
                  <TextField
                    multiline
                    fullWidth
                    rows={8}
                    value={enhancedPrompt}
                    onChange={(e) => setEnhancedPrompt(e.target.value)}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Analysis Section */}
          {analysis && (
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <AnalysisIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Prompt Analysis</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        Quality Metrics
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Clarity</Typography>
                            <Typography variant="body2">{analysis.clarity_score}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={analysis.clarity_score} 
                            color={getScoreColor(analysis.clarity_score)}
                          />
                        </Box>
                        
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Completeness</Typography>
                            <Typography variant="body2">{analysis.completeness_score}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={analysis.completeness_score}
                            color={getScoreColor(analysis.completeness_score)}
                          />
                        </Box>
                        
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Specificity</Typography>
                            <Typography variant="body2">{analysis.specificity_score}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={analysis.specificity_score}
                            color={getScoreColor(analysis.specificity_score)}
                          />
                        </Box>
                        
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Framework Alignment</Typography>
                            <Typography variant="body2">{analysis.framework_alignment}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={analysis.framework_alignment}
                            color={getScoreColor(analysis.framework_alignment)}
                          />
                        </Box>
                      </Stack>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        Feedback
                      </Typography>
                      
                      {analysis.strengths.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="success.main" gutterBottom>
                            <CheckCircleIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                            Strengths
                          </Typography>
                          <List dense>
                            {analysis.strengths.map((strength, index) => (
                              <ListItem key={index} sx={{ py: 0 }}>
                                <ListItemText 
                                  primary={strength}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}

                      {analysis.missing_elements.length > 0 && (
                        <Box>
                          <Typography variant="body2" color="warning.main" gutterBottom>
                            <WarningIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                            Missing Elements
                          </Typography>
                          <List dense>
                            {analysis.missing_elements.map((element, index) => (
                              <ListItem key={index} sx={{ py: 0 }}>
                                <ListItemText 
                                  primary={element}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}

          {/* Suggestions Section */}
          {suggestions.length > 0 && (
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <IdeaIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">AI Suggestions ({suggestions.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {suggestions.slice(0, 5).map((suggestion) => (
                      <Card key={suggestion.id} variant="outlined">
                        <CardContent sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ flexGrow: 1, mr: 2 }}>
                              <Typography variant="body1" gutterBottom>
                                {suggestion.text}
                              </Typography>
                              <Stack direction="row" spacing={1}>
                                <Chip 
                                  label={suggestion.category} 
                                  size="small" 
                                  color="secondary" 
                                  variant="outlined" 
                                />
                                <Chip 
                                  label={`${Math.round(suggestion.confidence * 100)}% confidence`} 
                                  size="small" 
                                  color={suggestion.confidence > 0.8 ? 'success' : 'default'}
                                  variant="outlined" 
                                />
                              </Stack>
                            </Box>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleApplySuggestion(suggestion.text)}
                            >
                              Apply
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}
        </Grid>

        {isEnhancing && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" gutterBottom>
              AI is analyzing and enhancing your prompt...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {isLoadingAnalysis && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Analyzing prompt quality...
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {showComparison ? (
          <>
            <Button onClick={handleRejectEnhancement} color="inherit">
              Keep Original
            </Button>
            <Button 
              onClick={handleAcceptEnhancement} 
              variant="contained"
              startIcon={<CheckCircleIcon />}
            >
              Use Enhanced Version
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button 
              onClick={() => onPromptUpdate(currentPrompt)}
              variant="contained"
              disabled={!currentPrompt.trim()}
            >
              Save Changes
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// Simulate AI enhancement (in real app, this would call the backend)
async function enhancePromptWithAI(
  prompt: string, 
  context: {
    framework?: string;
    industry?: string;
    complexity?: string;
    analysis?: PromptAnalysis | null;
    suggestions?: any[];
  }
): Promise<string> {
  // Add framework-specific enhancements
  let enhanced = prompt;
  
  if (context.framework) {
    enhanced += `\n\nFramework Context: This scenario should be analyzed using ${context.framework} methodology.`;
  }
  
  if (context.industry) {
    enhanced += `\n\nIndustry Context: Consider ${context.industry} industry-specific factors such as regulations, market dynamics, and competitive landscape.`;
  }
  
  // Add missing elements based on analysis
  if (context.analysis?.missing_elements.length) {
    enhanced += `\n\nAdditional Considerations: Include analysis of ${context.analysis.missing_elements.join(', ')}.`;
  }
  
  // Add complexity-appropriate details
  if (context.complexity === 'advanced') {
    enhanced += `\n\nAdvanced Requirements: Provide detailed financial projections, risk assessment matrices, and stakeholder impact analysis.`;
  } else if (context.complexity === 'beginner') {
    enhanced += `\n\nLearning Objectives: Focus on fundamental business concepts and decision-making frameworks suitable for introductory coursework.`;
  }
  
  return enhanced.trim();
}