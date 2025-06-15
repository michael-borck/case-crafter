import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  Stack,
  Alert,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Tooltip,
  CircularProgress,
  Menu,
  MenuItem,
  Fade,
  Paper,
  ClickAwayListener,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Lightbulb as IdeaIcon,
  History as HistoryIcon,
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Psychology as BrainIcon,
  TipsAndUpdates as TipsIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

export interface PromptSuggestion {
  id: string;
  text: string;
  category: 'scenario' | 'challenge' | 'context' | 'objective' | 'constraint';
  confidence: number;
  framework?: string;
  industry?: string;
  isFavorite?: boolean;
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
  usageCount: number;
  isCustom: boolean;
}

export interface AIPromptAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  framework?: string;
  industry?: string;
  maxLength?: number;
  showSuggestions?: boolean;
  showTemplates?: boolean;
  showHistory?: boolean;
  onSuggestionAccept?: (suggestion: PromptSuggestion) => void;
  onTemplateSelect?: (template: PromptTemplate) => void;
}

export const AIPromptArea: React.FC<AIPromptAreaProps> = ({
  value,
  onChange,
  placeholder = "Describe your case study scenario in detail. The AI will help you craft a comprehensive prompt...",
  disabled = false,
  framework,
  industry,
  maxLength = 5000,
  showSuggestions = true,
  showTemplates = true,
  showHistory = true,
  onSuggestionAccept,
  onTemplateSelect,
}) => {
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [selectedSuggestionCategory, setSelectedSuggestionCategory] = useState<string>('all');
  const [customTemplateDialogOpen, setCustomTemplateDialogOpen] = useState(false);
  const [contextMenuAnchor, setContextMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>();

  // Sample suggestions and templates (in a real app, these would come from API)
  const sampleSuggestions: PromptSuggestion[] = [
    {
      id: '1',
      text: 'A mid-sized technology startup facing rapid growth challenges',
      category: 'scenario',
      confidence: 0.95,
      framework: 'Porter\'s Five Forces',
      industry: 'Technology',
    },
    {
      id: '2', 
      text: 'The company must decide between expanding internationally or focusing on domestic market penetration',
      category: 'challenge',
      confidence: 0.88,
      framework: 'SWOT Analysis',
    },
    {
      id: '3',
      text: 'Limited budget of $2M and 18-month timeline for implementation',
      category: 'constraint',
      confidence: 0.92,
    },
    {
      id: '4',
      text: 'Develop a comprehensive strategic plan that balances growth with operational efficiency',
      category: 'objective',
      confidence: 0.85,
    },
    {
      id: '5',
      text: 'The industry is experiencing digital transformation with increasing competition from AI-driven solutions',
      category: 'context',
      confidence: 0.90,
      industry: 'Technology',
    },
  ];

  const sampleTemplates: PromptTemplate[] = [
    {
      id: '1',
      name: 'Strategic Decision Template',
      description: 'Template for strategic business decisions',
      template: 'A {{company_type}} company named {{company_name}} in the {{industry}} sector is facing {{challenge}}. The company has {{constraints}} and needs to {{objective}} within {{timeframe}}.',
      category: 'Strategy',
      framework: 'SWOT Analysis',
      variables: ['company_type', 'company_name', 'industry', 'challenge', 'constraints', 'objective', 'timeframe'],
      usageCount: 45,
      isCustom: false,
    },
    {
      id: '2',
      name: 'Market Entry Template',
      description: 'Template for market entry scenarios',
      template: '{{company_name}} is considering entering the {{market_name}} market. The company currently operates in {{current_markets}} and has {{resources}}. Key challenges include {{challenges}} and opportunities include {{opportunities}}.',
      category: 'Market Analysis',
      framework: 'Porter\'s Five Forces',
      variables: ['company_name', 'market_name', 'current_markets', 'resources', 'challenges', 'opportunities'],
      usageCount: 32,
      isCustom: false,
    },
    {
      id: '3',
      name: 'Innovation Dilemma',
      description: 'Template for innovation and technology decisions',
      template: 'A {{company_size}} {{industry}} company must decide whether to {{innovation_choice}}. The current technology {{current_state}} while the new technology offers {{benefits}} but requires {{investments}}.',
      category: 'Innovation',
      variables: ['company_size', 'industry', 'innovation_choice', 'current_state', 'benefits', 'investments'],
      usageCount: 28,
      isCustom: false,
    },
  ];

  // Initialize sample data
  useEffect(() => {
    setSuggestions(sampleSuggestions);
    setTemplates(sampleTemplates);
    
    // Load history from localStorage
    const savedHistory = localStorage.getItem('ai-prompt-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.warn('Failed to parse prompt history:', error);
      }
    }
  }, []);

  // Generate AI suggestions based on current input
  const generateSuggestions = useCallback(async (text: string) => {
    if (!text.trim() || text.length < 10) {
      setSuggestions(sampleSuggestions);
      return;
    }

    setIsLoadingSuggestions(true);
    
    // Simulate AI suggestion generation
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would call an AI service
      const contextualSuggestions = sampleSuggestions.map(suggestion => ({
        ...suggestion,
        confidence: Math.max(0.7, suggestion.confidence - Math.random() * 0.2),
      }));
      
      setSuggestions(contextualSuggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Debounced suggestion generation
  useEffect(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    
    suggestionTimeoutRef.current = setTimeout(() => {
      if (showSuggestions && value) {
        generateSuggestions(value);
      }
    }, 1000);

    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [value, showSuggestions, generateSuggestions]);

  const handlePromptChange = useCallback((newValue: string) => {
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    onChange(newValue);
  }, [onChange, maxLength]);

  const handleSuggestionClick = useCallback((suggestion: PromptSuggestion) => {
    const newValue = value ? `${value}\n\n${suggestion.text}` : suggestion.text;
    handlePromptChange(newValue);
    onSuggestionAccept?.(suggestion);
  }, [value, handlePromptChange, onSuggestionAccept]);

  const handleTemplateSelect = useCallback((template: PromptTemplate) => {
    let templateText = template.template;
    
    // Simple variable replacement (in a real app, this would be more sophisticated)
    template.variables.forEach(variable => {
      templateText = templateText.replace(
        new RegExp(`{{${variable}}}`, 'g'),
        `[${variable.replace('_', ' ').toUpperCase()}]`
      );
    });
    
    handlePromptChange(templateText);
    onTemplateSelect?.(template);
  }, [handlePromptChange, onTemplateSelect]);

  const handleClearPrompt = useCallback(() => {
    if (value) {
      // Save to history before clearing
      const newHistory = [value, ...history.slice(0, 9)]; // Keep last 10
      setHistory(newHistory);
      localStorage.setItem('ai-prompt-history', JSON.stringify(newHistory));
    }
    handlePromptChange('');
  }, [value, history, handlePromptChange]);

  const handleHistorySelect = useCallback((historicalPrompt: string) => {
    handlePromptChange(historicalPrompt);
  }, [handlePromptChange]);

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const selection = window.getSelection()?.toString();
    if (selection) {
      setSelectedText(selection);
      setContextMenuAnchor(event.currentTarget);
    }
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuAnchor(null);
    setSelectedText('');
  }, []);

  const handleEnhanceSelection = useCallback(async () => {
    if (selectedText) {
      // Simulate AI enhancement
      setIsLoadingSuggestions(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const enhanced = `${selectedText} (Consider the implications for stakeholder engagement, market positioning, and long-term sustainability.)`;
      const newValue = value.replace(selectedText, enhanced);
      handlePromptChange(newValue);
      
      setIsLoadingSuggestions(false);
      handleCloseContextMenu();
    }
  }, [selectedText, value, handlePromptChange, handleCloseContextMenu]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const toggleFavorite = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.map(s => 
      s.id === suggestionId ? { ...s, isFavorite: !s.isFavorite } : s
    ));
  }, []);

  const filteredSuggestions = suggestions.filter(suggestion => 
    selectedSuggestionCategory === 'all' || suggestion.category === selectedSuggestionCategory
  );

  const visibleSuggestions = showAllSuggestions 
    ? filteredSuggestions 
    : filteredSuggestions.slice(0, 3);

  const suggestionCategories = [
    { id: 'all', label: 'All Suggestions', count: suggestions.length },
    { id: 'scenario', label: 'Scenarios', count: suggestions.filter(s => s.category === 'scenario').length },
    { id: 'challenge', label: 'Challenges', count: suggestions.filter(s => s.category === 'challenge').length },
    { id: 'context', label: 'Context', count: suggestions.filter(s => s.category === 'context').length },
    { id: 'objective', label: 'Objectives', count: suggestions.filter(s => s.category === 'objective').length },
    { id: 'constraint', label: 'Constraints', count: suggestions.filter(s => s.category === 'constraint').length },
  ].filter(cat => cat.count > 0);

  return (
    <Box>
      {/* Main Input Area */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BrainIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              AI-Powered Prompt Builder
            </Typography>
            {isLoadingSuggestions && (
              <CircularProgress size={20} />
            )}
          </Box>
          
          <TextField
            inputRef={textAreaRef}
            multiline
            fullWidth
            rows={8}
            value={value}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            onContextMenu={handleContextMenu}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1rem',
                lineHeight: 1.6,
              },
            }}
            inputProps={{
              maxLength: maxLength,
            }}
            helperText={
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Use rich, detailed descriptions for better AI generation</span>
                <span>{value.length}{maxLength && `/${maxLength}`} characters</span>
              </Box>
            }
          />
          
          <CardActions sx={{ px: 0, pt: 2 }}>
            <Button
              startIcon={<ClearIcon />}
              onClick={handleClearPrompt}
              disabled={!value || disabled}
              size="small"
            >
              Clear
            </Button>
            <Button
              startIcon={<CopyIcon />}
              onClick={() => copyToClipboard(value)}
              disabled={!value || disabled}
              size="small"
            >
              Copy
            </Button>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => generateSuggestions(value)}
              disabled={!value || disabled || isLoadingSuggestions}
              size="small"
            >
              Refresh Suggestions
            </Button>
          </CardActions>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {showSuggestions && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AIIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                AI Suggestions
              </Typography>
              <Chip 
                label={`${suggestions.length} suggestions`} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            </Box>

            {/* Category Filter */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {suggestionCategories.map(category => (
                <Chip
                  key={category.id}
                  label={`${category.label} (${category.count})`}
                  clickable
                  color={selectedSuggestionCategory === category.id ? 'primary' : 'default'}
                  onClick={() => setSelectedSuggestionCategory(category.id)}
                  size="small"
                />
              ))}
            </Stack>

            {visibleSuggestions.length > 0 ? (
              <Stack spacing={2}>
                {visibleSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} variant="outlined" sx={{ cursor: 'pointer' }}>
                    <CardContent 
                      sx={{ py: 2 }}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {suggestion.text}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            {suggestion.framework && (
                              <Chip 
                                label={suggestion.framework} 
                                size="small" 
                                variant="outlined" 
                              />
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Tooltip title={suggestion.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(suggestion.id);
                              }}
                            >
                              {suggestion.isFavorite ? <StarIcon color="primary" /> : <StarBorderIcon />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy suggestion">
                            <IconButton 
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(suggestion.text);
                              }}
                            >
                              <CopyIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredSuggestions.length > 3 && (
                  <Button
                    startIcon={showAllSuggestions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                    variant="outlined"
                    size="small"
                  >
                    {showAllSuggestions 
                      ? 'Show Less' 
                      : `Show ${filteredSuggestions.length - 3} More Suggestions`
                    }
                  </Button>
                )}
              </Stack>
            ) : (
              <Alert severity="info">
                Start typing to get AI-powered suggestions for your case study prompt.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prompt Templates */}
      {showTemplates && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TipsIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Prompt Templates
              </Typography>
              <Button
                startIcon={<AddIcon />}
                size="small"
                variant="outlined"
                onClick={() => setCustomTemplateDialogOpen(true)}
              >
                Create Custom
              </Button>
            </Box>

            <Stack spacing={2}>
              {templates.slice(0, 3).map((template) => (
                <Card key={template.id} variant="outlined" sx={{ cursor: 'pointer' }}>
                  <CardContent 
                    sx={{ py: 2 }}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" color="primary">
                        {template.name}
                      </Typography>
                      <Chip 
                        label={`Used ${template.usageCount} times`} 
                        size="small" 
                        variant="outlined" 
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.description}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        bgcolor: 'background.default', 
                        p: 1, 
                        borderRadius: 1,
                        fontSize: '0.85rem',
                      }}
                    >
                      {template.template.substring(0, 150)}...
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                      <Chip label={template.category} size="small" color="secondary" variant="outlined" />
                      {template.framework && (
                        <Chip label={template.framework} size="small" variant="outlined" />
                      )}
                      <Chip 
                        label={`${template.variables.length} variables`} 
                        size="small" 
                        color="info" 
                        variant="outlined" 
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <HistoryIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Recent Prompts
              </Typography>
            </Box>

            <List dense>
              {history.slice(0, 5).map((historicalPrompt, index) => (
                <ListItemButton 
                  key={index}
                  onClick={() => handleHistorySelect(historicalPrompt)}
                >
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {historicalPrompt}
                      </Typography>
                    }
                    secondary={`Used ${index === 0 ? 'just now' : `${index} prompts ago`}`}
                  />
                  <IconButton 
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(historicalPrompt);
                    }}
                  >
                    <CopyIcon />
                  </IconButton>
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={contextMenuAnchor}
        open={Boolean(contextMenuAnchor)}
        onClose={handleCloseContextMenu}
        TransitionComponent={Fade}
      >
        <MenuItem onClick={handleEnhanceSelection} disabled={isLoadingSuggestions}>
          <AIIcon sx={{ mr: 1 }} />
          Enhance with AI
          {isLoadingSuggestions && <CircularProgress size={16} sx={{ ml: 1 }} />}
        </MenuItem>
        <MenuItem onClick={() => copyToClipboard(selectedText)}>
          <CopyIcon sx={{ mr: 1 }} />
          Copy Selection
        </MenuItem>
      </Menu>
    </Box>
  );
};