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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  History as VersionIcon,
  Compare as CompareIcon,
  Restore as RestoreIcon,
  Save as SaveIcon,
  Branch as BranchIcon,
  Merge as MergeIcon,
  Tag as TagVersionIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
  Share as ShareIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Star as StarIcon,
  Comment as CommentIcon,
  Assignment as DraftIcon,
  CheckCircle as PublishedIcon,
  Warning as DraftWarningIcon,
  ExpandMore as ExpandIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Difference as DiffIcon,
  ContentCopy as CopyIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@mui/icons-material';
import { ContentItem } from './ContentLibrary';

// Version control interfaces
export interface ContentVersion {
  id: string;
  contentId: string;
  version: string;
  title: string;
  description: string;
  content: string;
  metadata: {
    author: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    createdAt: Date;
    size: number;
    wordCount: number;
    changesSummary: string;
    tags: string[];
    status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
    isMinor: boolean;
    isMajor: boolean;
    parentVersion?: string;
    branchName?: string;
  };
  changes: {
    added: number;
    modified: number;
    deleted: number;
    sections: Array<{
      section: string;
      changeType: 'added' | 'modified' | 'deleted' | 'moved';
      oldValue?: string;
      newValue?: string;
    }>;
  };
  approvals: Array<{
    userId: string;
    userName: string;
    status: 'pending' | 'approved' | 'rejected';
    comment?: string;
    timestamp: Date;
  }>;
  conflicts?: Array<{
    section: string;
    type: 'content' | 'metadata';
    description: string;
    resolved: boolean;
  }>;
}

export interface Branch {
  id: string;
  name: string;
  description: string;
  baseVersion: string;
  headVersion: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'merged' | 'abandoned';
  mergeRequest?: {
    id: string;
    title: string;
    description: string;
    targetBranch: string;
    status: 'open' | 'approved' | 'rejected' | 'merged';
    reviewers: string[];
    createdAt: Date;
  };
}

interface VersionControlProps {
  contentItem: ContentItem;
  onVersionChange?: (version: ContentVersion) => void;
  onRestore?: (version: ContentVersion) => void;
  onSave?: (content: string, summary: string, isMinor?: boolean) => void;
  allowEdit?: boolean;
  showAdvanced?: boolean;
}

