import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Chip,
  Button,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  SwapHoriz as SwapIcon,
  ExpandMore as ExpandIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { ContentVersion } from './VersionControl';

interface DiffLine {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldLineNum?: number;
  newLineNum?: number;
  content: string;
  oldContent?: string;
  newContent?: string;
}

interface DiffSection {
  title: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldValue?: string;
  newValue?: string;
  lines: DiffLine[];
  wordDiff?: {
    added: string[];
    removed: string[];
  };
}

interface VersionDiffProps {
  fromVersion: ContentVersion;
  toVersion: ContentVersion;
  onClose?: () => void;
  showMetadata?: boolean;
  showWordDiff?: boolean;
  highlightChanges?: boolean;
}

export const VersionDiff: React.FC<VersionDiffProps> = ({
  fromVersion,
  toVersion,
  onClose,
  showMetadata = true,
  showWordDiff = true,
  highlightChanges = true,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'added' | 'removed' | 'modified'>('all');

  // Calculate detailed diff
  const diffSections = useMemo(() => {
    return calculateDetailedDiff(fromVersion, toVersion);
  }, [fromVersion, toVersion]);

  // Filter sections based on type
  const filteredSections = useMemo(() => {
    if (filterType === 'all') return diffSections;
    return diffSections.filter(section => section.type === filterType);
  }, [diffSections, filterType]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalLines = diffSections.reduce((sum, section) => sum + section.lines.length, 0);
    const addedLines = diffSections.reduce((sum, section) => 
      sum + section.lines.filter(line => line.type === 'added').length, 0);
    const removedLines = diffSections.reduce((sum, section) => 
      sum + section.lines.filter(line => line.type === 'removed').length, 0);
    const modifiedLines = diffSections.reduce((sum, section) => 
      sum + section.lines.filter(line => line.type === 'modified').length, 0);

    return {
      totalLines,
      addedLines,
      removedLines,
      modifiedLines,
      addedSections: diffSections.filter(s => s.type === 'added').length,
      removedSections: diffSections.filter(s => s.type === 'removed').length,
      modifiedSections: diffSections.filter(s => s.type === 'modified').length,
    };
  }, [diffSections]);

  // Render diff line with syntax highlighting
  const renderDiffLine = useCallback((line: DiffLine, index: number) => {
    const getLineStyle = (type: string) => {
      switch (type) {
        case 'added':
          return {
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderLeft: '3px solid #4caf50',
          };
        case 'removed':
          return {
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            borderLeft: '3px solid #f44336',
          };
        case 'modified':
          return {
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            borderLeft: '3px solid #ff9800',
          };
        default:
          return {
            backgroundColor: 'transparent',
            borderLeft: '3px solid transparent',
          };
      }
    };

    const lineStyle = getLineStyle(line.type);

    return (
      <Box
        key={index}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          lineHeight: 1.5,
          py: 0.5,
          px: 1,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          ...lineStyle,
        }}
      >
        <Box sx={{ minWidth: 60, color: 'text.secondary', mr: 2 }}>
          {line.oldLineNum && (
            <Typography variant="caption" sx={{ mr: 1 }}>
              {line.oldLineNum}
            </Typography>
          )}
          {line.newLineNum && (
            <Typography variant="caption">
              {line.newLineNum}
            </Typography>
          )}
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          {line.type === 'modified' && showWordDiff ? (
            <Box>
              {line.oldContent && (
                <Typography
                  component="div"
                  sx={{
                    textDecoration: 'line-through',
                    color: 'error.main',
                    backgroundColor: 'error.lighter',
                  }}
                >
                  {line.oldContent}
                </Typography>
              )}
              {line.newContent && (
                <Typography
                  component="div"
                  sx={{
                    color: 'success.main',
                    backgroundColor: 'success.lighter',
                  }}
                >
                  {line.newContent}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {line.content}
            </Typography>
          )}
        </Box>
        <Box sx={{ ml: 1 }}>
          {line.type === 'added' && <AddIcon color="success" fontSize="small" />}
          {line.type === 'removed' && <RemoveIcon color="error" fontSize="small" />}
          {line.type === 'modified' && <EditIcon color="warning" fontSize="small" />}
        </Box>
      </Box>
    );
  }, [showWordDiff]);

  // Render side-by-side view
  const renderSideBySideView = () => (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Paper variant="outlined" sx={{ height: 600, overflow: 'auto' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1">
              Version {fromVersion.version}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fromVersion.metadata.createdAt.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            {filteredSections.map((section, sectionIndex) => (
              <Box key={sectionIndex}>
                {section.lines
                  .filter(line => !showOnlyChanges || line.type !== 'unchanged')
                  .filter(line => line.oldLineNum !== undefined)
                  .map((line, lineIndex) => renderDiffLine(line, `${sectionIndex}-${lineIndex}`))}
              </Box>
            ))}
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={6}>
        <Paper variant="outlined" sx={{ height: 600, overflow: 'auto' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1">
              Version {toVersion.version}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {toVersion.metadata.createdAt.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            {filteredSections.map((section, sectionIndex) => (
              <Box key={sectionIndex}>
                {section.lines
                  .filter(line => !showOnlyChanges || line.type !== 'unchanged')
                  .filter(line => line.newLineNum !== undefined)
                  .map((line, lineIndex) => renderDiffLine(line, `${sectionIndex}-${lineIndex}`))}
              </Box>
            ))}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  // Render unified view
  const renderUnifiedView = () => (
    <Paper variant="outlined" sx={{ height: 600, overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Typography variant="subtitle1">
          {fromVersion.version} → {toVersion.version}
        </Typography>
      </Box>
      <Box>
        {filteredSections.map((section, sectionIndex) => (
          <Box key={sectionIndex}>
            {section.lines
              .filter(line => !showOnlyChanges || line.type !== 'unchanged')
              .map((line, lineIndex) => renderDiffLine(line, `${sectionIndex}-${lineIndex}`))}
          </Box>
        ))}
      </Box>
    </Paper>
  );

  // Render metadata comparison
  const renderMetadataComparison = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title={`Version ${fromVersion.version}`} />
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2">Author</Typography>
                <Typography variant="body2">{fromVersion.metadata.author.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Created</Typography>
                <Typography variant="body2">
                  {fromVersion.metadata.createdAt.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Word Count</Typography>
                <Typography variant="body2">{fromVersion.metadata.wordCount}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Status</Typography>
                <Chip label={fromVersion.metadata.status} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2">Tags</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {fromVersion.metadata.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title={`Version ${toVersion.version}`} />
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2">Author</Typography>
                <Typography variant="body2">{toVersion.metadata.author.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Created</Typography>
                <Typography variant="body2">
                  {toVersion.metadata.createdAt.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Word Count</Typography>
                <Typography variant="body2">
                  {toVersion.metadata.wordCount}
                  {toVersion.metadata.wordCount !== fromVersion.metadata.wordCount && (
                    <Chip
                      label={`${toVersion.metadata.wordCount > fromVersion.metadata.wordCount ? '+' : ''}${toVersion.metadata.wordCount - fromVersion.metadata.wordCount}`}
                      size="small"
                      color={toVersion.metadata.wordCount > fromVersion.metadata.wordCount ? 'success' : 'error'}
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Status</Typography>
                <Chip label={toVersion.metadata.status} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2">Tags</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {toVersion.metadata.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Version Comparison: {fromVersion.version} → {toVersion.version}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<DownloadIcon />} variant="outlined" size="small">
            Export Diff
          </Button>
          <Button startIcon={<ShareIcon />} variant="outlined" size="small">
            Share
          </Button>
          {onClose && (
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* Statistics */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="h6" color="success.main">
              +{stats.addedLines}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Added Lines
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h6" color="error.main">
              -{stats.removedLines}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Removed Lines
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h6" color="warning.main">
              ~{stats.modifiedLines}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Modified Lines
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h6" color="primary">
              {stats.totalLines}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Lines
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Controls */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>View Mode</InputLabel>
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                label="View Mode"
              >
                <MenuItem value="side-by-side">Side by Side</MenuItem>
                <MenuItem value="unified">Unified</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                label="Filter"
              >
                <MenuItem value="all">All Changes</MenuItem>
                <MenuItem value="added">Added Only</MenuItem>
                <MenuItem value="removed">Removed Only</MenuItem>
                <MenuItem value="modified">Modified Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Stack direction="row" spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showOnlyChanges}
                    onChange={(e) => setShowOnlyChanges(e.target.checked)}
                  />
                }
                label="Changes Only"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showWordDiff}
                    onChange={(e) => setShowWordDiff(e.target.checked)}
                  />
                }
                label="Word Diff"
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Content Diff" />
          {showMetadata && <Tab label="Metadata" />}
          <Tab label="Summary" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {viewMode === 'side-by-side' ? renderSideBySideView() : renderUnifiedView()}
        </Box>
      )}

      {activeTab === 1 && showMetadata && renderMetadataComparison()}

      {activeTab === (showMetadata ? 2 : 1) && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Change Summary
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Changes Summary:</strong> {toVersion.metadata.changesSummary}
            </Typography>
          </Alert>
          
          <List>
            {diffSections.map((section, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {section.type === 'added' && <AddIcon color="success" />}
                  {section.type === 'removed' && <RemoveIcon color="error" />}
                  {section.type === 'modified' && <EditIcon color="warning" />}
                </ListItemIcon>
                <ListItemText
                  primary={section.title}
                  secondary={`${section.lines.length} lines ${section.type}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

// Helper function to calculate detailed diff
function calculateDetailedDiff(fromVersion: ContentVersion, toVersion: ContentVersion): DiffSection[] {
  const sections: DiffSection[] = [];
  
  // Compare content
  const fromLines = fromVersion.content.split('\n');
  const toLines = toVersion.content.split('\n');
  
  const contentDiff = calculateLineDiff(fromLines, toLines);
  sections.push({
    title: 'Content',
    type: 'modified',
    oldValue: fromVersion.content,
    newValue: toVersion.content,
    lines: contentDiff,
  });
  
  // Compare metadata
  if (fromVersion.title !== toVersion.title) {
    sections.push({
      title: 'Title',
      type: 'modified',
      oldValue: fromVersion.title,
      newValue: toVersion.title,
      lines: [
        {
          type: 'removed',
          oldLineNum: 1,
          content: fromVersion.title,
        },
        {
          type: 'added',
          newLineNum: 1,
          content: toVersion.title,
        },
      ],
    });
  }
  
  if (fromVersion.description !== toVersion.description) {
    sections.push({
      title: 'Description',
      type: 'modified',
      oldValue: fromVersion.description,
      newValue: toVersion.description,
      lines: [
        {
          type: 'removed',
          oldLineNum: 1,
          content: fromVersion.description,
        },
        {
          type: 'added',
          newLineNum: 1,
          content: toVersion.description,
        },
      ],
    });
  }
  
  return sections;
}

function calculateLineDiff(fromLines: string[], toLines: string[]): DiffLine[] {
  const lines: DiffLine[] = [];
  const maxLength = Math.max(fromLines.length, toLines.length);
  
  for (let i = 0; i < maxLength; i++) {
    const fromLine = i < fromLines.length ? fromLines[i] : undefined;
    const toLine = i < toLines.length ? toLines[i] : undefined;
    
    if (fromLine === undefined) {
      // Line added
      lines.push({
        type: 'added',
        newLineNum: i + 1,
        content: toLine!,
      });
    } else if (toLine === undefined) {
      // Line removed
      lines.push({
        type: 'removed',
        oldLineNum: i + 1,
        content: fromLine,
      });
    } else if (fromLine === toLine) {
      // Line unchanged
      lines.push({
        type: 'unchanged',
        oldLineNum: i + 1,
        newLineNum: i + 1,
        content: fromLine,
      });
    } else {
      // Line modified
      lines.push({
        type: 'modified',
        oldLineNum: i + 1,
        newLineNum: i + 1,
        content: toLine,
        oldContent: fromLine,
        newContent: toLine,
      });
    }
  }
  
  return lines;
}