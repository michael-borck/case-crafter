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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Snackbar,
} from '@mui/material';
import {
  Save as SaveIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreVertIcon,
  History as HistoryIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Label as LabelIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ImportExport as ImportExportIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { ContentStructureConfig } from './ContentStructureSelector';
import { BusinessFramework } from '../frameworks/FrameworkSelector';

export interface GenerationSession {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  framework?: BusinessFramework;
  contentStructure: ContentStructureConfig;
  formData: Record<string, any>;
  aiPrompt: string;
  generationOptions: any;
  contentPreferences: any;
  generatedContent?: Record<string, any>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    version: string;
    wordCount: number;
    completionStatus: 'draft' | 'in-progress' | 'completed' | 'published';
    isStarred: boolean;
    isShared: boolean;
    lastOpenedAt?: Date;
    openCount: number;
  };
  settings: {
    autoSave: boolean;
    saveInterval: number;
    backupEnabled: boolean;
    syncEnabled: boolean;
  };
}

interface SessionFilter {
  searchTerm: string;
  tags: string[];
  status: string[];
  framework: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'openCount';
  sortOrder: 'asc' | 'desc';
  showStarredOnly: boolean;
  showSharedOnly: boolean;
}

interface GenerationSessionManagerProps {
  currentSession?: Partial<GenerationSession>;
  onLoadSession: (session: GenerationSession) => void;
  onSaveSession: (session: GenerationSession) => Promise<boolean>;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
  onExportSession: (session: GenerationSession, format: 'json' | 'csv' | 'pdf') => void;
  onImportSession: (file: File) => Promise<GenerationSession>;
  disabled?: boolean;
}

