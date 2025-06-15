import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  TextField,
  Autocomplete,
  Stack,
  Paper,
  Divider,
  Button,
  IconButton,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Label as TagIcon,
  TrendingUp as TrendingIcon,
  Star as StarIcon,
  Lightbulb as SuggestionIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  AutoAwesome as AIIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { Tag, Category } from './CategoryManager';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  categories?: Category[];
  availableTags?: Tag[];
  contentType?: string;
  contentCategory?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  allowCustomTags?: boolean;
  maxTags?: number;
  placeholder?: string;
  showSuggestions?: boolean;
  showTrending?: boolean;
  showRecent?: boolean;
  disabled?: boolean;
}

interface TagSuggestion {
  tag: Tag;
  reason: string;
  confidence: number;
  source: 'ai' | 'trending' | 'related' | 'category' | 'content';
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  categories = [],
  availableTags = [],
  contentType,
  contentCategory,
  difficulty = 'beginner',
  allowCustomTags = true,
  maxTags = 10,
  placeholder = 'Search and select tags...',
  showSuggestions = true,
  showTrending = true,
  showRecent = true,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [createTagDialog, setCreateTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Load recent tags from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('case-crafter-recent-tags');
    if (recent) {
      setRecentTags(JSON.parse(recent));
    }
  }, []);

  // Generate AI-powered suggestions based on content context
  const generateSuggestions = useCallback(async () => {
    if (!showSuggestions) return;
    
    setIsLoadingSuggestions(true);
    try {
      // Simulate AI suggestion generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newSuggestions: TagSuggestion[] = [];
      
      // Category-based suggestions
      if (contentCategory) {
        const categoryTags = availableTags.filter(tag => 
          tag.category === contentCategory && 
          !selectedTags.includes(tag.name)
        );
        categoryTags.slice(0, 3).forEach(tag => {
          newSuggestions.push({
            tag,
            reason: `Commonly used in ${contentCategory} content`,
            confidence: 0.8,
            source: 'category'
          });
        });
      }

      // Content type suggestions
      if (contentType) {
        const typeTags = availableTags.filter(tag => 
          tag.settings.restrictions.contentTypes.includes(contentType) &&
          !selectedTags.includes(tag.name)
        );
        typeTags.slice(0, 2).forEach(tag => {
          newSuggestions.push({
            tag,
            reason: `Relevant for ${contentType} content`,
            confidence: 0.7,
            source: 'content'
          });
        });
      }

      // Trending tags
      if (showTrending) {
        const trendingTags = availableTags.filter(tag => 
          tag.metadata.isTrending && 
          !selectedTags.includes(tag.name)
        );
        trendingTags.slice(0, 3).forEach(tag => {
          newSuggestions.push({
            tag,
            reason: 'Currently trending',
            confidence: 0.6,
            source: 'trending'
          });
        });
      }

      // Related tags based on selected tags
      selectedTags.forEach(selectedTag => {
        const tag = availableTags.find(t => t.name === selectedTag);
        if (tag) {
          tag.settings.relatedTags.forEach(relatedTagName => {
            const relatedTag = availableTags.find(t => t.name === relatedTagName);
            if (relatedTag && !selectedTags.includes(relatedTag.name)) {
              newSuggestions.push({
                tag: relatedTag,
                reason: `Related to "${selectedTag}"`,
                confidence: 0.9,
                source: 'related'
              });
            }
          });
        }
      });

      // Remove duplicates and sort by confidence
      const uniqueSuggestions = newSuggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.tag.id === suggestion.tag.id)
      ).sort((a, b) => b.confidence - a.confidence);

      setSuggestions(uniqueSuggestions.slice(0, 8));
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [showSuggestions, contentCategory, contentType, selectedTags, availableTags, showTrending]);

  // Generate suggestions when context changes
  useEffect(() => {
    if (showSuggestions && availableTags.length > 0) {
      generateSuggestions();
    }
  }, [generateSuggestions, showSuggestions, availableTags.length]);

  // Filter available tags based on restrictions
  const filteredTags = useMemo(() => {
    return availableTags.filter(tag => {
      // Check if tag is active
      if (!tag.metadata.isActive) return false;
      
      // Check content type restrictions
      if (contentType && tag.settings.restrictions.contentTypes.length > 0) {
        if (!tag.settings.restrictions.contentTypes.includes(contentType)) return false;
      }
      
      // Check category restrictions
      if (contentCategory && tag.settings.restrictions.categories.length > 0) {
        if (!tag.settings.restrictions.categories.includes(contentCategory)) return false;
      }
      
      // Check difficulty restrictions
      const difficultyLevels = ['beginner', 'intermediate', 'advanced'];
      const minLevelIndex = difficultyLevels.indexOf(tag.settings.restrictions.minimumLevel);
      const currentLevelIndex = difficultyLevels.indexOf(difficulty);
      if (minLevelIndex > currentLevelIndex) return false;
      
      return true;
    });
  }, [availableTags, contentType, contentCategory, difficulty]);

  // Handle tag selection
  const handleTagChange = useCallback((newTags: string[]) => {
    if (newTags.length <= maxTags) {
      onChange(newTags);
      
      // Update recent tags
      const updatedRecent = [
        ...newTags.filter(tag => !recentTags.includes(tag)),
        ...recentTags
      ].slice(0, 10);
      
      setRecentTags(updatedRecent);
      localStorage.setItem('case-crafter-recent-tags', JSON.stringify(updatedRecent));
    }
  }, [onChange, maxTags, recentTags]);

  // Handle adding suggested tag
  const handleAddSuggestion = useCallback((suggestion: TagSuggestion) => {
    if (!selectedTags.includes(suggestion.tag.name)) {
      handleTagChange([...selectedTags, suggestion.tag.name]);
    }
  }, [selectedTags, handleTagChange]);

  // Handle creating new tag
  const handleCreateNewTag = useCallback(async () => {
    if (!newTagName.trim()) return;
    
    // In a real app, this would create the tag via API
    const newTag = newTagName.trim().toLowerCase();
    if (!selectedTags.includes(newTag)) {
      handleTagChange([...selectedTags, newTag]);
    }
    
    setNewTagName('');
    setCreateTagDialog(false);
  }, [newTagName, selectedTags, handleTagChange]);

  // Get trending tags for quick selection
  const trendingTags = useMemo(() => {
    return filteredTags
      .filter(tag => tag.metadata.isTrending)
      .sort((a, b) => b.metadata.usageCount - a.metadata.usageCount)
      .slice(0, 5);
  }, [filteredTags]);

  // Get recent tags that are still valid
  const validRecentTags = useMemo(() => {
    return recentTags.filter(tagName => 
      filteredTags.some(tag => tag.name === tagName) ||
      allowCustomTags
    ).slice(0, 5);
  }, [recentTags, filteredTags, allowCustomTags]);

  return (
    <Box>
      {/* Main Tag Input */}
      <Autocomplete
        multiple
        value={selectedTags}
        onChange={(_, newValue) => handleTagChange(newValue)}
        inputValue={inputValue}
        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
        options={filteredTags.map(tag => tag.name)}
        freeSolo={allowCustomTags}
        disabled={disabled}
        limitTags={3}
        getLimitTagsText={(more) => `+${more} more`}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => {
            const tag = availableTags.find(t => t.name === option);
            return (
              <Chip
                key={option}
                label={option}
                {...getTagProps({ index })}
                color={tag ? 'primary' : 'default'}
                variant={tag ? 'filled' : 'outlined'}
                sx={{ 
                  bgcolor: tag?.color + '20',
                  borderColor: tag?.color,
                }}
                icon={tag ? <TagIcon /> : undefined}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={selectedTags.length === 0 ? placeholder : ''}
            helperText={`${selectedTags.length}/${maxTags} tags selected`}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {params.InputProps.endAdornment}
                  {showSuggestions && (
                    <IconButton
                      size="small"
                      onClick={() => setShowSuggestionsPanel(!showSuggestionsPanel)}
                      disabled={disabled}
                    >
                      <Badge 
                        badgeContent={suggestions.length} 
                        color="primary"
                        invisible={suggestions.length === 0}
                      >
                        <SuggestionIcon />
                      </Badge>
                    </IconButton>
                  )}
                  {allowCustomTags && (
                    <IconButton
                      size="small"
                      onClick={() => setCreateTagDialog(true)}
                      disabled={disabled}
                    >
                      <AddIcon />
                    </IconButton>
                  )}
                </Box>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          const tag = availableTags.find(t => t.name === option);
          return (
            <Box component="li" {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <TagIcon sx={{ color: tag?.color, mr: 1 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">{option}</Typography>
                  {tag?.description && (
                    <Typography variant="caption" color="text.secondary">
                      {tag.description}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {tag?.metadata.isTrending && (
                    <TrendingIcon color="secondary" fontSize="small" />
                  )}
                  {tag && (
                    <Typography variant="caption" color="text.secondary">
                      {tag.metadata.usageCount}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        }}
      />

      {/* Quick Selection Chips */}
      {(showTrending || showRecent) && (
        <Box sx={{ mt: 2 }}>
          {showTrending && trendingTags.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingIcon fontSize="small" sx={{ mr: 0.5 }} />
                Trending
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {trendingTags.map(tag => (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    size="small"
                    variant="outlined"
                    color="secondary"
                    disabled={selectedTags.includes(tag.name) || disabled}
                    onClick={() => handleTagChange([...selectedTags, tag.name])}
                    icon={<TrendingIcon />}
                  />
                ))}
              </Stack>
            </Box>
          )}
          
          {showRecent && validRecentTags.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <HistoryIcon fontSize="small" sx={{ mr: 0.5 }} />
                Recent
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {validRecentTags.map(tagName => (
                  <Chip
                    key={tagName}
                    label={tagName}
                    size="small"
                    variant="outlined"
                    disabled={selectedTags.includes(tagName) || disabled}
                    onClick={() => handleTagChange([...selectedTags, tagName])}
                    icon={<HistoryIcon />}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}

      {/* AI Suggestions Panel */}
      {showSuggestions && (
        <Collapse in={showSuggestionsPanel}>
          <Paper elevation={1} sx={{ mt: 2, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                <AIIcon sx={{ mr: 1 }} />
                AI Suggestions
              </Typography>
              <Box>
                <Button
                  size="small"
                  onClick={generateSuggestions}
                  disabled={isLoadingSuggestions || disabled}
                  startIcon={<SuggestionIcon />}
                >
                  Refresh
                </Button>
                <IconButton
                  size="small"
                  onClick={() => setShowSuggestionsPanel(false)}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>

            {isLoadingSuggestions ? (
              <Box>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Generating personalized suggestions...
                </Typography>
              </Box>
            ) : suggestions.length > 0 ? (
              <Grid container spacing={1}>
                {suggestions.map((suggestion, index) => (
                  <Grid item xs={12} sm={6} key={suggestion.tag.id}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        opacity: selectedTags.includes(suggestion.tag.name) ? 0.5 : 1,
                      }}
                      onClick={() => handleAddSuggestion(suggestion)}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <TagIcon sx={{ color: suggestion.tag.color, mr: 1 }} />
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {suggestion.tag.name}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="caption" color="primary">
                              {Math.round(suggestion.confidence * 100)}%
                            </Typography>
                            {selectedTags.includes(suggestion.tag.name) ? (
                              <CheckIcon color="success" fontSize="small" sx={{ ml: 0.5 }} />
                            ) : (
                              <AddIcon color="primary" fontSize="small" sx={{ ml: 0.5 }} />
                            )}
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {suggestion.reason}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                No suggestions available. Try selecting some tags or changing the content type.
              </Alert>
            )}
          </Paper>
        </Collapse>
      )}

      {/* Create New Tag Dialog */}
      {allowCustomTags && (
        <Dialog 
          open={createTagDialog} 
          onClose={() => setCreateTagDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create Custom Tag</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Tag Name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Enter tag name"
              sx={{ mt: 1 }}
              autoFocus
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Custom tags will be created automatically and can be reused in future content.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateTagDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateNewTag}
              variant="contained"
              disabled={!newTagName.trim()}
            >
              Create Tag
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};