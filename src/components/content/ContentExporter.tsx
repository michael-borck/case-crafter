import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Stack,
  Button,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  LinearProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Description as WordIcon,
  Language as HtmlIcon,
  TextSnippet as MarkdownIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  Palette as StyleIcon,
  FormatSize as FontIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { ContentItem } from './ContentLibrary';
import { 
  exportToPDF, 
  exportToWord, 
  exportToHTML, 
  exportToMarkdown,
  ExportOptions,
  ExportFormat 
} from '../../utils/exportUtils';

interface ContentExporterProps {
  contentItem: ContentItem;
  onClose?: () => void;
  defaultFormat?: ExportFormat;
}

export const ContentExporter: React.FC<ContentExporterProps> = ({
  contentItem,
  onClose,
  defaultFormat = 'pdf',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(defaultFormat);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  // Export options
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeMetadata: true,
    includeTableOfContents: true,
    includePageNumbers: true,
    includeHeaderFooter: true,
    fontSize: 12,
    fontFamily: 'Arial',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    pageSize: 'A4',
    orientation: 'portrait',
    template: 'academic',
    includeImages: true,
    includeCharts: false,
    watermark: '',
    customStyles: '',
    filename: '',
  });

  // Available templates
  const templates = [
    { value: 'academic', label: 'Academic Paper', description: 'Formal academic formatting with citations' },
    { value: 'business', label: 'Business Report', description: 'Professional business document style' },
    { value: 'minimal', label: 'Minimal', description: 'Clean, simple formatting' },
    { value: 'modern', label: 'Modern', description: 'Contemporary design with colors' },
  ];

  // Format configurations
  const formatConfigs = {
    pdf: {
      icon: <PdfIcon />,
      label: 'PDF Document',
      description: 'Professional PDF with formatting, ideal for printing and sharing',
      color: 'error',
      features: ['Page breaks', 'Headers/footers', 'TOC', 'Images', 'Styling'],
    },
    word: {
      icon: <WordIcon />,
      label: 'Word Document',
      description: 'Editable Word document (.docx) for further customization',
      color: 'primary',
      features: ['Editable text', 'Styles', 'Comments', 'Track changes'],
    },
    html: {
      icon: <HtmlIcon />,
      label: 'HTML Web Page',
      description: 'Standalone HTML file with embedded CSS styling',
      color: 'success',
      features: ['Web compatible', 'Responsive', 'Interactive', 'Searchable'],
    },
    markdown: {
      icon: <MarkdownIcon />,
      label: 'Markdown',
      description: 'Plain text markdown for easy editing and version control',
      color: 'secondary',
      features: ['Lightweight', 'Version control', 'Portable', 'GitHub compatible'],
    },
  };

  // Handle export
  const handleExport = useCallback(async () => {
    if (!contentItem) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Set filename if not provided
      const filename = exportOptions.filename || 
        `${contentItem.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`;

      const finalOptions = { ...exportOptions, filename };

      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      let result;
      switch (selectedFormat) {
        case 'pdf':
          result = await exportToPDF(contentItem, finalOptions);
          break;
        case 'word':
          result = await exportToWord(contentItem, finalOptions);
          break;
        case 'html':
          result = await exportToHTML(contentItem, finalOptions);
          break;
        case 'markdown':
          result = await exportToMarkdown(contentItem, finalOptions);
          break;
        default:
          throw new Error('Unsupported format');
      }

      clearInterval(progressInterval);
      setExportProgress(100);

      // Trigger download
      if (result) {
        const link = document.createElement('a');
        link.href = result.url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        if (result.url.startsWith('blob:')) {
          URL.revokeObjectURL(result.url);
        }
      }

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        if (onClose) onClose();
      }, 1000);

    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      setExportProgress(0);
      // Show error notification
    }
  }, [contentItem, selectedFormat, exportOptions, onClose]);

  // Generate preview
  const handlePreview = useCallback(async () => {
    setShowPreview(true);
  }, []);

  // Render format selection
  const renderFormatSelection = () => (
    <Grid container spacing={2}>
      {Object.entries(formatConfigs).map(([format, config]) => (
        <Grid item xs={12} sm={6} key={format}>
          <Card 
            variant={selectedFormat === format ? 'elevation' : 'outlined'}
            sx={{ 
              cursor: 'pointer',
              border: selectedFormat === format ? 2 : 1,
              borderColor: selectedFormat === format ? `${config.color}.main` : 'divider',
              '&:hover': { elevation: 2 },
              transition: 'all 0.2s ease-in-out',
            }}
            onClick={() => setSelectedFormat(format as ExportFormat)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ color: `${config.color}.main`, mr: 1 }}>
                  {config.icon}
                </Box>
                <Typography variant="h6">
                  {config.label}
                </Typography>
                {selectedFormat === format && (
                  <CheckIcon color="primary" sx={{ ml: 'auto' }} />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                {config.description}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {config.features.map(feature => (
                  <Chip key={feature} label={feature} size="small" variant="outlined" />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // Render export options
  const renderExportOptions = () => (
    <Box>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Typography variant="subtitle1">Export Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Basic Options */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Basic Options</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Filename"
                    value={exportOptions.filename}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, filename: e.target.value }))}
                    placeholder={`${contentItem.title.replace(/[^a-zA-Z0-9]/g, '_')}`}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Template</InputLabel>
                    <Select
                      value={exportOptions.template}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, template: e.target.value }))}
                      label="Template"
                    >
                      {templates.map(template => (
                        <MenuItem key={template.value} value={template.value}>
                          <Box>
                            <Typography variant="body2">{template.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {template.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>

            {/* Content Options */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Content Options</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={exportOptions.includeMetadata}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                      />
                    }
                    label="Include Metadata"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={exportOptions.includeTableOfContents}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeTableOfContents: e.target.checked }))}
                      />
                    }
                    label="Table of Contents"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={exportOptions.includeHeaderFooter}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeHeaderFooter: e.target.checked }))}
                      />
                    }
                    label="Headers & Footers"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={exportOptions.includePageNumbers}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includePageNumbers: e.target.checked }))}
                      />
                    }
                    label="Page Numbers"
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Format-specific options */}
            {(selectedFormat === 'pdf' || selectedFormat === 'word') && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Document Settings</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Page Size</InputLabel>
                      <Select
                        value={exportOptions.pageSize}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, pageSize: e.target.value }))}
                        label="Page Size"
                      >
                        <MenuItem value="A4">A4</MenuItem>
                        <MenuItem value="Letter">Letter</MenuItem>
                        <MenuItem value="Legal">Legal</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Orientation</InputLabel>
                      <Select
                        value={exportOptions.orientation}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, orientation: e.target.value }))}
                        label="Orientation"
                      >
                        <MenuItem value="portrait">Portrait</MenuItem>
                        <MenuItem value="landscape">Landscape</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Font Size"
                      value={exportOptions.fontSize}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                      size="small"
                      InputProps={{ inputProps: { min: 8, max: 24 } }}
                    />
                  </Grid>
                </Grid>
              </Grid>
            )}

            {/* Advanced Options */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Advanced Options</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Custom CSS Styles"
                value={exportOptions.customStyles}
                onChange={(e) => setExportOptions(prev => ({ ...prev, customStyles: e.target.value }))}
                placeholder="/* Custom CSS styles for HTML and PDF exports */"
                size="small"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Export: {contentItem.title}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
            variant="outlined"
          >
            Preview
          </Button>
          {onClose && (
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* Content Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Content:</strong> {contentItem.wordCount} words • 
          <strong> Estimated pages:</strong> {Math.ceil(contentItem.wordCount / 250)} • 
          <strong> Last modified:</strong> {contentItem.metadata.updatedAt.toLocaleDateString()}
        </Typography>
      </Alert>

      {/* Format Selection */}
      <Typography variant="h6" gutterBottom>
        Choose Export Format
      </Typography>
      {renderFormatSelection()}

      <Divider sx={{ my: 3 }} />

      {/* Export Options */}
      {renderExportOptions()}

      <Divider sx={{ my: 3 }} />

      {/* Export Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Selected format: <strong>{formatConfigs[selectedFormat].label}</strong>
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={isExporting}
            size="large"
          >
            {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
          </Button>
        </Stack>
      </Box>

      {/* Export Progress */}
      {isExporting && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={exportProgress} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {exportProgress < 100 ? `Generating ${selectedFormat.toUpperCase()}... ${exportProgress}%` : 'Download starting...'}
          </Typography>
        </Box>
      )}

      {/* Format-specific tips */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          💡 Format Tips
        </Typography>
        <List dense>
          {selectedFormat === 'pdf' && (
            <>
              <ListItem>
                <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="PDF files preserve formatting and are ideal for sharing and printing"
                  secondary="Use the Academic template for formal documents"
                />
              </ListItem>
            </>
          )}
          {selectedFormat === 'word' && (
            <>
              <ListItem>
                <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="Word documents can be further edited in Microsoft Word or Google Docs"
                  secondary="Styles and formatting will be preserved for easy customization"
                />
              </ListItem>
            </>
          )}
          {selectedFormat === 'html' && (
            <>
              <ListItem>
                <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="HTML files can be opened in any web browser"
                  secondary="Perfect for online sharing and responsive viewing"
                />
              </ListItem>
            </>
          )}
          {selectedFormat === 'markdown' && (
            <>
              <ListItem>
                <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="Markdown is perfect for version control and collaboration"
                  secondary="Compatible with GitHub, GitLab, and most documentation platforms"
                />
              </ListItem>
            </>
          )}
        </List>
      </Box>
    </Box>
  );
};