export const GenerationSessionManager: React.FC<GenerationSessionManagerProps> = ({
  currentSession,
  onLoadSession,
  onSaveSession,
  onDeleteSession,
  onExportSession,
  onImportSession,
  disabled = false,
}) => {
  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<GenerationSession[]>([]);
  const [filter, setFilter] = useState<SessionFilter>({
    searchTerm: '',
    tags: [],
    status: [],
    framework: [],
    dateRange: {},
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    showStarredOnly: false,
    showSharedOnly: false,
  });

  const [saveDialog, setSaveDialog] = useState(false);
  const [loadDialog, setLoadDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [shareDialog, setShareDialog] = useState<string | null>(null);
  const [importDialog, setImportDialog] = useState(false);
  const [sessionMenu, setSessionMenu] = useState<{anchor: HTMLElement, sessionId: string} | null>(null);

  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionTags, setSessionTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [autoSave, setAutoSave] = useState(true);
  const [saveInterval, setSaveInterval] = useState(30000);

  const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load sessions from localStorage on component mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('case-crafter-sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        const sessionsWithDates = parsed.map((session: any) => ({
          ...session,
          metadata: {
            ...session.metadata,
            createdAt: new Date(session.metadata.createdAt),
            updatedAt: new Date(session.metadata.updatedAt),
            lastOpenedAt: session.metadata.lastOpenedAt ? new Date(session.metadata.lastOpenedAt) : undefined,
          }
        }));
        setSessions(sessionsWithDates);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    }
  }, []);

  // Save sessions to localStorage whenever sessions change
  useEffect(() => {
    localStorage.setItem('case-crafter-sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Filter and sort sessions
  useEffect(() => {
    let filtered = [...sessions];

    // Search filter
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(session => 
        session.name.toLowerCase().includes(term) ||
        session.description?.toLowerCase().includes(term) ||
        session.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Tags filter
    if (filter.tags.length > 0) {
      filtered = filtered.filter(session =>
        filter.tags.every(tag => session.tags.includes(tag))
      );
    }

    // Status filter
    if (filter.status.length > 0) {
      filtered = filtered.filter(session =>
        filter.status.includes(session.metadata.completionStatus)
      );
    }

    // Framework filter
    if (filter.framework.length > 0) {
      filtered = filtered.filter(session =>
        session.framework && filter.framework.includes(session.framework.name)
      );
    }

    // Date range filter
    if (filter.dateRange.start || filter.dateRange.end) {
      filtered = filtered.filter(session => {
        const sessionDate = session.metadata.updatedAt;
        if (filter.dateRange.start && sessionDate < filter.dateRange.start) return false;
        if (filter.dateRange.end && sessionDate > filter.dateRange.end) return false;
        return true;
      });
    }

    // Starred filter
    if (filter.showStarredOnly) {
      filtered = filtered.filter(session => session.metadata.isStarred);
    }

    // Shared filter
    if (filter.showSharedOnly) {
      filtered = filtered.filter(session => session.metadata.isShared);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filter.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.metadata.createdAt.getTime();
          bValue = b.metadata.createdAt.getTime();
          break;
        case 'updatedAt':
          aValue = a.metadata.updatedAt.getTime();
          bValue = b.metadata.updatedAt.getTime();
          break;
        case 'openCount':
          aValue = a.metadata.openCount;
          bValue = b.metadata.openCount;
          break;
        default:
          aValue = a.metadata.updatedAt.getTime();
          bValue = b.metadata.updatedAt.getTime();
      }

      if (filter.sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    setFilteredSessions(filtered);
  }, [sessions, filter]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !currentSession) return;

    const interval = setInterval(() => {
      if (currentSession.id) {
        handleAutoSave();
      }
    }, saveInterval);

    return () => clearInterval(interval);
  }, [autoSave, saveInterval, currentSession]);

  const handleAutoSave = useCallback(async () => {
    if (!currentSession || !currentSession.id) return;

    const existingSession = sessions.find(s => s.id === currentSession.id);
    if (existingSession) {
      const updatedSession: GenerationSession = {
        ...existingSession,
        ...currentSession,
        metadata: {
          ...existingSession.metadata,
          updatedAt: new Date(),
        }
      };

      try {
        await onSaveSession(updatedSession);
        setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, [currentSession, sessions, onSaveSession]);

  const handleSaveNew = useCallback(async () => {
    if (!sessionName.trim() || !currentSession) return;

    const newSession: GenerationSession = {
      id: `session-${Date.now()}`,
      name: sessionName.trim(),
      description: sessionDescription.trim() || undefined,
      tags: sessionTags,
      framework: currentSession.framework,
      contentStructure: currentSession.contentStructure || {
        elements: [],
        totalEstimatedLength: 0,
        includedCategories: [],
        customInstructions: '',
      },
      formData: currentSession.formData || {},
      aiPrompt: currentSession.aiPrompt || '',
      generationOptions: currentSession.generationOptions || {},
      contentPreferences: currentSession.contentPreferences || {},
      generatedContent: currentSession.generatedContent,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user', // In a real app, this would come from auth
        version: '1.0.0',
        wordCount: currentSession.contentStructure?.totalEstimatedLength || 0,
        completionStatus: 'draft',
        isStarred: false,
        isShared: false,
        openCount: 0,
      },
      settings: {
        autoSave,
        saveInterval,
        backupEnabled: true,
        syncEnabled: true,
      },
    };

    try {
      const success = await onSaveSession(newSession);
      if (success) {
        setSessions(prev => [newSession, ...prev]);
        setSaveDialog(false);
        setSessionName('');
        setSessionDescription('');
        setSessionTags([]);
        showNotification('Session saved successfully!', 'success');
      }
    } catch (error) {
      showNotification('Failed to save session', 'error');
    }
  }, [sessionName, sessionDescription, sessionTags, currentSession, autoSave, saveInterval, onSaveSession]);

  const handleLoadSession = useCallback(async (session: GenerationSession) => {
    // Update session metadata
    const updatedSession = {
      ...session,
      metadata: {
        ...session.metadata,
        lastOpenedAt: new Date(),
        openCount: session.metadata.openCount + 1,
      }
    };

    setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s));
    onLoadSession(updatedSession);
    setLoadDialog(false);
    showNotification(`Loaded session: ${session.name}`, 'success');
  }, [onLoadSession]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const success = await onDeleteSession(sessionId);
      if (success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        setDeleteDialog(null);
        showNotification('Session deleted successfully', 'success');
      }
    } catch (error) {
      showNotification('Failed to delete session', 'error');
    }
  }, [onDeleteSession]);

  const handleToggleStar = useCallback((sessionId: string) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId
        ? {
            ...session,
            metadata: {
              ...session.metadata,
              isStarred: !session.metadata.isStarred,
              updatedAt: new Date(),
            }
          }
        : session
    ));
  }, []);

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !sessionTags.includes(newTag.trim())) {
      setSessionTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, sessionTags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setSessionTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      case 'published': return 'primary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckIcon />;
      case 'in-progress': return <ScheduleIcon />;
      case 'published': return <ShareIcon />;
      default: return <EditIcon />;
    }
  };

  const availableTags = useMemo(() => {
    const allTags = sessions.flatMap(session => session.tags);
    return [...new Set(allTags)].sort();
  }, [sessions]);

  const availableFrameworks = useMemo(() => {
    const frameworks = sessions
      .map(session => session.framework?.name)
      .filter(Boolean) as string[];
    return [...new Set(frameworks)].sort();
  }, [sessions]);

  const renderSaveDialog = () => (
    <Dialog open={saveDialog} onClose={() => setSaveDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>Save Generation Session</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Session Name"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Enter a descriptive name for this session"
            required
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={sessionDescription}
            onChange={(e) => setSessionDescription(e.target.value)}
            placeholder="Optional description of this generation session"
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {sessionTags.map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                label="Add Tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="e.g., marketing, case-study, draft"
              />
              <Button onClick={handleAddTag} variant="outlined">
                Add
              </Button>
            </Box>
          </Box>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Advanced Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                    />
                  }
                  label="Enable Auto-Save"
                />
                {autoSave && (
                  <TextField
                    type="number"
                    label="Auto-Save Interval (seconds)"
                    value={saveInterval / 1000}
                    onChange={(e) => setSaveInterval(parseInt(e.target.value) * 1000)}
                    inputProps={{ min: 10, max: 300 }}
                  />
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSaveDialog(false)}>Cancel</Button>
        <Button 
          onClick={handleSaveNew} 
          variant="contained"
          disabled={!sessionName.trim()}
        >
          Save Session
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderLoadDialog = () => (
    <Dialog open={loadDialog} onClose={() => setLoadDialog(false)} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Load Generation Session</Typography>
          <IconButton onClick={() => setLoadDialog(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Filter Controls */}
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={filter.searchTerm}
                onChange={(e) => setFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filter.sortBy}
                  onChange={(e) => setFilter(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  label="Sort By"
                >
                  <MenuItem value="updatedAt">Last Modified</MenuItem>
                  <MenuItem value="createdAt">Created Date</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="openCount">Usage Count</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Order</InputLabel>
                <Select
                  value={filter.sortOrder}
                  onChange={(e) => setFilter(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                  label="Order"
                >
                  <MenuItem value="desc">Descending</MenuItem>
                  <MenuItem value="asc">Ascending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={filter.showStarredOnly}
                      onChange={(e) => setFilter(prev => ({ ...prev, showStarredOnly: e.target.checked }))}
                    />
                  }
                  label="Starred Only"
                />
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* Sessions List */}
        <Grid container spacing={2}>
          {filteredSessions.map(session => (
            <Grid item xs={12} md={6} lg={4} key={session.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { elevation: 2, bgcolor: 'action.hover' },
                  transition: 'all 0.2s ease-in-out'
                }}
                onClick={() => handleLoadSession(session)}
              >
                <CardHeader
                  avatar={
                    session.framework ? <BusinessIcon color="primary" /> : <FolderIcon />
                  }
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" noWrap>
                        {session.name}
                      </Typography>
                      {session.metadata.isStarred && (
                        <StarIcon color="warning" fontSize="small" />
                      )}
                    </Box>
                  }
                  subheader={
                    <Typography variant="caption" color="text.secondary">
                      {session.metadata.updatedAt.toLocaleDateString()}
                    </Typography>
                  }
                  action={
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionMenu({ anchor: e.currentTarget, sessionId: session.id });
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  {session.description && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {session.description}
                    </Typography>
                  )}
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip
                      icon={getStatusIcon(session.metadata.completionStatus)}
                      label={session.metadata.completionStatus}
                      size="small"
                      color={getStatusColor(session.metadata.completionStatus)}
                    />
                    {session.framework && (
                      <Chip
                        label={session.framework.name}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Stack>

                  {session.tags.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {session.tags.slice(0, 3).map(tag => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      ))}
                      {session.tags.length > 3 && (
                        <Chip
                          label={`+${session.tags.length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {session.metadata.wordCount} words • Opened {session.metadata.openCount} times
                  </Typography>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStar(session.id);
                    }}
                  >
                    {session.metadata.isStarred ? <StarIcon /> : <StarBorderIcon />}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredSessions.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No sessions found matching the current filters.
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Session Management
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<SaveIcon />}
            onClick={() => setSaveDialog(true)}
            variant="contained"
            disabled={disabled || !currentSession}
          >
            Save Session
          </Button>
          <Button
            startIcon={<FolderOpenIcon />}
            onClick={() => setLoadDialog(true)}
            variant="outlined"
          >
            Load Session
          </Button>
          <Button
            startIcon={<ImportExportIcon />}
            onClick={() => setImportDialog(true)}
            variant="outlined"
          >
            Import/Export
          </Button>
        </Stack>
      </Box>

      {/* Statistics */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="primary">
              {sessions.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Sessions
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="warning.main">
              {sessions.filter(s => s.metadata.isStarred).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Starred
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="success.main">
              {sessions.filter(s => s.metadata.completionStatus === 'completed').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="info.main">
              {availableFrameworks.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Frameworks Used
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Current Session Info */}
      {currentSession && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Current Session:</strong> {currentSession.name || 'Unsaved Session'} • 
            Auto-save: {autoSave ? 'Enabled' : 'Disabled'}
            {currentSession.metadata?.updatedAt && (
              <span> • Last saved: {currentSession.metadata.updatedAt.toLocaleString()}</span>
            )}
          </Typography>
        </Alert>
      )}

      {/* Dialogs */}
      {renderSaveDialog()}
      {renderLoadDialog()}

      {/* Session Context Menu */}
      <Menu
        anchorEl={sessionMenu?.anchor}
        open={Boolean(sessionMenu)}
        onClose={() => setSessionMenu(null)}
      >
        <MenuItem
          onClick={() => {
            const session = sessions.find(s => s.id === sessionMenu?.sessionId);
            if (session) {
              handleToggleStar(session.id);
            }
            setSessionMenu(null);
          }}
        >
          <ListItemIcon>
            {sessions.find(s => s.id === sessionMenu?.sessionId)?.metadata.isStarred ? 
              <StarIcon /> : <StarBorderIcon />
            }
          </ListItemIcon>
          <ListItemText>
            {sessions.find(s => s.id === sessionMenu?.sessionId)?.metadata.isStarred ? 
              'Remove from Favorites' : 'Add to Favorites'
            }
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            const session = sessions.find(s => s.id === sessionMenu?.sessionId);
            if (session) {
              onExportSession(session, 'json');
            }
            setSessionMenu(null);
          }}
        >
          <ListItemIcon><CloudDownloadIcon /></ListItemIcon>
          <ListItemText>Export Session</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (sessionMenu?.sessionId) {
              setDeleteDialog(sessionMenu.sessionId);
            }
            setSessionMenu(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
          <ListItemText>Delete Session</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete Session</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this session? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button 
            onClick={() => deleteDialog && handleDeleteSession(deleteDialog)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        message={notification.message}
      />
    </Box>
  );
};