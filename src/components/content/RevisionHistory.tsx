import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Tabs,
  Tab,
  Avatar,
  AvatarGroup,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DatePicker,
  Autocomplete,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  History as HistoryIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Compare as CompareIcon,
  Download as DownloadIcon,
  Filter as FilterIcon,
  TrendingUp as TrendingIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  Assignment as ContentIcon,
  Tag as TagIcon,
  Branch as BranchIcon,
  Merge as MergeIcon,
  Star as StarIcon,
  CheckCircle as ApprovedIcon,
  Warning as PendingIcon,
  Error as RejectedIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ContentVersion, Branch } from './VersionControl';
import { VersionDiff } from './VersionDiff';

interface RevisionActivity {
  id: string;
  type: 'version_created' | 'version_approved' | 'version_published' | 'branch_created' | 'merge_request' | 'content_restored';
  timestamp: Date;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  contentId: string;
  contentTitle: string;
  version?: ContentVersion;
  branch?: Branch;
  description: string;
  metadata: {
    impact: 'low' | 'medium' | 'high';
    category: string;
    tags: string[];
  };
}

interface RevisionStats {
  totalVersions: number;
  activeBranches: number;
  pendingApprovals: number;
  publishedToday: number;
  topContributors: Array<{
    user: string;
    count: number;
    avatar?: string;
  }>;
  contentActivity: Array<{
    contentId: string;
    title: string;
    versionCount: number;
    lastModified: Date;
  }>;
  weeklyActivity: Array<{
    day: string;
    versions: number;
    approvals: number;
  }>;
}

interface RevisionHistoryProps {
  contentItems?: Array<{id: string, title: string}>;
  dateRange?: {start: Date, end: Date};
  showGlobalHistory?: boolean;
  maxItems?: number;
}

