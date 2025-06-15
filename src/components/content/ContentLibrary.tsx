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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Tooltip,
  Badge,
  Menu,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
  Snackbar,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Rating,
  Avatar,
  Dialog,
  DialogContent,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  ViewList as ListViewIcon,
  ViewModule as GridViewIcon,
  ViewComfy as CardViewIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  Article as ArticleIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  Clear as ClearIcon,
  SavedSearch as SavedSearchIcon,
  History as HistoryIcon,
  BookmarkBorder as BookmarkIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';

import { ContentExporter } from './ContentExporter';

// Content item interface representing a case study or educational content
export interface ContentItem {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'case_study' | 'template' | 'assessment' | 'framework' | 'example';
  category: string;
  tags: string[];
  framework?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  wordCount: number;
  rating: number;
  ratingCount: number;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt?: Date;
    accessCount: number;
    isPublic: boolean;
    isFeatured: boolean;
    isBookmarked: boolean;
    downloadCount: number;
    shareCount: number;
    version: string;
    language: string;
    industry: string[];
    learningObjectives: string[];
    prerequisites: string[];
  };
  searchableContent: string; // Full-text search content
}

// Search and filter interfaces
interface SearchFilters {
  query: string;
  type: string[];
  category: string[];
  tags: string[];
  difficulty: string[];
  framework: string[];
  industry: string[];
  rating: number;
  estimatedTime: {
    min: number;
    max: number;
  };
  dateRange: {
    start?: Date;
    end?: Date;
  };
  author: string[];
  isFeatured: boolean;
  isBookmarked: boolean;
  isPublic: boolean;
}

interface SortOptions {
  field: 'title' | 'createdAt' | 'updatedAt' | 'rating' | 'accessCount' | 'downloadCount' | 'relevance';
  order: 'asc' | 'desc';
}

interface ContentLibraryProps {
  onSelectContent?: (content: ContentItem) => void;
  onEditContent?: (contentId: string) => void;
  onDeleteContent?: (contentId: string) => void;
  onCreateNew?: () => void;
  allowSelection?: boolean;
  allowEdit?: boolean;
  showCreateButton?: boolean;
  maxSelections?: number;
}