export const VersionControl: React.FC<VersionControlProps> = ({
  contentItem,
  onVersionChange,
  onRestore,
  onSave,
  allowEdit = true,
  showAdvanced = false,
}) => {
  // State management
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ContentVersion | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showDiff, setShowDiff] = useState(false);
  const [diffVersions, setDiffVersions] = useState<{from: string, to: string}>({ from: '', to: '' });
  
  // Dialog states
  const [saveDialog, setSaveDialog] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState<ContentVersion | null>(null);
  const [branchDialog, setBranchDialog] = useState(false);
  const [mergeDialog, setMergeDialog] = useState<Branch | null>(null);
  const [versionMenu, setVersionMenu] = useState<{anchor: HTMLElement, version: ContentVersion} | null>(null);

  // Form states
  const [saveForm, setSaveForm] = useState({
    summary: '',
    isMinor: false,
    tags: [] as string[],
    branchName: 'main',
  });

  const [branchForm, setBranchForm] = useState({
    name: '',
    description: '',
    baseVersion: '',
  });

  // Load versions and branches
  useEffect(() => {
    loadVersions();
    loadBranches();
  }, [contentItem.id]);

  const loadVersions = useCallback(() => {
    // In a real app, this would fetch from API
    const sampleVersions = generateSampleVersions(contentItem.id);
    setVersions(sampleVersions);
    setCurrentVersion(sampleVersions[0] || null);
  }, [contentItem.id]);

  const loadBranches = useCallback(() => {
    // In a real app, this would fetch from API
    const sampleBranches = generateSampleBranches(contentItem.id);
    setBranches(sampleBranches);
  }, [contentItem.id]);

  // Version comparison
  const compareVersions = useCallback((fromId: string, toId: string) => {
    setDiffVersions({ from: fromId, to: toId });
    setShowDiff(true);
  }, []);

  // Save new version
  const handleSaveVersion = useCallback(async () => {
    if (!saveForm.summary.trim()) return;

    try {
      const newVersion: ContentVersion = {
        id: `v${Date.now()}`,
        contentId: contentItem.id,
        version: generateVersionNumber(versions, saveForm.isMinor),
        title: contentItem.title,
        description: contentItem.description,
        content: contentItem.content || '',
        metadata: {
          author: {
            id: 'current-user',
            name: 'Current User',
            email: 'user@example.com',
          },
          createdAt: new Date(),
          size: (contentItem.content || '').length,
          wordCount: contentItem.wordCount,
          changesSummary: saveForm.summary,
          tags: saveForm.tags,
          status: 'draft',
          isMinor: saveForm.isMinor,
          isMajor: !saveForm.isMinor,
          parentVersion: currentVersion?.id,
          branchName: saveForm.branchName,
        },
        changes: calculateChanges(currentVersion?.content || '', contentItem.content || ''),
        approvals: [],
      };

      setVersions(prev => [newVersion, ...prev]);
      setCurrentVersion(newVersion);
      
      if (onSave) {
        onSave(contentItem.content || '', saveForm.summary, saveForm.isMinor);
      }

      setSaveDialog(false);
      setSaveForm({ summary: '', isMinor: false, tags: [], branchName: 'main' });
    } catch (error) {
      console.error('Failed to save version:', error);
    }
  }, [saveForm, contentItem, versions, currentVersion, onSave]);

  // Restore version
  const handleRestoreVersion = useCallback(async (version: ContentVersion) => {
    if (onRestore) {
      onRestore(version);
    }
    setCurrentVersion(version);
    setRestoreDialog(null);
  }, [onRestore]);

  // Create branch
  const handleCreateBranch = useCallback(async () => {
    if (!branchForm.name.trim()) return;

    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: branchForm.name,
      description: branchForm.description,
      baseVersion: branchForm.baseVersion || currentVersion?.id || '',
      headVersion: currentVersion?.id || '',
      author: {
        id: 'current-user',
        name: 'Current User',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
    };

    setBranches(prev => [...prev, newBranch]);
    setBranchDialog(false);
    setBranchForm({ name: '', description: '', baseVersion: '' });
  }, [branchForm, currentVersion]);

  // Filter and sort versions
  const filteredVersions = useMemo(() => {
    return versions.sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime());
  }, [versions]);

  // Render version timeline
  const renderVersionTimeline = () => (
    <Timeline>
      {filteredVersions.map((version, index) => (
        <TimelineItem key={version.id}>
          <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
            {version.metadata.createdAt.toLocaleDateString()}
            <br />
            {version.metadata.createdAt.toLocaleTimeString()}
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot 
              color={
                version.metadata.status === 'published' ? 'success' :
                version.metadata.status === 'approved' ? 'primary' :
                version.metadata.status === 'review' ? 'warning' : 'grey'
              }
              variant={version.id === currentVersion?.id ? 'filled' : 'outlined'}
            >
              {version.metadata.status === 'published' ? <PublishedIcon /> :
               version.metadata.status === 'draft' ? <DraftIcon /> :
               <EditIcon />}
            </TimelineDot>
            {index < filteredVersions.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent sx={{ py: '12px', px: 2 }}>
            <Card 
              variant={version.id === currentVersion?.id ? 'elevation' : 'outlined'}
              sx={{ 
                cursor: 'pointer',
                '&:hover': { elevation: 2 },
                border: version.id === currentVersion?.id ? 2 : 1,
                borderColor: version.id === currentVersion?.id ? 'primary.main' : 'divider',
              }}
              onClick={() => setCurrentVersion(version)}
            >
              <CardHeader
                avatar={
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {version.metadata.author.name.charAt(0)}
                  </Avatar>
                }
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">
                      Version {version.version}
                    </Typography>
                    <Chip 
                      label={version.metadata.status} 
                      size="small"
                      color={
                        version.metadata.status === 'published' ? 'success' :
                        version.metadata.status === 'approved' ? 'primary' :
                        version.metadata.status === 'review' ? 'warning' : 'default'
                      }
                    />
                    {version.metadata.isMajor && (
                      <Chip label="Major" size="small" color="error" variant="outlined" />
                    )}
                    {version.metadata.isMinor && (
                      <Chip label="Minor" size="small" color="info" variant="outlined" />
                    )}
                  </Box>
                }
                subheader={`by ${version.metadata.author.name}`}
                action={
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVersionMenu({ anchor: e.currentTarget, version });
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                }
              />
              <CardContent sx={{ pt: 0 }}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {version.metadata.changesSummary}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="success.main">
                      +{version.changes.added}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="warning.main">
                      ~{version.changes.modified}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="error.main">
                      -{version.changes.deleted}
                    </Typography>
                  </Grid>
                </Grid>

                {version.metadata.tags.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {version.metadata.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onVersionChange) onVersionChange(version);
                  }}
                >
                  View
                </Button>
                <Button
                  size="small"
                  startIcon={<CompareIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedVersions.length === 1) {
                      compareVersions(selectedVersions[0], version.id);
                    } else {
                      setSelectedVersions([version.id]);
                    }
                  }}
                  disabled={!currentVersion || version.id === currentVersion.id}
                >
                  Compare
                </Button>
                {allowEdit && (
                  <Button
                    size="small"
                    startIcon={<RestoreIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRestoreDialog(version);
                    }}
                    disabled={version.id === currentVersion?.id}
                  >
                    Restore
                  </Button>
                )}
              </CardActions>
            </Card>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );

  // Render branches
  const renderBranches = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Branches</Typography>
        {allowEdit && (
          <Button
            variant="contained"
            startIcon={<BranchIcon />}
            onClick={() => setBranchDialog(true)}
          >
            Create Branch
          </Button>
        )}
      </Box>
      
      <Stack spacing={2}>
        {branches.map(branch => (
          <Card key={branch.id} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    <BranchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {branch.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {branch.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created by {branch.author.name} on {branch.createdAt.toLocaleDateString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={branch.status} 
                    size="small"
                    color={
                      branch.status === 'active' ? 'success' :
                      branch.status === 'merged' ? 'primary' : 'default'
                    }
                  />
                  {branch.mergeRequest && (
                    <Chip 
                      label={`MR: ${branch.mergeRequest.status}`} 
                      size="small" 
                      color="info"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Button size="small" startIcon={<ViewIcon />}>
                Switch to Branch
              </Button>
              {branch.status === 'active' && allowEdit && (
                <Button 
                  size="small" 
                  startIcon={<MergeIcon />}
                  onClick={() => setMergeDialog(branch)}
                >
                  Create Merge Request
                </Button>
              )}
            </CardActions>
          </Card>
        ))}
      </Stack>
    </Box>
  );

  // Render diff view
  const renderDiffView = () => {
    const fromVersion = versions.find(v => v.id === diffVersions.from);
    const toVersion = versions.find(v => v.id === diffVersions.to);
    
    if (!fromVersion || !toVersion) return null;

    return (
      <Dialog open={showDiff} onClose={() => setShowDiff(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Compare Versions: {fromVersion.version} → {toVersion.version}
            </Typography>
            <IconButton onClick={() => setShowDiff(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle1" gutterBottom>
                Version {fromVersion.version}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: 400, overflow: 'auto' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {fromVersion.content}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle1" gutterBottom>
                Version {toVersion.version}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, height: 400, overflow: 'auto' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {toVersion.content}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Change Summary
            </Typography>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Added:</strong> {toVersion.changes.added} sections, {' '}
                <strong>Modified:</strong> {toVersion.changes.modified} sections, {' '}
                <strong>Deleted:</strong> {toVersion.changes.deleted} sections
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Version Control: {contentItem.title}
        </Typography>
        <Stack direction="row" spacing={1}>
          {allowEdit && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => setSaveDialog(true)}
            >
              Save Version
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<CompareIcon />}
            disabled={selectedVersions.length !== 2}
            onClick={() => compareVersions(selectedVersions[0], selectedVersions[1])}
          >
            Compare Selected
          </Button>
        </Stack>
      </Box>

      {/* Current Version Info */}
      {currentVersion && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Current Version:</strong> {currentVersion.version} • 
            <strong> Status:</strong> {currentVersion.metadata.status} • 
            <strong> Author:</strong> {currentVersion.metadata.author.name} • 
            <strong> Last Modified:</strong> {currentVersion.metadata.createdAt.toLocaleString()}
          </Typography>
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Version History" icon={<VersionIcon />} />
          {showAdvanced && <Tab label="Branches" icon={<BranchIcon />} />}
          <Tab label="Statistics" icon={<VersionIcon />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && renderVersionTimeline()}
      {activeTab === 1 && showAdvanced && renderBranches()}
      {activeTab === (showAdvanced ? 2 : 1) && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h4" color="primary">
              {versions.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Versions
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h4" color="success.main">
              {versions.filter(v => v.metadata.status === 'published').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Published
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h4" color="warning.main">
              {versions.filter(v => v.metadata.isMajor).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Major Versions
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h4" color="info.main">
              {branches.filter(b => b.status === 'active').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Branches
            </Typography>
          </Grid>
        </Grid>
      )}

      {/* Save Version Dialog */}
      <Dialog open={saveDialog} onClose={() => setSaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save New Version</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Change Summary"
              value={saveForm.summary}
              onChange={(e) => setSaveForm(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Describe the changes made in this version"
              multiline
              rows={3}
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>Branch</InputLabel>
              <Select
                value={saveForm.branchName}
                onChange={(e) => setSaveForm(prev => ({ ...prev, branchName: e.target.value }))}
                label="Branch"
              >
                <MenuItem value="main">main</MenuItem>
                {branches.filter(b => b.status === 'active').map(branch => (
                  <MenuItem key={branch.id} value={branch.name}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={saveForm.isMinor}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, isMinor: e.target.checked }))}
                />
              }
              label="Minor version (bug fixes, small changes)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveVersion}
            variant="contained"
            disabled={!saveForm.summary.trim()}
          >
            Save Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog 
        open={!!restoreDialog} 
        onClose={() => setRestoreDialog(null)}
      >
        <DialogTitle>Restore Version</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to restore to version {restoreDialog?.version}? 
            This will create a new version with the restored content.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(null)}>Cancel</Button>
          <Button 
            onClick={() => restoreDialog && handleRestoreVersion(restoreDialog)}
            color="primary"
            variant="contained"
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={versionMenu?.anchor}
        open={Boolean(versionMenu)}
        onClose={() => setVersionMenu(null)}
      >
        <MenuItem onClick={() => setVersionMenu(null)}>
          <ListItemIcon><ViewIcon /></ListItemIcon>
          <ListItemText>View Version</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setVersionMenu(null)}>
          <ListItemIcon><DownloadIcon /></ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setVersionMenu(null)}>
          <ListItemIcon><TagVersionIcon /></ListItemIcon>
          <ListItemText>Create Tag</ListItemText>
        </MenuItem>
      </Menu>

      {/* Diff View Dialog */}
      {renderDiffView()}
    </Box>
  );
};

// Helper functions
function generateVersionNumber(versions: ContentVersion[], isMinor: boolean): string {
  if (versions.length === 0) return '1.0.0';
  
  const latest = versions[0];
  const [major, minor, patch] = latest.version.split('.').map(Number);
  
  if (isMinor) {
    return `${major}.${minor}.${patch + 1}`;
  } else {
    return `${major}.${minor + 1}.0`;
  }
}

function calculateChanges(oldContent: string, newContent: string) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  // Simple diff calculation
  let added = 0;
  let modified = 0;
  let deleted = 0;
  
  if (newLines.length > oldLines.length) {
    added = newLines.length - oldLines.length;
  } else if (oldLines.length > newLines.length) {
    deleted = oldLines.length - newLines.length;
  } else {
    // Same number of lines, check for modifications
    for (let i = 0; i < oldLines.length; i++) {
      if (oldLines[i] !== newLines[i]) {
        modified++;
      }
    }
  }
  
  return {
    added,
    modified,
    deleted,
    sections: [
      {
        section: 'content',
        changeType: added > 0 ? 'added' : modified > 0 ? 'modified' : 'deleted' as const,
        oldValue: oldContent.substring(0, 100) + '...',
        newValue: newContent.substring(0, 100) + '...',
      }
    ]
  };
}

function generateSampleVersions(contentId: string): ContentVersion[] {
  return [
    {
      id: 'v1',
      contentId,
      version: '2.1.0',
      title: 'Updated Case Study Title',
      description: 'Latest version with enhanced content',
      content: 'This is the latest version of the case study content...',
      metadata: {
        author: {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        createdAt: new Date('2024-02-15T10:30:00'),
        size: 2456,
        wordCount: 1200,
        changesSummary: 'Added financial analysis section and updated methodology',
        tags: ['major-update', 'financial-analysis'],
        status: 'published',
        isMinor: false,
        isMajor: true,
        branchName: 'main',
      },
      changes: {
        added: 3,
        modified: 2,
        deleted: 0,
        sections: [
          {
            section: 'financial-analysis',
            changeType: 'added',
            newValue: 'New financial analysis section...',
          }
        ]
      },
      approvals: [
        {
          userId: 'reviewer1',
          userName: 'Jane Smith',
          status: 'approved',
          comment: 'Looks good, financial analysis is comprehensive',
          timestamp: new Date('2024-02-14T15:00:00'),
        }
      ],
    },
    {
      id: 'v2',
      contentId,
      version: '2.0.1',
      title: 'Bug Fix Version',
      description: 'Minor fixes and improvements',
      content: 'Previous version content with bug fixes...',
      metadata: {
        author: {
          id: 'user2',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
        createdAt: new Date('2024-02-10T14:20:00'),
        size: 2234,
        wordCount: 1150,
        changesSummary: 'Fixed typos and formatting issues',
        tags: ['bug-fix', 'formatting'],
        status: 'published',
        isMinor: true,
        isMajor: false,
        parentVersion: 'v3',
        branchName: 'main',
      },
      changes: {
        added: 0,
        modified: 5,
        deleted: 1,
        sections: [
          {
            section: 'introduction',
            changeType: 'modified',
            oldValue: 'Original introduction text...',
            newValue: 'Updated introduction text...',
          }
        ]
      },
      approvals: [],
    },
  ];
}

function generateSampleBranches(contentId: string): Branch[] {
  return [
    {
      id: 'branch1',
      name: 'feature/enhanced-analysis',
      description: 'Adding advanced analytical frameworks and metrics',
      baseVersion: 'v1',
      headVersion: 'v1',
      author: {
        id: 'user1',
        name: 'John Doe',
      },
      createdAt: new Date('2024-02-12T09:00:00'),
      updatedAt: new Date('2024-02-15T16:30:00'),
      status: 'active',
      mergeRequest: {
        id: 'mr1',
        title: 'Enhanced Analysis Framework',
        description: 'Adds comprehensive analytical tools and advanced metrics',
        targetBranch: 'main',
        status: 'open',
        reviewers: ['user2', 'user3'],
        createdAt: new Date('2024-02-15T16:30:00'),
      },
    },
  ];
}