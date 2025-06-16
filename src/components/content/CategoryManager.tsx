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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Tooltip,
  Badge,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Snackbar,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  Switch,
  FormControlLabel,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Category as CategoryIcon,
  Label as TagIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  LocalOffer as OfferIcon,
  ColorLens as ColorIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  DragIndicator as DragIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Star as StarIcon,
  TrendingUp as TrendingIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  Science as ScienceIcon,
  Psychology as PsychologyIcon,
  Engineering as EngineeringIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

// Category and tag interfaces
export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  parentId?: string;
  children: Category[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    itemCount: number;
    isActive: boolean;
    sortOrder: number;
    isSystem: boolean; // System categories cannot be deleted
  };
  settings: {
    isPublic: boolean;
    allowSubcategories: boolean;
    maxDepth: number;
    requiredTags: string[];
    suggestedTags: string[];
  };
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
  category?: string;
  synonyms: string[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    usageCount: number;
    isActive: boolean;
    isSystem: boolean;
    isTrending: boolean;
  };
  settings: {
    isPublic: boolean;
    autoSuggest: boolean;
    relatedTags: string[];
    restrictions: {
      contentTypes: string[];
      categories: string[];
      minimumLevel: 'beginner' | 'intermediate' | 'advanced';
    };
  };
}