export const RevisionHistory: React.FC<RevisionHistoryProps> = ({
  contentItems = [],
  dateRange,
  showGlobalHistory = true,
  maxItems = 50,
}) => {
  // State management
  const [activities, setActivities] = useState<RevisionActivity[]>([]);
  const [stats, setStats] = useState<RevisionStats | null>(null);
  const [filteredActivities, setFilteredActivities] = useState<RevisionActivity[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<RevisionActivity | null>(null);
  const [compareDialog, setCompareDialog] = useState<{from: ContentVersion, to: ContentVersion} | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    searchTerm: '',
    activityType: 'all',
    user: '',
    dateRange: { start: null as Date | null, end: null as Date | null },
    impact: 'all',
    contentId: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load data
  useEffect(() => {
    loadRevisionHistory();
    loadRevisionStats();
  }, [contentItems, dateRange]);

  const loadRevisionHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from API
      const sampleActivities = generateSampleActivities();
      setActivities(sampleActivities);
    } catch (error) {
      console.error('Failed to load revision history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRevisionStats = useCallback(async () => {
    try {
      // In a real app, this would fetch from API
      const sampleStats = generateSampleStats();
      setStats(sampleStats);
    } catch (error) {
      console.error('Failed to load revision stats:', error);
    }
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...activities];

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.description.toLowerCase().includes(term) ||
        activity.contentTitle.toLowerCase().includes(term) ||
        activity.user.name.toLowerCase().includes(term)
      );
    }

    // Activity type filter
    if (filters.activityType !== 'all') {
      filtered = filtered.filter(activity => activity.type === filters.activityType);
    }

    // User filter
    if (filters.user) {
      filtered = filtered.filter(activity => activity.user.name === filters.user);
    }

    // Date range filter
    if (filters.dateRange.start) {
      filtered = filtered.filter(activity => activity.timestamp >= filters.dateRange.start!);
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(activity => activity.timestamp <= filters.dateRange.end!);
    }

    // Impact filter
    if (filters.impact !== 'all') {
      filtered = filtered.filter(activity => activity.metadata.impact === filters.impact);
    }

    // Content filter
    if (filters.contentId) {
      filtered = filtered.filter(activity => activity.contentId === filters.contentId);
    }

    // Limit results
    filtered = filtered.slice(0, maxItems);

    setFilteredActivities(filtered);
  }, [activities, filters, maxItems]);

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'version_created': return <EditIcon />;
      case 'version_approved': return <ApprovedIcon />;
      case 'version_published': return <StarIcon />;
      case 'branch_created': return <BranchIcon />;
      case 'merge_request': return <MergeIcon />;
      case 'content_restored': return <HistoryIcon />;
      default: return <ContentIcon />;
    }
  };

  // Get activity color
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'version_created': return 'primary';
      case 'version_approved': return 'success';
      case 'version_published': return 'warning';
      case 'branch_created': return 'info';
      case 'merge_request': return 'secondary';
      case 'content_restored': return 'default';
      default: return 'default';
    }
  };

  // Render activity timeline
  const renderActivityTimeline = () => (
    <Timeline>
      {filteredActivities.map((activity, index) => (
        <TimelineItem key={activity.id}>
          <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
            {activity.timestamp.toLocaleDateString()}
            <br />
            {activity.timestamp.toLocaleTimeString()}
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot color={getActivityColor(activity.type) as any}>
              {getActivityIcon(activity.type)}
            </TimelineDot>
            {index < filteredActivities.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent sx={{ py: '12px', px: 2 }}>
            <Card 
              variant="outlined"
              sx={{ 
                cursor: 'pointer',
                '&:hover': { elevation: 2 },
                transition: 'all 0.2s ease-in-out',
              }}
              onClick={() => setSelectedActivity(activity)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                    {activity.user.name.charAt(0)}
                  </Avatar>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                    {activity.user.name}
                  </Typography>
                  <Chip 
                    label={activity.metadata.impact} 
                    size="small"
                    color={
                      activity.metadata.impact === 'high' ? 'error' :
                      activity.metadata.impact === 'medium' ? 'warning' : 'default'
                    }
                    sx={{ ml: 'auto' }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {activity.description}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={activity.contentTitle} size="small" variant="outlined" />
                  {activity.version && (
                    <Chip 
                      label={`v${activity.version.version}`} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {activity.metadata.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );

  // Render statistics dashboard
  const renderStatsDashboard = () => {
    if (!stats) return <LinearProgress />;

    return (
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Key Metrics</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="h4" color="primary">
                  {stats.totalVersions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Versions
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="h4" color="info.main">
                  {stats.activeBranches}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Branches
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="h4" color="warning.main">
                  {stats.pendingApprovals}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Approvals
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="h4" color="success.main">
                  {stats.publishedToday}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Published Today
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Top Contributors */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Top Contributors" />
            <CardContent>
              <List>
                {stats.topContributors.map((contributor, index) => (
                  <ListItem key={contributor.user}>
                    <ListItemIcon>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {contributor.user.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText 
                      primary={contributor.user}
                      secondary={`${contributor.count} contributions`}
                    />
                    <ListItemSecondaryAction>
                      <Chip label={`#${index + 1}`} size="small" color="primary" />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Content Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Most Active Content" />
            <CardContent>
              <List>
                {stats.contentActivity.map((content) => (
                  <ListItem key={content.contentId}>
                    <ListItemIcon>
                      <ContentIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={content.title}
                      secondary={`${content.versionCount} versions • Last modified ${content.lastModified.toLocaleDateString()}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip label={content.versionCount} size="small" color="secondary" />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Activity Chart */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Weekly Activity" />
            <CardContent>
              <Box sx={{ height: 200 }}>
                {/* Placeholder for chart - in a real app, use a charting library */}
                <Typography variant="body2" color="text.secondary">
                  Chart showing weekly version creation and approval activity would go here.
                </Typography>
                <Grid container spacing={1} sx={{ mt: 2 }}>
                  {stats.weeklyActivity.map((day) => (
                    <Grid item xs key={day.day}>
                      <Paper sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="caption">{day.day}</Typography>
                        <br />
                        <Typography variant="body2" color="primary">
                          {day.versions}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          versions
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Render filters
  const renderFilters = () => (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">Filters</Typography>
        <Button
          size="small"
          startIcon={<ClearIcon />}
          onClick={() => setFilters({
            searchTerm: '',
            activityType: 'all',
            user: '',
            dateRange: { start: null, end: null },
            impact: 'all',
            contentId: '',
          })}
        >
          Clear All
        </Button>
      </Box>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            label="Search"
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Activity Type</InputLabel>
            <Select
              value={filters.activityType}
              onChange={(e) => setFilters(prev => ({ ...prev, activityType: e.target.value }))}
              label="Activity Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="version_created">Version Created</MenuItem>
              <MenuItem value="version_approved">Version Approved</MenuItem>
              <MenuItem value="version_published">Version Published</MenuItem>
              <MenuItem value="branch_created">Branch Created</MenuItem>
              <MenuItem value="merge_request">Merge Request</MenuItem>
              <MenuItem value="content_restored">Content Restored</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Impact Level</InputLabel>
            <Select
              value={filters.impact}
              onChange={(e) => setFilters(prev => ({ ...prev, impact: e.target.value }))}
              label="Impact Level"
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="low">Low Impact</MenuItem>
              <MenuItem value="medium">Medium Impact</MenuItem>
              <MenuItem value="high">High Impact</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Autocomplete
            size="small"
            options={contentItems}
            getOptionLabel={(option) => option.title}
            value={contentItems.find(item => item.id === filters.contentId) || null}
            onChange={(_, value) => setFilters(prev => ({ ...prev, contentId: value?.id || '' }))}
            renderInput={(params) => (
              <TextField {...params} label="Content" />
            )}
          />
        </Grid>
      </Grid>
    </Paper>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Revision History
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? 'contained' : 'outlined'}
          >
            Filters
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadRevisionHistory}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button startIcon={<ExportIcon />} variant="outlined">
            Export
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      {showFilters && renderFilters()}

      {/* Loading State */}
      {isLoading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Activity Timeline" icon={<HistoryIcon />} />
          <Tab label="Statistics" icon={<TrendingIcon />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {filteredActivities.length === 0 ? (
            <Alert severity="info">
              No revision activities found for the selected filters.
            </Alert>
          ) : (
            renderActivityTimeline()
          )}
        </Box>
      )}

      {activeTab === 1 && renderStatsDashboard()}

      {/* Activity Detail Dialog */}
      <Dialog 
        open={!!selectedActivity} 
        onClose={() => setSelectedActivity(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedActivity && (
          <>
            <DialogTitle>
              Activity Details: {selectedActivity.type.replace('_', ' ')}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2">Description</Typography>
                  <Typography variant="body2">{selectedActivity.description}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">User</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      {selectedActivity.user.name.charAt(0)}
                    </Avatar>
                    <Typography variant="body2">{selectedActivity.user.name}</Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Timestamp</Typography>
                  <Typography variant="body2">
                    {selectedActivity.timestamp.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Content</Typography>
                  <Typography variant="body2">{selectedActivity.contentTitle}</Typography>
                </Box>
                {selectedActivity.version && (
                  <Box>
                    <Typography variant="subtitle2">Version</Typography>
                    <Typography variant="body2">
                      {selectedActivity.version.version} - {selectedActivity.version.metadata.changesSummary}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedActivity(null)}>Close</Button>
              {selectedActivity.version && (
                <Button variant="contained" startIcon={<ViewIcon />}>
                  View Version
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Compare Dialog */}
      {compareDialog && (
        <Dialog open maxWidth="xl" fullWidth onClose={() => setCompareDialog(null)}>
          <DialogContent sx={{ p: 0 }}>
            <VersionDiff
              fromVersion={compareDialog.from}
              toVersion={compareDialog.to}
              onClose={() => setCompareDialog(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

// Helper functions to generate sample data
function generateSampleActivities(): RevisionActivity[] {
  return [
    {
      id: 'act1',
      type: 'version_created',
      timestamp: new Date('2024-02-15T10:30:00'),
      user: {
        id: 'user1',
        name: 'John Doe',
      },
      contentId: 'content1',
      contentTitle: 'Digital Transformation Case Study',
      description: 'Created new version with enhanced financial analysis',
      metadata: {
        impact: 'high',
        category: 'content',
        tags: ['financial-analysis', 'major-update'],
      },
    },
    {
      id: 'act2',
      type: 'version_approved',
      timestamp: new Date('2024-02-14T15:20:00'),
      user: {
        id: 'user2',
        name: 'Jane Smith',
      },
      contentId: 'content1',
      contentTitle: 'Digital Transformation Case Study',
      description: 'Approved version 2.0.1 for publication',
      metadata: {
        impact: 'medium',
        category: 'approval',
        tags: ['approved', 'ready-to-publish'],
      },
    },
    {
      id: 'act3',
      type: 'branch_created',
      timestamp: new Date('2024-02-12T09:15:00'),
      user: {
        id: 'user3',
        name: 'Mike Johnson',
      },
      contentId: 'content2',
      contentTitle: 'Startup Funding Strategy',
      description: 'Created feature branch for enhanced analytics',
      metadata: {
        impact: 'low',
        category: 'development',
        tags: ['feature-branch', 'analytics'],
      },
    },
  ];
}

function generateSampleStats(): RevisionStats {
  return {
    totalVersions: 245,
    activeBranches: 8,
    pendingApprovals: 12,
    publishedToday: 3,
    topContributors: [
      { user: 'John Doe', count: 42 },
      { user: 'Jane Smith', count: 38 },
      { user: 'Mike Johnson', count: 31 },
      { user: 'Sarah Wilson', count: 28 },
      { user: 'David Brown', count: 22 },
    ],
    contentActivity: [
      {
        contentId: 'content1',
        title: 'Digital Transformation Case Study',
        versionCount: 15,
        lastModified: new Date('2024-02-15T10:30:00'),
      },
      {
        contentId: 'content2',
        title: 'Startup Funding Strategy',
        versionCount: 12,
        lastModified: new Date('2024-02-14T16:20:00'),
      },
      {
        contentId: 'content3',
        title: 'Marketing Analytics Framework',
        versionCount: 9,
        lastModified: new Date('2024-02-13T14:15:00'),
      },
    ],
    weeklyActivity: [
      { day: 'Mon', versions: 8, approvals: 3 },
      { day: 'Tue', versions: 12, approvals: 5 },
      { day: 'Wed', versions: 15, approvals: 7 },
      { day: 'Thu', versions: 10, approvals: 4 },
      { day: 'Fri', versions: 18, approvals: 9 },
      { day: 'Sat', versions: 5, approvals: 2 },
      { day: 'Sun', versions: 3, approvals: 1 },
    ],
  };
}