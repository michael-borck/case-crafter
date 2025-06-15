// Template management system for configuration schemas

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Description as TemplateIcon,
  Search as SearchIcon,
  ImportExport as ImportExportIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { ConfigurationSchema } from '../../types/configuration';
import { useConfigurationImportExport } from '../../hooks/useConfigurationImportExport';

interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  schema: ConfigurationSchema;
  isPublic: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  authorName: string;
  framework?: string;
  difficulty?: string;
}

interface TemplateManagerProps {
  onTemplateSelect?: (template: ConfigurationTemplate) => void;
  selectedTemplate?: ConfigurationTemplate;
  showActions?: boolean;
}

const TEMPLATE_CATEGORIES = [
  'Business Framework',
  'Educational Content',
  'Assessment Tools',
  'Custom Workflow',
  'Industry Specific',
  'Research & Analysis',
];

const TEMPLATE_TAGS = [
  'beginner', 'intermediate', 'advanced', 'expert',
  'business', 'education', 'research', 'analysis',
  'strategy', 'innovation', 'operations', 'marketing',
  'finance', 'technology', 'healthcare', 'consulting',
];

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  onTemplateSelect,
  selectedTemplate,
  showActions = true,
}) => {
  const [templates, setTemplates] = useState<ConfigurationTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ConfigurationTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // Selection state for export
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  
  const [currentTemplate, setCurrentTemplate] = useState<ConfigurationTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateTags, setTemplateTags] = useState<string[]>([]);
  const [templateIsPublic, setTemplateIsPublic] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  // Import/Export functionality
  const {
    isExporting,
    isImporting,
    error: importExportError,
    exportTemplates,
    importTemplates,
    clearError: clearImportExportError,
  } = useConfigurationImportExport();

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Filter templates based on search and filters
  useEffect(() => {
    let filtered = templates;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query)) ||
        template.authorName.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(template => 
        selectedTags.some(tag => template.tags.includes(tag))
      );
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(template => template.isFavorite);
    }

    // Sort by usage count and date
    filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.usageCount - a.usageCount || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    setFilteredTemplates(filtered);
  }, [templates, searchQuery, selectedCategory, selectedTags, showFavoritesOnly]);

  const loadTemplates = async () => {
    setError(null);
    try {
      // Simulate loading templates from storage/database
      const mockTemplates: ConfigurationTemplate[] = [
        {
          id: 'porter-template-1',
          name: "Porter's Five Forces Analysis",
          description: 'Complete template for strategic competitive analysis using Porter\'s framework',
          category: 'Business Framework',
          tags: ['strategy', 'business', 'intermediate', 'analysis'],
          schema: {
            id: 'porter-forces-schema',
            name: "Porter's Five Forces Configuration",
            description: 'Strategic analysis framework for competitive dynamics',
            version: '1.0.0',
            framework: "Porter's Five Forces",
            category: 'case_study_generation',
            sections: [],
            global_validations: [],
            conditional_logic: [],
            defaults: {},
            metadata: {
              tags: ['strategy', 'business'],
              target_audience: ['business-students'],
              difficulty_level: 'Intermediate',
              estimated_minutes: 45,
              is_template: true,
              is_active: true,
              locale: 'en',
              custom: {},
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'system',
          },
          isPublic: true,
          isFavorite: false,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T15:30:00Z',
          usageCount: 45,
          authorName: 'Case Crafter System',
          framework: "Porter's Five Forces",
          difficulty: 'Intermediate',
        },
        {
          id: 'swot-template-1',
          name: 'SWOT Analysis Template',
          description: 'Comprehensive SWOT analysis configuration for strategic planning',
          category: 'Business Framework',
          tags: ['strategy', 'business', 'beginner', 'planning'],
          schema: {
            id: 'swot-analysis-schema',
            name: 'SWOT Analysis Configuration',
            description: 'Strategic planning framework for internal and external analysis',
            version: '1.0.0',
            framework: 'SWOT Analysis',
            category: 'case_study_generation',
            sections: [],
            global_validations: [],
            conditional_logic: [],
            defaults: {},
            metadata: {
              tags: ['strategy', 'business'],
              target_audience: ['business-students'],
              difficulty_level: 'Beginner',
              estimated_minutes: 30,
              is_template: true,
              is_active: true,
              locale: 'en',
              custom: {},
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'system',
          },
          isPublic: true,
          isFavorite: true,
          createdAt: '2024-01-10T09:00:00Z',
          updatedAt: '2024-01-18T14:15:00Z',
          usageCount: 67,
          authorName: 'Case Crafter System',
          framework: 'SWOT Analysis',
          difficulty: 'Beginner',
        },
        {
          id: 'lean-canvas-template-1',
          name: 'Lean Canvas Business Model',
          description: 'Startup-focused business model canvas for new ventures',
          category: 'Business Framework',
          tags: ['innovation', 'startup', 'intermediate', 'business-model'],
          schema: {
            id: 'lean-canvas-schema',
            name: 'Lean Canvas Configuration',
            description: 'Business model design for startups and new ventures',
            version: '1.0.0',
            framework: 'Lean Canvas',
            category: 'case_study_generation',
            sections: [],
            global_validations: [],
            conditional_logic: [],
            defaults: {},
            metadata: {
              tags: ['innovation', 'startup'],
              target_audience: ['entrepreneurs'],
              difficulty_level: 'Intermediate',
              estimated_minutes: 60,
              is_template: true,
              is_active: true,
              locale: 'en',
              custom: {},
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'system',
          },
          isPublic: true,
          isFavorite: false,
          createdAt: '2024-01-12T11:30:00Z',
          updatedAt: '2024-01-22T16:45:00Z',
          usageCount: 32,
          authorName: 'Case Crafter System',
          framework: 'Lean Canvas',
          difficulty: 'Intermediate',
        },
        {
          id: 'custom-research-template-1',
          name: 'Custom Research Framework',
          description: 'User-created template for academic research case studies',
          category: 'Research & Analysis',
          tags: ['research', 'academic', 'advanced', 'custom'],
          schema: {
            id: 'custom-research-schema',
            name: 'Custom Research Configuration',
            description: 'Academic research methodology framework',
            version: '1.0.0',
            framework: 'Custom Research',
            category: 'research_methodology',
            sections: [],
            global_validations: [],
            conditional_logic: [],
            defaults: {},
            metadata: {
              tags: ['research', 'academic'],
              target_audience: ['researchers'],
              difficulty_level: 'Advanced',
              estimated_minutes: 90,
              is_template: true,
              is_active: true,
              locale: 'en',
              custom: {},
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'user-123',
          },
          isPublic: false,
          isFavorite: true,
          createdAt: '2024-01-08T14:20:00Z',
          updatedAt: '2024-01-25T10:30:00Z',
          usageCount: 12,
          authorName: 'Dr. Jane Smith',
          framework: 'Custom Research',
          difficulty: 'Advanced',
        },
      ];

      setTemplates(mockTemplates);
    } catch (err) {
      setError('Failed to load templates');
      console.error('Error loading templates:', err);
    }
  };

  const handleCreateTemplate = () => {
    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('');
    setTemplateTags([]);
    setTemplateIsPublic(false);
    setCurrentTemplate(null);
    setCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: ConfigurationTemplate) => {
    setTemplateName(template.name);
    setTemplateDescription(template.description);
    setTemplateCategory(template.category);
    setTemplateTags(template.tags);
    setTemplateIsPublic(template.isPublic);
    setCurrentTemplate(template);
    setEditDialogOpen(true);
  };

  const handleDeleteTemplate = (template: ConfigurationTemplate) => {
    setCurrentTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      
      // Create new template
      const newTemplate: ConfigurationTemplate = {
        id: `template-${Date.now()}`,
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        tags: templateTags,
        schema: {
          id: `schema-${Date.now()}`,
          name: templateName,
          description: templateDescription,
          version: '1.0.0',
          framework: 'Custom',
          category: 'custom_template',
          sections: [],
          global_validations: [],
          conditional_logic: [],
          defaults: {},
          metadata: {
            tags: templateTags,
            target_audience: ['general'],
            difficulty_level: 'Intermediate',
            estimated_minutes: 60,
            is_template: true,
            is_active: true,
            locale: 'en',
            custom: {},
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'current-user',
        },
        isPublic: templateIsPublic,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        authorName: 'Current User',
        framework: 'Custom',
        difficulty: 'Intermediate',
      };

      setTemplates(prev => [newTemplate, ...prev]);
      setCreateDialogOpen(false);
      setError(null);
    } catch (err) {
      setError('Failed to create template');
      console.error('Error creating template:', err);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!currentTemplate) return;

    try {
      const updatedTemplate: ConfigurationTemplate = {
        ...currentTemplate,
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        tags: templateTags,
        isPublic: templateIsPublic,
        updatedAt: new Date().toISOString(),
      };

      setTemplates(prev => 
        prev.map(t => t.id === currentTemplate.id ? updatedTemplate : t)
      );
      setEditDialogOpen(false);
      setError(null);
    } catch (err) {
      setError('Failed to update template');
      console.error('Error updating template:', err);
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!currentTemplate) return;

    try {
      setTemplates(prev => prev.filter(t => t.id !== currentTemplate.id));
      setDeleteDialogOpen(false);
      setCurrentTemplate(null);
      setError(null);
    } catch (err) {
      setError('Failed to delete template');
      console.error('Error deleting template:', err);
    }
  };

  const handleToggleFavorite = async (template: ConfigurationTemplate) => {
    try {
      const updatedTemplate = {
        ...template,
        isFavorite: !template.isFavorite,
        updatedAt: new Date().toISOString(),
      };

      setTemplates(prev => 
        prev.map(t => t.id === template.id ? updatedTemplate : t)
      );
    } catch (err) {
      setError('Failed to update favorite status');
      console.error('Error updating favorite:', err);
    }
  };

  const handleDuplicateTemplate = async (template: ConfigurationTemplate) => {
    try {
      const duplicatedTemplate: ConfigurationTemplate = {
        ...template,
        id: `template-${Date.now()}`,
        name: `${template.name} (Copy)`,
        isPublic: false,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        authorName: 'Current User',
      };

      setTemplates(prev => [duplicatedTemplate, ...prev]);
    } catch (err) {
      setError('Failed to duplicate template');
      console.error('Error duplicating template:', err);
    }
  };

  const handleExportTemplate = (template: ConfigurationTemplate) => {
    const exportData = {
      template,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Current User',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = async () => {
    clearImportExportError();
    const result = await importTemplates(false); // Don't overwrite existing by default
    
    if (result) {
      // Reload templates to show imported ones
      await loadTemplates();
      
      // Show success message
      setError(null);
      alert(`Import successful! Imported: ${result.imported_count}, Skipped: ${result.skipped_count}, Errors: ${result.error_count}`);
    }
  };

  const handleExportTemplate = () => {
    if (selectedTemplateIds.length === 0) {
      setError('Please select templates to export');
      return;
    }
    setExportDialogOpen(true);
  };

  const handleConfirmExport = async (includeMetadata: boolean) => {
    clearImportExportError();
    const filePath = await exportTemplates(selectedTemplateIds, includeMetadata);
    
    if (filePath) {
      setExportDialogOpen(false);
      setSelectionMode(false);
      setSelectedTemplateIds([]);
      setError(null);
      alert(`Export successful! File saved to: ${filePath}`);
    }
  };

  const handleToggleSelection = (templateId: string) => {
    setSelectedTemplateIds(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTemplateIds.length === filteredTemplates.length) {
      setSelectedTemplateIds([]);
    } else {
      setSelectedTemplateIds(filteredTemplates.map(t => t.id));
    }
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedTemplateIds([]);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'success';
      case 'intermediate': return 'primary';
      case 'advanced': return 'warning';
      case 'expert': return 'error';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Business Framework': return '📊';
      case 'Educational Content': return '📚';
      case 'Assessment Tools': return '📝';
      case 'Custom Workflow': return '⚙️';
      case 'Industry Specific': return '🏭';
      case 'Research & Analysis': return '🔬';
      default: return '📄';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Template Manager
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and organize your configuration templates
          </Typography>
        </Box>
        
        {showActions && (
          <Stack direction="row" spacing={1}>
            {selectionMode ? (
              <>
                <Button
                  variant="outlined"
                  startIcon={selectedTemplateIds.length === filteredTemplates.length ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                  onClick={handleSelectAll}
                  size="small"
                >
                  {selectedTemplateIds.length === filteredTemplates.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportTemplate}
                  disabled={selectedTemplateIds.length === 0}
                  size="small"
                >
                  Export ({selectedTemplateIds.length})
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleToggleSelectionMode}
                  size="small"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={handleImportTemplate}
                  disabled={isImporting}
                >
                  {isImporting ? 'Importing...' : 'Import'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ImportExportIcon />}
                  onClick={handleToggleSelectionMode}
                >
                  Export
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTemplate}
                >
                  Create Template
                </Button>
              </>
            )}
          </Stack>
        )}
      </Box>

      {(error || importExportError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || importExportError}
        </Alert>
      )}

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {TEMPLATE_CATEGORIES.map(category => (
                    <MenuItem key={category} value={category}>
                      {getCategoryIcon(category)} {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Tags</InputLabel>
                <Select
                  multiple
                  value={selectedTags}
                  onChange={(e) => setSelectedTags(e.target.value as string[])}
                  label="Tags"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {TEMPLATE_TAGS.map(tag => (
                    <MenuItem key={tag} value={tag}>
                      {tag}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant={showFavoritesOnly ? 'contained' : 'outlined'}
                startIcon={showFavoritesOnly ? <StarIcon /> : <StarBorderIcon />}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                size="small"
              >
                Favorites
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <Grid container spacing={3}>
        {filteredTemplates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: onTemplateSelect ? 'pointer' : 'default',
                border: selectedTemplate?.id === template.id ? 2 : 1,
                borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'divider',
                '&:hover': onTemplateSelect ? {
                  boxShadow: 4,
                  transform: 'translateY(-2px)',
                } : {},
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => onTemplateSelect?.(template)}
            >
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  {selectionMode && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelection(template.id);
                      }}
                      sx={{ mr: 1 }}
                    >
                      {selectedTemplateIds.includes(template.id) ? (
                        <CheckBoxIcon color="primary" />
                      ) : (
                        <CheckBoxOutlineBlankIcon />
                      )}
                    </IconButton>
                  )}
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    {getCategoryIcon(template.category)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="h6" noWrap>
                      {template.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      by {template.authorName}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(template);
                    }}
                  >
                    {template.isFavorite ? (
                      <StarIcon color="warning" />
                    ) : (
                      <StarBorderIcon />
                    )}
                  </IconButton>
                </Box>

                {/* Description */}
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {template.description}
                </Typography>

                {/* Metadata */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={template.difficulty} 
                    size="small" 
                    color={getDifficultyColor(template.difficulty || '') as any}
                    variant="outlined"
                  />
                  <Chip 
                    label={template.category} 
                    size="small" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`${template.usageCount} uses`} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>

                {/* Tags */}
                {template.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                    {template.tags.slice(0, 3).map((tag) => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {template.tags.length > 3 && (
                      <Chip 
                        label={`+${template.tags.length - 3}`} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                )}

                {/* Actions */}
                {showActions && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateTemplate(template);
                        }}
                      >
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportTemplate(template);
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredTemplates.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <TemplateIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No templates found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery || selectedCategory || selectedTags.length > 0 || showFavoritesOnly
              ? 'Try adjusting your filters or search terms'
              : 'Create your first template to get started'}
          </Typography>
        </Box>
      )}

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Template</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              multiline
              rows={3}
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                label="Category"
                required
              >
                {TEMPLATE_CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>
                    {getCategoryIcon(category)} {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Tags</InputLabel>
              <Select
                multiple
                value={templateTags}
                onChange={(e) => setTemplateTags(e.target.value as string[])}
                label="Tags"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {TEMPLATE_TAGS.map(tag => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveTemplate} 
            variant="contained"
            disabled={!templateName || !templateDescription || !templateCategory}
          >
            Create Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Template</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              multiline
              rows={3}
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                label="Category"
                required
              >
                {TEMPLATE_CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>
                    {getCategoryIcon(category)} {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Tags</InputLabel>
              <Select
                multiple
                value={templateTags}
                onChange={(e) => setTemplateTags(e.target.value as string[])}
                label="Tags"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {TEMPLATE_TAGS.map(tag => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateTemplate} 
            variant="contained"
            disabled={!templateName || !templateDescription || !templateCategory}
          >
            Update Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{currentTemplate?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteTemplate} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Confirmation Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Templates</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Export {selectedTemplateIds.length} selected template{selectedTemplateIds.length === 1 ? '' : 's'} to a JSON file.
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            The exported file can be imported into any Case Crafter installation to share your templates.
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            Include metadata (recommended): Adds version information and export details to help with compatibility.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => handleConfirmExport(false)}
            disabled={isExporting}
          >
            Export Without Metadata
          </Button>
          <Button 
            onClick={() => handleConfirmExport(true)}
            variant="contained"
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export With Metadata'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};