interface CategoryManagerProps {
  onCategoryChange?: (categories: Category[]) => void;
  onTagChange?: (tags: Tag[]) => void;
  allowEdit?: boolean;
  showUsageStats?: boolean;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  onCategoryChange,
  onTagChange,
  allowEdit = true,
  showUsageStats = true,
}) => {
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');
  
  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState<{open: boolean, category?: Category, mode: 'create' | 'edit'}>({
    open: false,
    mode: 'create'
  });
  const [tagDialog, setTagDialog] = useState<{open: boolean, tag?: Tag, mode: 'create' | 'edit'}>({
    open: false,
    mode: 'create'
  });
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, type: 'category' | 'tag', item?: Category | Tag}>({
    open: false,
    type: 'category'
  });

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#2196f3',
    icon: 'folder',
    parentId: '',
    isPublic: true,
    allowSubcategories: true,
    maxDepth: 3,
  });

  const [tagForm, setTagForm] = useState({
    name: '',
    description: '',
    color: '#4caf50',
    category: '',
    synonyms: [] as string[],
    isPublic: true,
    autoSuggest: true,
    relatedTags: [] as string[],
    contentTypes: [] as string[],
    categories: [] as string[],
    minimumLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
  });

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{anchor: HTMLElement, item: Category | Tag, type: 'category' | 'tag'} | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load data on component mount
  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);

  const loadCategories = useCallback(() => {
    // In a real app, this would fetch from API
    const sampleCategories = generateSampleCategories();
    setCategories(sampleCategories);
    if (onCategoryChange) {
      onCategoryChange(sampleCategories);
    }
  }, [onCategoryChange]);

  const loadTags = useCallback(() => {
    // In a real app, this would fetch from API
    const sampleTags = generateSampleTags();
    setTags(sampleTags);
    if (onTagChange) {
      onTagChange(sampleTags);
    }
  }, [onTagChange]);

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  // Category management
  const handleCreateCategory = useCallback(() => {
    setCategoryForm({
      name: '',
      description: '',
      color: '#2196f3',
      icon: 'folder',
      parentId: '',
      isPublic: true,
      allowSubcategories: true,
      maxDepth: 3,
    });
    setCategoryDialog({ open: true, mode: 'create' });
  }, []);

  const handleEditCategory = useCallback((category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      parentId: category.parentId || '',
      isPublic: category.settings.isPublic,
      allowSubcategories: category.settings.allowSubcategories,
      maxDepth: category.settings.maxDepth,
    });
    setCategoryDialog({ open: true, category, mode: 'edit' });
  }, []);

  const handleSaveCategory = useCallback(async () => {
    try {
      const isEdit = categoryDialog.mode === 'edit';
      const categoryData: Category = {
        id: isEdit ? categoryDialog.category!.id : `cat-${Date.now()}`,
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        color: categoryForm.color,
        icon: categoryForm.icon,
        parentId: categoryForm.parentId || undefined,
        children: isEdit ? categoryDialog.category!.children : [],
        metadata: {
          createdAt: isEdit ? categoryDialog.category!.metadata.createdAt : new Date(),
          updatedAt: new Date(),
          createdBy: 'current-user', // In real app, get from auth
          itemCount: isEdit ? categoryDialog.category!.metadata.itemCount : 0,
          isActive: true,
          sortOrder: isEdit ? categoryDialog.category!.metadata.sortOrder : categories.length,
          isSystem: isEdit ? categoryDialog.category!.metadata.isSystem : false,
        },
        settings: {
          isPublic: categoryForm.isPublic,
          allowSubcategories: categoryForm.allowSubcategories,
          maxDepth: categoryForm.maxDepth,
          requiredTags: isEdit ? categoryDialog.category!.settings.requiredTags : [],
          suggestedTags: isEdit ? categoryDialog.category!.settings.suggestedTags : [],
        },
      };

      if (isEdit) {
        setCategories(prev => prev.map(cat => cat.id === categoryData.id ? categoryData : cat));
        showNotification('Category updated successfully', 'success');
      } else {
        setCategories(prev => [...prev, categoryData]);
        showNotification('Category created successfully', 'success');
      }

      setCategoryDialog({ open: false, mode: 'create' });
    } catch (error) {
      showNotification('Failed to save category', 'error');
    }
  }, [categoryDialog, categoryForm, categories, showNotification]);

  // Tag management
  const handleCreateTag = useCallback(() => {
    setTagForm({
      name: '',
      description: '',
      color: '#4caf50',
      category: '',
      synonyms: [],
      isPublic: true,
      autoSuggest: true,
      relatedTags: [],
      contentTypes: [],
      categories: [],
      minimumLevel: 'beginner',
    });
    setTagDialog({ open: true, mode: 'create' });
  }, []);

  const handleEditTag = useCallback((tag: Tag) => {
    setTagForm({
      name: tag.name,
      description: tag.description || '',
      color: tag.color,
      category: tag.category || '',
      synonyms: tag.synonyms,
      isPublic: tag.settings.isPublic,
      autoSuggest: tag.settings.autoSuggest,
      relatedTags: tag.settings.relatedTags,
      contentTypes: tag.settings.restrictions.contentTypes,
      categories: tag.settings.restrictions.categories,
      minimumLevel: tag.settings.restrictions.minimumLevel,
    });
    setTagDialog({ open: true, tag, mode: 'edit' });
  }, []);

  const handleSaveTag = useCallback(async () => {
    try {
      const isEdit = tagDialog.mode === 'edit';
      const tagData: Tag = {
        id: isEdit ? tagDialog.tag!.id : `tag-${Date.now()}`,
        name: tagForm.name.trim(),
        description: tagForm.description.trim() || undefined,
        color: tagForm.color,
        category: tagForm.category || undefined,
        synonyms: tagForm.synonyms,
        metadata: {
          createdAt: isEdit ? tagDialog.tag!.metadata.createdAt : new Date(),
          updatedAt: new Date(),
          createdBy: 'current-user',
          usageCount: isEdit ? tagDialog.tag!.metadata.usageCount : 0,
          isActive: true,
          isSystem: isEdit ? tagDialog.tag!.metadata.isSystem : false,
          isTrending: isEdit ? tagDialog.tag!.metadata.isTrending : false,
        },
        settings: {
          isPublic: tagForm.isPublic,
          autoSuggest: tagForm.autoSuggest,
          relatedTags: tagForm.relatedTags,
          restrictions: {
            contentTypes: tagForm.contentTypes,
            categories: tagForm.categories,
            minimumLevel: tagForm.minimumLevel,
          },
        },
      };

      if (isEdit) {
        setTags(prev => prev.map(tag => tag.id === tagData.id ? tagData : tag));
        showNotification('Tag updated successfully', 'success');
      } else {
        setTags(prev => [...prev, tagData]);
        showNotification('Tag created successfully', 'success');
      }

      setTagDialog({ open: false, mode: 'create' });
    } catch (error) {
      showNotification('Failed to save tag', 'error');
    }
  }, [tagDialog, tagForm, showNotification]);

  // Delete handlers
  const handleDeleteItem = useCallback(async () => {
    try {
      if (deleteDialog.type === 'category' && deleteDialog.item) {
        const category = deleteDialog.item as Category;
        if (category.metadata.isSystem) {
          showNotification('System categories cannot be deleted', 'error');
          return;
        }
        setCategories(prev => prev.filter(cat => cat.id !== category.id));
        showNotification('Category deleted successfully', 'success');
      } else if (deleteDialog.type === 'tag' && deleteDialog.item) {
        const tag = deleteDialog.item as Tag;
        if (tag.metadata.isSystem) {
          showNotification('System tags cannot be deleted', 'error');
          return;
        }
        setTags(prev => prev.filter(t => t.id !== tag.id));
        showNotification('Tag deleted successfully', 'success');
      }
      setDeleteDialog({ open: false, type: 'category' });
    } catch (error) {
      showNotification('Failed to delete item', 'error');
    }
  }, [deleteDialog, showNotification]);

  // Filter and search functions
  const filteredCategories = useMemo(() => {
    return categories.filter(category => {
      if (!showInactive && !category.metadata.isActive) return false;
      if (searchTerm && !category.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !category.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [categories, showInactive, searchTerm]);

  const filteredTags = useMemo(() => {
    return tags.filter(tag => {
      if (!showInactive && !tag.metadata.isActive) return false;
      if (searchTerm && !tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (!tag.description || !tag.description.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
      if (selectedCategories.length > 0 && (!tag.category || !selectedCategories.includes(tag.category))) return false;
      return true;
    });
  }, [tags, showInactive, searchTerm, selectedCategories]);

  // Icon mapping
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      folder: <FolderIcon />,
      assignment: <AssignmentIcon />,
      school: <SchoolIcon />,
      business: <BusinessIcon />,
      science: <ScienceIcon />,
      psychology: <PsychologyIcon />,
      engineering: <EngineeringIcon />,
    };
    return iconMap[iconName] || <FolderIcon />;
  };

  // Render category tree
  const renderCategoryTree = (categories: Category[], level = 0) => {
    return categories.map(category => (
      <TreeItem
        key={category.id}
        nodeId={category.id}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
            <Avatar sx={{ bgcolor: category.color, mr: 1, width: 24, height: 24 }}>
              {getIconComponent(category.icon)}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {category.name}
            </Typography>
            {showUsageStats && (
              <Chip 
                label={category.metadata.itemCount} 
                size="small" 
                sx={{ ml: 1 }}
                color={category.metadata.itemCount > 0 ? 'primary' : 'default'}
              />
            )}
            {!category.metadata.isActive && (
              <Chip label="Inactive" size="small" color="error" sx={{ ml: 1 }} />
            )}
            <IconButton
              size="small"
              sx={{ ml: 'auto' }}
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({ anchor: e.currentTarget, item: category, type: 'category' });
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        {category.children.length > 0 && renderCategoryTree(category.children, level + 1)}
      </TreeItem>
    ));
  };

  // Render tag grid
  const renderTagGrid = () => (
    <Grid container spacing={2}>
      {filteredTags.map(tag => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={tag.id}>
          <Card 
            variant="outlined"
            sx={{ 
              cursor: 'pointer',
              '&:hover': { elevation: 2 },
              borderLeftColor: tag.color,
              borderLeftWidth: 4,
            }}
          >
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TagIcon sx={{ color: tag.color, mr: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                  {tag.name}
                </Typography>
                {tag.metadata.isTrending && (
                  <TrendingIcon color="secondary" fontSize="small" sx={{ ml: 1 }} />
                )}
              </Box>
              {tag.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {tag.description}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {showUsageStats && (
                  <Chip 
                    label={`${tag.metadata.usageCount} uses`} 
                    size="small" 
                    variant="outlined"
                  />
                )}
                {tag.category && (
                  <Chip 
                    label={tag.category} 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                )}
                {!tag.metadata.isActive && (
                  <Chip label="Inactive" size="small" color="error" />
                )}
              </Stack>
            </CardContent>
            <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
              <Box>
                {tag.synonyms.length > 0 && (
                  <Tooltip title={`Synonyms: ${tag.synonyms.join(', ')}`}>
                    <Chip label={`+${tag.synonyms.length}`} size="small" variant="outlined" />
                  </Tooltip>
                )}
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenu({ anchor: e.currentTarget, item: tag, type: 'tag' });
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Category & Tag Management
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant={activeTab === 'categories' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('categories')}
            startIcon={<CategoryIcon />}
          >
            Categories
          </Button>
          <Button
            variant={activeTab === 'tags' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('tags')}
            startIcon={<TagIcon />}
          >
            Tags
          </Button>
        </Stack>
      </Box>

      {/* Filters and Search */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          {activeTab === 'tags' && (
            <Grid item xs={12} md={4}>
              <Autocomplete
                multiple
                options={categories.map(cat => cat.name)}
                value={selectedCategories}
                onChange={(_, newValue) => setSelectedCategories(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Filter by Categories"
                    placeholder="Select categories"
                  />
                )}
                size="small"
              />
            </Grid>
          )}
          <Grid item xs={12} md={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                  />
                }
                label="Show Inactive"
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics */}
      {showUsageStats && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="primary">
                {activeTab === 'categories' ? categories.length : tags.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total {activeTab}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="success.main">
                {activeTab === 'categories' 
                  ? categories.filter(c => c.metadata.isActive).length 
                  : tags.filter(t => t.metadata.isActive).length
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="info.main">
                {activeTab === 'categories' 
                  ? categories.reduce((sum, c) => sum + c.metadata.itemCount, 0)
                  : tags.reduce((sum, t) => sum + t.metadata.usageCount, 0)
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeTab === 'categories' ? 'Items' : 'Uses'}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="warning.main">
                {activeTab === 'categories' 
                  ? categories.filter(c => c.metadata.isSystem).length
                  : tags.filter(t => t.metadata.isSystem).length
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                System
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Content Area */}
      <Box sx={{ minHeight: 400 }}>
        {activeTab === 'categories' ? (
          <TreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            sx={{ flexGrow: 1, maxWidth: '100%', overflowY: 'auto' }}
          >
            {renderCategoryTree(filteredCategories)}
          </TreeView>
        ) : (
          renderTagGrid()
        )}
      </Box>

      {/* Floating Action Button */}
      {allowEdit && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={activeTab === 'categories' ? handleCreateCategory : handleCreateTag}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Category Dialog */}
      <Dialog 
        open={categoryDialog.open} 
        onClose={() => setCategoryDialog({ open: false, mode: 'create' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {categoryDialog.mode === 'create' ? 'Create Category' : 'Edit Category'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="color"
                  label="Color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Icon</InputLabel>
                  <Select
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                    label="Icon"
                  >
                    <MenuItem value="folder">Folder</MenuItem>
                    <MenuItem value="assignment">Assignment</MenuItem>
                    <MenuItem value="school">School</MenuItem>
                    <MenuItem value="business">Business</MenuItem>
                    <MenuItem value="science">Science</MenuItem>
                    <MenuItem value="psychology">Psychology</MenuItem>
                    <MenuItem value="engineering">Engineering</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <FormControl fullWidth>
              <InputLabel>Parent Category</InputLabel>
              <Select
                value={categoryForm.parentId}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, parentId: e.target.value }))}
                label="Parent Category"
              >
                <MenuItem value="">None (Root Category)</MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={categoryForm.isPublic}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                    />
                  }
                  label="Public Category"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={categoryForm.allowSubcategories}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, allowSubcategories: e.target.checked }))}
                    />
                  }
                  label="Allow Subcategories"
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialog({ open: false, mode: 'create' })}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveCategory}
            variant="contained"
            disabled={!categoryForm.name.trim()}
          >
            {categoryDialog.mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog 
        open={tagDialog.open} 
        onClose={() => setTagDialog({ open: false, mode: 'create' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {tagDialog.mode === 'create' ? 'Create Tag' : 'Edit Tag'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={tagForm.name}
              onChange={(e) => setTagForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={tagForm.description}
              onChange={(e) => setTagForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="color"
                  label="Color"
                  value={tagForm.color}
                  onChange={(e) => setTagForm(prev => ({ ...prev, color: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={tagForm.category}
                    onChange={(e) => setTagForm(prev => ({ ...prev, category: e.target.value }))}
                    label="Category"
                  >
                    <MenuItem value="">None</MenuItem>
                    {categories.map(cat => (
                      <MenuItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={tagForm.synonyms}
              onChange={(_, newValue) => setTagForm(prev => ({ ...prev, synonyms: newValue }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Synonyms"
                  placeholder="Add synonyms"
                  helperText="Press Enter to add synonyms"
                />
              )}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={tagForm.isPublic}
                      onChange={(e) => setTagForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                    />
                  }
                  label="Public Tag"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={tagForm.autoSuggest}
                      onChange={(e) => setTagForm(prev => ({ ...prev, autoSuggest: e.target.checked }))}
                    />
                  }
                  label="Auto-suggest"
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialog({ open: false, mode: 'create' })}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveTag}
            variant="contained"
            disabled={!tagForm.name.trim()}
          >
            {tagDialog.mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={contextMenu?.anchor}
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
      >
        <MenuItem
          onClick={() => {
            if (contextMenu?.type === 'category') {
              handleEditCategory(contextMenu.item as Category);
            } else {
              handleEditTag(contextMenu.item as Tag);
            }
            setContextMenu(null);
          }}
        >
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setDeleteDialog({ 
              open: true, 
              type: contextMenu!.type, 
              item: contextMenu!.item 
            });
            setContextMenu(null);
          }}
          sx={{ color: 'error.main' }}
          disabled={contextMenu?.item && 
            ((contextMenu.type === 'category' && (contextMenu.item as Category).metadata.isSystem) ||
             (contextMenu.type === 'tag' && (contextMenu.item as Tag).metadata.isSystem))
          }
        >
          <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, type: 'category' })}>
        <DialogTitle>
          Delete {deleteDialog.type === 'category' ? 'Category' : 'Tag'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {deleteDialog.type}? This action cannot be undone.
            {deleteDialog.type === 'category' && ' All subcategories will also be affected.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, type: 'category' })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteItem} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
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

// Helper function to generate sample data
function generateSampleCategories(): Category[] {
  return [
    {
      id: 'cat-business',
      name: 'Business',
      description: 'Business strategy, management, and operations case studies',
      color: '#2196f3',
      icon: 'business',
      children: [
        {
          id: 'cat-strategy',
          name: 'Strategy',
          description: 'Strategic planning and competitive analysis',
          color: '#1976d2',
          icon: 'assignment',
          parentId: 'cat-business',
          children: [],
          metadata: {
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-02-10'),
            createdBy: 'system',
            itemCount: 25,
            isActive: true,
            sortOrder: 0,
            isSystem: false,
          },
          settings: {
            isPublic: true,
            allowSubcategories: true,
            maxDepth: 2,
            requiredTags: ['strategy'],
            suggestedTags: ['planning', 'analysis', 'competitive'],
          },
        },
      ],
      metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-15'),
        createdBy: 'system',
        itemCount: 120,
        isActive: true,
        sortOrder: 0,
        isSystem: true,
      },
      settings: {
        isPublic: true,
        allowSubcategories: true,
        maxDepth: 3,
        requiredTags: [],
        suggestedTags: ['business', 'management'],
      },
    },
    {
      id: 'cat-technology',
      name: 'Technology',
      description: 'Software development, IT management, and digital transformation',
      color: '#4caf50',
      icon: 'engineering',
      children: [],
      metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-12'),
        createdBy: 'system',
        itemCount: 85,
        isActive: true,
        sortOrder: 1,
        isSystem: true,
      },
      settings: {
        isPublic: true,
        allowSubcategories: true,
        maxDepth: 3,
        requiredTags: [],
        suggestedTags: ['technology', 'software', 'digital'],
      },
    },
  ];
}

function generateSampleTags(): Tag[] {
  return [
    {
      id: 'tag-strategy',
      name: 'strategy',
      description: 'Strategic planning and decision making',
      color: '#2196f3',
      category: 'Business',
      synonyms: ['planning', 'strategic planning', 'business strategy'],
      metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-15'),
        createdBy: 'system',
        usageCount: 156,
        isActive: true,
        isSystem: true,
        isTrending: true,
      },
      settings: {
        isPublic: true,
        autoSuggest: true,
        relatedTags: ['planning', 'analysis', 'competitive'],
        restrictions: {
          contentTypes: ['case_study', 'template'],
          categories: ['Business'],
          minimumLevel: 'intermediate',
        },
      },
    },
    {
      id: 'tag-digital-transformation',
      name: 'digital transformation',
      description: 'Digital technology adoption and organizational change',
      color: '#4caf50',
      category: 'Technology',
      synonyms: ['digitization', 'digital change', 'tech transformation'],
      metadata: {
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-02-10'),
        createdBy: 'system',
        usageCount: 89,
        isActive: true,
        isSystem: false,
        isTrending: true,
      },
      settings: {
        isPublic: true,
        autoSuggest: true,
        relatedTags: ['technology', 'change management', 'innovation'],
        restrictions: {
          contentTypes: ['case_study', 'template', 'example'],
          categories: ['Technology', 'Business'],
          minimumLevel: 'beginner',
        },
      },
    },
  ];
}