export const ContentLibrary: React.FC<ContentLibraryProps> = ({
  onSelectContent,
  onEditContent,
  onCreateNew,
  allowSelection = false,
  allowEdit = true,
  showCreateButton = true,
  maxSelections = 1,
}) => {
  // State management
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'card'>('grid');
  
  // Search and filter state
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: [],
    category: [],
    tags: [],
    difficulty: [],
    framework: [],
    industry: [],
    rating: 0,
    estimatedTime: { min: 0, max: 300 },
    dateRange: {},
    author: [],
    isFeatured: false,
    isBookmarked: false,
    isPublic: false,
  });
  
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'updatedAt',
    order: 'desc',
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [contentMenu, setContentMenu] = useState<{anchor: HTMLElement, contentId: string} | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<{name: string, filters: SearchFilters}[]>([]);
  const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [exportDialog, setExportDialog] = useState<{open: boolean, contentItem: ContentItem | null}>({ open: false, contentItem: null });

  // Load content from localStorage or API
  useEffect(() => {
    loadContent();
  }, []);

  // Load search history and saved searches
  useEffect(() => {
    const history = localStorage.getItem('content-library-search-history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
    
    const searches = localStorage.getItem('content-library-saved-searches');
    if (searches) {
      setSavedSearches(JSON.parse(searches));
    }
  }, []);

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  const loadContent = useCallback(async () => {
    try {
      // In a real implementation, this would fetch from an API
      // For now, we'll generate sample data
      const sampleContent = generateSampleContent();
      setContentItems(sampleContent);
    } catch (error) {
      showNotification('Failed to load content library', 'error');
    }
  }, [showNotification]);

  // Full-text search implementation
  const performFullTextSearch = useCallback((items: ContentItem[], query: string): ContentItem[] => {
    if (!query.trim()) return items;
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    if (searchTerms.length === 0) return items;

    return items.map(item => {
      let relevanceScore = 0;
      const searchableText = item.searchableContent.toLowerCase();
      
      // Calculate relevance score based on term frequency and position
      searchTerms.forEach(term => {
        // Title matches get higher weight
        if (item.title.toLowerCase().includes(term)) {
          relevanceScore += 10;
        }
        
        // Description matches get medium weight
        if (item.description.toLowerCase().includes(term)) {
          relevanceScore += 5;
        }
        
        // Tag matches get high weight
        if (item.tags.some(tag => tag.toLowerCase().includes(term))) {
          relevanceScore += 8;
        }
        
        // Content matches get lower weight but count frequency
        const matches = (searchableText.match(new RegExp(term, 'g')) || []).length;
        relevanceScore += matches * 1;
        
        // Framework and category matches
        if (item.framework?.toLowerCase().includes(term)) {
          relevanceScore += 6;
        }
        if (item.category.toLowerCase().includes(term)) {
          relevanceScore += 4;
        }
      });
      
      return { ...item, relevanceScore };
    }).filter((item: any) => item.relevanceScore > 0)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
  }, []);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...contentItems];

    // Full-text search
    if (filters.query) {
      filtered = performFullTextSearch(filtered, filters.query);
      
      // Add to search history
      if (filters.query.length > 2 && !searchHistory.includes(filters.query)) {
        const newHistory = [filters.query, ...searchHistory.slice(0, 9)];
        setSearchHistory(newHistory);
        localStorage.setItem('content-library-search-history', JSON.stringify(newHistory));
      }
    }

    // Apply other filters
    if (filters.type.length > 0) {
      filtered = filtered.filter(item => filters.type.includes(item.type));
    }

    if (filters.category.length > 0) {
      filtered = filtered.filter(item => filters.category.includes(item.category));
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(item => 
        filters.tags.some(tag => item.tags.includes(tag))
      );
    }

    if (filters.difficulty.length > 0) {
      filtered = filtered.filter(item => filters.difficulty.includes(item.difficulty));
    }

    if (filters.framework.length > 0) {
      filtered = filtered.filter(item => 
        item.framework && filters.framework.includes(item.framework)
      );
    }

    if (filters.industry.length > 0) {
      filtered = filtered.filter(item =>
        item.metadata.industry.some(ind => filters.industry.includes(ind))
      );
    }

    if (filters.rating > 0) {
      filtered = filtered.filter(item => item.rating >= filters.rating);
    }

    if (filters.estimatedTime.min > 0 || filters.estimatedTime.max < 300) {
      filtered = filtered.filter(item => 
        item.estimatedTime >= filters.estimatedTime.min && 
        item.estimatedTime <= filters.estimatedTime.max
      );
    }

    if (filters.isFeatured) {
      filtered = filtered.filter(item => item.metadata.isFeatured);
    }

    if (filters.isBookmarked) {
      filtered = filtered.filter(item => item.metadata.isBookmarked);
    }

    if (filters.isPublic) {
      filtered = filtered.filter(item => item.metadata.isPublic);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortOptions.field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.metadata.createdAt.getTime();
          bValue = b.metadata.createdAt.getTime();
          break;
        case 'updatedAt':
          aValue = a.metadata.updatedAt.getTime();
          bValue = b.metadata.updatedAt.getTime();
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'accessCount':
          aValue = a.metadata.accessCount;
          bValue = b.metadata.accessCount;
          break;
        case 'downloadCount':
          aValue = a.metadata.downloadCount;
          bValue = b.metadata.downloadCount;
          break;
        case 'relevance':
          aValue = (a as any).relevanceScore || 0;
          bValue = (b as any).relevanceScore || 0;
          break;
        default:
          aValue = a.metadata.updatedAt.getTime();
          bValue = b.metadata.updatedAt.getTime();
      }

      if (sortOptions.order === 'desc') {
        return aValue < bValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    setFilteredContent(filtered);
  }, [contentItems, filters, sortOptions, performFullTextSearch, searchHistory]);

  // Event handlers
  const handleSelectContent = useCallback((contentId: string) => {
    if (!allowSelection) return;
    
    const content = contentItems.find(item => item.id === contentId);
    if (!content) return;

    if (maxSelections === 1) {
      setSelectedContent([contentId]);
      if (onSelectContent) {
        onSelectContent(content);
      }
    } else {
      setSelectedContent(prev => {
        const newSelection = prev.includes(contentId) 
          ? prev.filter(id => id !== contentId)
          : prev.length < maxSelections 
            ? [...prev, contentId]
            : prev;
        return newSelection;
      });
    }

    // Update access count and last accessed time
    setContentItems(prev => prev.map(item => 
      item.id === contentId 
        ? {
            ...item,
            metadata: {
              ...item.metadata,
              lastAccessedAt: new Date(),
              accessCount: item.metadata.accessCount + 1,
            }
          }
        : item
    ));
  }, [allowSelection, maxSelections, onSelectContent, contentItems]);

  const handleToggleBookmark = useCallback((contentId: string) => {
    setContentItems(prev => prev.map(item => 
      item.id === contentId 
        ? {
            ...item,
            metadata: {
              ...item.metadata,
              isBookmarked: !item.metadata.isBookmarked,
              updatedAt: new Date(),
            }
          }
        : item
    ));
    
    const item = contentItems.find(c => c.id === contentId);
    if (item) {
      showNotification(
        item.metadata.isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks', 
        'success'
      );
    }
  }, [contentItems]);


  const clearFilters = useCallback(() => {
    setFilters({
      query: '',
      type: [],
      category: [],
      tags: [],
      difficulty: [],
      framework: [],
      industry: [],
      rating: 0,
      estimatedTime: { min: 0, max: 300 },
      dateRange: {},
      author: [],
      isFeatured: false,
      isBookmarked: false,
      isPublic: false,
    });
  }, []);

  const saveCurrentSearch = useCallback(() => {
    const name = prompt('Enter a name for this search:');
    if (name && name.trim()) {
      const newSearch = { name: name.trim(), filters: { ...filters } };
      const updatedSearches = [...savedSearches, newSearch];
      setSavedSearches(updatedSearches);
      localStorage.setItem('content-library-saved-searches', JSON.stringify(updatedSearches));
      showNotification('Search saved successfully', 'success');
    }
  }, [filters, savedSearches]);

  const loadSavedSearch = useCallback((search: {name: string, filters: SearchFilters}) => {
    setFilters(search.filters);
    showNotification(`Loaded search: ${search.name}`, 'success');
  }, [showNotification]);

  // Get available filter options from content
  const availableOptions = useMemo(() => {
    return {
      types: [...new Set(contentItems.map(item => item.type))],
      categories: [...new Set(contentItems.map(item => item.category))],
      tags: [...new Set(contentItems.flatMap(item => item.tags))].sort(),
      frameworks: [...new Set(contentItems.map(item => item.framework).filter(Boolean))].sort(),
      industries: [...new Set(contentItems.flatMap(item => item.metadata.industry))].sort(),
      authors: [...new Set(contentItems.map(item => item.author.name))].sort(),
    };
  }, [contentItems]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'case_study': return <ArticleIcon />;
      case 'template': return <FolderIcon />;
      case 'assessment': return <QuizIcon />;
      case 'framework': return <BusinessIcon />;
      case 'example': return <AssignmentIcon />;
      default: return <ArticleIcon />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'business': 'primary',
      'technology': 'secondary',
      'healthcare': 'success',
      'education': 'info',
      'finance': 'warning',
      'marketing': 'error',
    };
    return colors[category as keyof typeof colors] || 'default';
  };

  const renderSearchBar = () => (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Search case studies, templates, assessments..."
            value={filters.query}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: filters.query && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setFilters(prev => ({ ...prev, query: '' }))}
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortOptions.field}
              onChange={(e) => setSortOptions(prev => ({ ...prev, field: e.target.value as any }))}
              label="Sort By"
            >
              <MenuItem value="relevance">Relevance</MenuItem>
              <MenuItem value="updatedAt">Last Modified</MenuItem>
              <MenuItem value="createdAt">Created Date</MenuItem>
              <MenuItem value="rating">Rating</MenuItem>
              <MenuItem value="accessCount">Most Viewed</MenuItem>
              <MenuItem value="downloadCount">Most Downloaded</MenuItem>
              <MenuItem value="title">Title</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <Stack direction="row" spacing={1}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="grid">
                <GridViewIcon />
              </ToggleButton>
              <ToggleButton value="list">
                <ListViewIcon />
              </ToggleButton>
              <ToggleButton value="card">
                <CardViewIcon />
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'contained' : 'outlined'}
              size="small"
            >
              Filters
            </Button>
          </Stack>
        </Grid>
      </Grid>

      {/* Search History and Saved Searches */}
      {(searchHistory.length > 0 || savedSearches.length > 0) && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={2}>
            {searchHistory.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Recent Searches
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {searchHistory.slice(0, 3).map((query, index) => (
                    <Chip
                      key={index}
                      label={query}
                      size="small"
                      variant="outlined"
                      onClick={() => setFilters(prev => ({ ...prev, query }))}
                      icon={<HistoryIcon />}
                    />
                  ))}
                </Stack>
              </Box>
            )}
            {savedSearches.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Saved Searches
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {savedSearches.slice(0, 3).map((search, index) => (
                    <Chip
                      key={index}
                      label={search.name}
                      size="small"
                      color="primary"
                      variant="outlined"
                      onClick={() => loadSavedSearch(search)}
                      icon={<SavedSearchIcon />}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<SavedSearchIcon />}
              onClick={saveCurrentSearch}
              disabled={!filters.query && Object.values(filters).every(v => 
                Array.isArray(v) ? v.length === 0 : typeof v === 'boolean' ? !v : !v
              )}
            >
              Save Search
            </Button>
            <Button size="small" onClick={clearFilters}>
              Clear Filters
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );

  const renderFilters = () => (
    <Accordion expanded={showFilters} onChange={() => setShowFilters(!showFilters)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Advanced Filters</Typography>
        {Object.values(filters).some(v => 
          Array.isArray(v) ? v.length > 0 : typeof v === 'boolean' ? v : !!v
        ) && (
          <Badge color="primary" variant="dot" sx={{ ml: 1 }} />
        )}
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Content Type</InputLabel>
              <Select
                multiple
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as string[] }))}
                label="Content Type"
              >
                {availableOptions.types.map(type => (
                  <MenuItem key={type} value={type}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getTypeIcon(type)}
                      <Typography sx={{ textTransform: 'capitalize' }}>
                        {type.replace('_', ' ')}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                multiple
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as string[] }))}
                label="Category"
              >
                {availableOptions.categories.map(category => (
                  <MenuItem key={category} value={category}>
                    <Chip 
                      label={category} 
                      size="small" 
                      color={getCategoryColor(category) as any}
                      variant="outlined"
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Difficulty</InputLabel>
              <Select
                multiple
                value={filters.difficulty}
                onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value as string[] }))}
                label="Difficulty"
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Framework</InputLabel>
              <Select
                multiple
                value={filters.framework}
                onChange={(e) => setFilters(prev => ({ ...prev, framework: e.target.value as string[] }))}
                label="Framework"
              >
                {availableOptions.frameworks.map(framework => (
                  <MenuItem key={framework} value={framework}>
                    {framework}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Estimated Time (minutes)
              </Typography>
              <Slider
                value={[filters.estimatedTime.min, filters.estimatedTime.max]}
                onChange={(_, value) => {
                  const valueArray = value as number[];
                  setFilters(prev => ({ 
                    ...prev, 
                    estimatedTime: { 
                      min: valueArray[0], 
                      max: valueArray[1] 
                    }
                  }));
                }}
                valueLabelDisplay="auto"
                min={0}
                max={300}
                step={15}
                marks={[
                  { value: 0, label: '0' },
                  { value: 60, label: '1h' },
                  { value: 120, label: '2h' },
                  { value: 180, label: '3h' },
                  { value: 300, label: '5h' },
                ]}
              />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Minimum Rating
              </Typography>
              <Rating
                value={filters.rating}
                onChange={(_, value) => setFilters(prev => ({ ...prev, rating: value || 0 }))}
                precision={0.5}
              />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.isFeatured}
                    onChange={(e) => setFilters(prev => ({ ...prev, isFeatured: e.target.checked }))}
                  />
                }
                label="Featured Only"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.isBookmarked}
                    onChange={(e) => setFilters(prev => ({ ...prev, isBookmarked: e.target.checked }))}
                  />
                }
                label="Bookmarked Only"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.isPublic}
                    onChange={(e) => setFilters(prev => ({ ...prev, isPublic: e.target.checked }))}
                  />
                }
                label="Public Content Only"
              />
            </Stack>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );

  const renderContentCard = (content: ContentItem) => (
    <Card
      key={content.id}
      variant="outlined"
      sx={{
        cursor: allowSelection ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': allowSelection ? { 
          elevation: 4, 
          transform: 'translateY(-2px)',
          bgcolor: 'action.hover' 
        } : {},
        border: selectedContent.includes(content.id) ? 2 : 1,
        borderColor: selectedContent.includes(content.id) ? 'primary.main' : 'divider',
      }}
      onClick={() => handleSelectContent(content.id)}
    >
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: getCategoryColor(content.category) + '.main' }}>
            {getTypeIcon(content.type)}
          </Avatar>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" noWrap>
              {content.title}
            </Typography>
            {content.metadata.isFeatured && (
              <StarIcon color="warning" fontSize="small" />
            )}
            {content.metadata.isBookmarked && (
              <BookmarkIcon color="primary" fontSize="small" />
            )}
          </Box>
        }
        subheader={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              by {content.author.name}
            </Typography>
            <Divider orientation="vertical" flexItem />
            <Typography variant="caption" color="text.secondary">
              {content.metadata.updatedAt.toLocaleDateString()}
            </Typography>
          </Stack>
        }
        action={
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setContentMenu({ anchor: e.currentTarget, contentId: content.id });
            }}
          >
            <MoreVertIcon />
          </IconButton>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          {content.description}
        </Typography>
        
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            label={content.type.replace('_', ' ')}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={content.difficulty}
            size="small"
            color={content.difficulty === 'advanced' ? 'error' : 
                   content.difficulty === 'intermediate' ? 'warning' : 'success'}
            variant="outlined"
          />
          <Chip
            label={`${content.estimatedTime}min`}
            size="small"
            variant="outlined"
            icon={<ScheduleIcon />}
          />
        </Stack>

        {content.tags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {content.tags.slice(0, 3).map(tag => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                color="secondary"
              />
            ))}
            {content.tags.length > 3 && (
              <Chip
                label={`+${content.tags.length - 3}`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rating
            value={content.rating}
            readOnly
            size="small"
            precision={0.1}
          />
          <Typography variant="caption" color="text.secondary">
            ({content.ratingCount})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Views">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <VisibilityIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {content.metadata.accessCount}
              </Typography>
            </Box>
          </Tooltip>
          <Tooltip title="Downloads">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DownloadIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {content.metadata.downloadCount}
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );

  return (
    <Box>
      {/* Search Bar */}
      {renderSearchBar()}

      {/* Filters */}
      {renderFilters()}

      {/* Results Summary */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {filteredContent.length} result{filteredContent.length !== 1 ? 's' : ''}
          {filters.query && ` for "${filters.query}"`}
        </Typography>
        {allowSelection && selectedContent.length > 0 && (
          <Chip
            label={`${selectedContent.length} selected`}
            color="primary"
            onDelete={() => setSelectedContent([])}
          />
        )}
      </Box>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No content found matching your search criteria. Try adjusting your filters or search terms.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredContent.map(content => (
            <Grid 
              item 
              xs={12} 
              sm={viewMode === 'list' ? 12 : 6} 
              md={viewMode === 'list' ? 12 : viewMode === 'card' ? 4 : 6}
              lg={viewMode === 'list' ? 12 : viewMode === 'card' ? 3 : 4}
              key={content.id}
            >
              {renderContentCard(content)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Floating Action Button */}
      {showCreateButton && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={onCreateNew}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={contentMenu?.anchor}
        open={Boolean(contentMenu)}
        onClose={() => setContentMenu(null)}
      >
        <MenuItem
          onClick={() => {
            const content = contentItems.find(c => c.id === contentMenu?.contentId);
            if (content) {
              handleToggleBookmark(content.id);
            }
            setContentMenu(null);
          }}
        >
          <ListItemIcon>
            {contentItems.find(c => c.id === contentMenu?.contentId)?.metadata.isBookmarked ? 
              <StarIcon /> : <StarBorderIcon />
            }
          </ListItemIcon>
          <ListItemText>
            {contentItems.find(c => c.id === contentMenu?.contentId)?.metadata.isBookmarked ? 
              'Remove Bookmark' : 'Add Bookmark'
            }
          </ListItemText>
        </MenuItem>
        {allowEdit && (
          <MenuItem
            onClick={() => {
              if (contentMenu?.contentId && onEditContent) {
                onEditContent(contentMenu.contentId);
              }
              setContentMenu(null);
            }}
          >
            <ListItemIcon><EditIcon /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            const content = contentItems.find(c => c.id === contentMenu?.contentId);
            if (content) {
              setExportDialog({ open: true, contentItem: content });
            }
            setContentMenu(null);
          }}
        >
          <ListItemIcon><ExportIcon /></ListItemIcon>
          <ListItemText>Export</ListItemText>
        </MenuItem>
      </Menu>

      {/* Export Dialog */}
      <Dialog
        open={exportDialog.open}
        onClose={() => setExportDialog({ open: false, contentItem: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent>
          {exportDialog.contentItem && (
            <ContentExporter
              contentItem={exportDialog.contentItem}
              onClose={() => setExportDialog({ open: false, contentItem: null })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        message={notification.message}
      />
    </Box>
  );
};

// Helper function to generate sample content for demonstration
function generateSampleContent(): ContentItem[] {
  const sampleContent: ContentItem[] = [
    {
      id: 'cs001',
      title: 'Digital Transformation at Global Retail Corp',
      description: 'A comprehensive case study examining how a traditional retailer navigated digital transformation challenges during the pandemic.',
      content: 'Full case study content would go here...',
      type: 'case_study',
      category: 'business',
      tags: ['digital transformation', 'retail', 'strategy', 'technology'],
      framework: 'Porter\'s Five Forces',
      difficulty: 'intermediate',
      estimatedTime: 120,
      wordCount: 2500,
      rating: 4.5,
      ratingCount: 42,
      author: {
        id: 'author1',
        name: 'Dr. Sarah Johnson',
      },
      metadata: {
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-02-10'),
        lastAccessedAt: new Date('2024-02-14'),
        accessCount: 156,
        isPublic: true,
        isFeatured: true,
        isBookmarked: false,
        downloadCount: 89,
        shareCount: 23,
        version: '1.2',
        language: 'English',
        industry: ['retail', 'technology'],
        learningObjectives: ['Understand digital transformation strategies', 'Analyze competitive dynamics'],
        prerequisites: ['Basic business knowledge', 'Understanding of retail operations'],
      },
      searchableContent: 'Digital Transformation at Global Retail Corp case study examining how traditional retailer navigated digital transformation challenges during pandemic Porter Five Forces retail strategy technology business intermediate 120 minutes',
    },
    {
      id: 'cs002',
      title: 'Startup Funding Strategy: TechNova\'s Series A Journey',
      description: 'An in-depth analysis of a technology startup\'s approach to securing Series A funding in a competitive market.',
      content: 'Full case study content would go here...',
      type: 'case_study',
      category: 'finance',
      tags: ['startup', 'funding', 'venture capital', 'financial strategy'],
      framework: 'Business Model Canvas',
      difficulty: 'advanced',
      estimatedTime: 180,
      wordCount: 3200,
      rating: 4.2,
      ratingCount: 28,
      author: {
        id: 'author2',
        name: 'Prof. Michael Chen',
      },
      metadata: {
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-02-05'),
        accessCount: 89,
        isPublic: true,
        isFeatured: false,
        isBookmarked: true,
        downloadCount: 45,
        shareCount: 12,
        version: '1.0',
        language: 'English',
        industry: ['technology', 'finance'],
        learningObjectives: ['Evaluate funding strategies', 'Understand investor perspectives'],
        prerequisites: ['Financial fundamentals', 'Startup ecosystem knowledge'],
      },
      searchableContent: 'Startup Funding Strategy TechNova Series A Journey technology startup securing Series A funding competitive market Business Model Canvas startup funding venture capital financial strategy finance advanced 180 minutes',
    },
    // Add more sample content items...
  ];

  return sampleContent;
}