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
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Preview as PreviewIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  ExpandMore as ExpandMoreIcon,
  Article as ArticleIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { ContentStructureConfig, ContentElement } from './ContentStructureSelector';
import { SelectiveRegenerationManager } from './SelectiveRegenerationManager';
import { BusinessFramework } from '../frameworks/FrameworkSelector';

interface GeneratedContent {
  id: string;
  elementId: string;
  title: string;
  content: string;
  wordCount: number;
  status: 'generating' | 'completed' | 'error' | 'editing';
  lastUpdated: Date;
  version: number;
}

interface PreviewSettings {
  showWordCounts: boolean;
  showTimestamps: boolean;
  showElementBorders: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  compactView: boolean;
}

interface RealTimePreviewProps {
  framework?: BusinessFramework;
  contentStructure: ContentStructureConfig;
  formData: Record<string, any>;
  aiPrompt: string;
  generationOptions: any;
  onContentEdit?: (elementId: string, newContent: string) => void;
  onContentRegenerate?: (elementId: string) => void;
  onExport?: (format: 'pdf' | 'docx' | 'html') => void;
  isGenerating?: boolean;
  disabled?: boolean;
}

export const RealTimePreview: React.FC<RealTimePreviewProps> = ({
  framework,
  contentStructure,
  formData,
  aiPrompt,
  generationOptions,
  onContentEdit,
  onContentRegenerate,
  onExport,
  isGenerating = false,
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [settings, setSettings] = useState<PreviewSettings>({
    showWordCounts: true,
    showTimestamps: true,
    showElementBorders: true,
    autoRefresh: false,
    refreshInterval: 5000,
    compactView: false,
  });
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [fullscreenElement, setFullscreenElement] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate content generation based on structure
  const simulateContentGeneration = useCallback(() => {
    const enabledElements = contentStructure.elements.filter(el => el.isEnabled);
    
    const newContent: GeneratedContent[] = enabledElements.map((element, index) => ({
      id: `content-${element.id}`,
      elementId: element.id,
      title: element.name,
      content: generateSampleContent(element, framework, formData, aiPrompt),
      wordCount: element.customOptions?.wordCount || element.estimatedLength || 200,
      status: 'completed',
      lastUpdated: new Date(),
      version: 1,
    }));

    setGeneratedContent(newContent);
  }, [contentStructure, framework, formData, aiPrompt]);

  // Initialize content when structure changes
  useEffect(() => {
    if (contentStructure.elements.length > 0) {
      simulateContentGeneration();
    }
  }, [simulateContentGeneration]);

  // Auto-refresh functionality
  useEffect(() => {
    if (settings.autoRefresh && !isGenerating) {
      const interval = setInterval(() => {
        setIsRefreshing(true);
        simulateContentGeneration();
        setTimeout(() => setIsRefreshing(false), 1000);
      }, settings.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, settings.refreshInterval, simulateContentGeneration, isGenerating]);

  const handleEditStart = useCallback((elementId: string) => {
    const content = generatedContent.find(c => c.elementId === elementId);
    if (content) {
      setEditingElement(elementId);
      setEditContent(content.content);
    }
  }, [generatedContent]);

  const handleEditSave = useCallback(() => {
    if (editingElement && onContentEdit) {
      onContentEdit(editingElement, editContent);
      
      // Update local content
      setGeneratedContent(prev => prev.map(content => 
        content.elementId === editingElement 
          ? { 
              ...content, 
              content: editContent, 
              wordCount: editContent.split(' ').length,
              lastUpdated: new Date(),
              version: content.version + 1,
              status: 'completed' as const
            }
          : content
      ));
    }
    
    setEditingElement(null);
    setEditContent('');
  }, [editingElement, editContent, onContentEdit]);

  const handleEditCancel = useCallback(() => {
    setEditingElement(null);
    setEditContent('');
  }, []);

  const handleRegenerate = useCallback((elementId: string) => {
    if (onContentRegenerate) {
      onContentRegenerate(elementId);
    }
    
    // Update status to generating
    setGeneratedContent(prev => prev.map(content => 
      content.elementId === elementId 
        ? { ...content, status: 'generating' as const }
        : content
    ));

    // Simulate regeneration
    setTimeout(() => {
      const element = contentStructure.elements.find(el => el.id === elementId);
      if (element) {
        const newContent = generateSampleContent(element, framework, formData, aiPrompt);
        setGeneratedContent(prev => prev.map(content => 
          content.elementId === elementId 
            ? { 
                ...content, 
                content: newContent, 
                wordCount: newContent.split(' ').length,
                lastUpdated: new Date(),
                version: content.version + 1,
                status: 'completed' as const
              }
            : content
        ));
      }
    }, 2000);
  }, [onContentRegenerate, contentStructure, framework, formData, aiPrompt]);

  const totalWordCount = useMemo(() => 
    generatedContent.reduce((sum, content) => sum + content.wordCount, 0)
  , [generatedContent]);

  const completedElements = useMemo(() => 
    generatedContent.filter(content => content.status === 'completed').length
  , [generatedContent]);

  // Handler for selective regeneration
  const handleSelectiveRegenerate = useCallback(async (elementId: string, options: any) => {
    // Simulate AI regeneration process
    const element = contentStructure.elements.find(el => el.id === elementId);
    if (!element) throw new Error('Element not found');

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    // Generate new content
    const newContent = generateSampleContent(element, framework, formData, aiPrompt);
    return newContent;
  }, [contentStructure, framework, formData, aiPrompt]);

  // Convert generatedContent to the format expected by SelectiveRegenerationManager
  const contentMap = useMemo(() => {
    const map: Record<string, string> = {};
    generatedContent.forEach(content => {
      map[content.elementId] = content.content;
    });
    return map;
  }, [generatedContent]);

  const tabs = [
    { label: 'Preview', icon: <PreviewIcon /> },
    { label: 'Structure', icon: <TimelineIcon /> },
    { label: 'Analytics', icon: <TrendingUpIcon /> },
    { label: 'Regeneration', icon: <RefreshIcon /> },
  ];

  const renderContentElement = (content: GeneratedContent) => {
    const element = contentStructure.elements.find(el => el.id === content.elementId);
    const isEditing = editingElement === content.elementId;
    
    return (
      <Card 
        key={content.id}
        variant={settings.showElementBorders ? 'outlined' : 'elevation'}
        sx={{ 
          mb: 2,
          border: settings.showElementBorders ? '2px solid' : 'none',
          borderColor: content.status === 'generating' ? 'warning.main' : 
                      content.status === 'error' ? 'error.main' : 'divider',
        }}
      >
        <CardHeader
          avatar={element?.icon}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">{content.title}</Typography>
              {content.status === 'generating' && (
                <Chip label="Generating..." size="small" color="warning" />
              )}
              {settings.showWordCounts && (
                <Chip 
                  label={`${content.wordCount} words`} 
                  size="small" 
                  variant="outlined" 
                />
              )}
            </Box>
          }
          subheader={
            settings.showTimestamps && (
              <Typography variant="caption" color="text.secondary">
                Updated {content.lastUpdated.toLocaleTimeString()} (v{content.version})
              </Typography>
            )
          }
          action={
            <Stack direction="row" spacing={1}>
              <Tooltip title="Edit content">
                <IconButton 
                  size="small" 
                  onClick={() => handleEditStart(content.elementId)}
                  disabled={disabled || content.status === 'generating'}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Regenerate">
                <IconButton 
                  size="small" 
                  onClick={() => handleRegenerate(content.elementId)}
                  disabled={disabled || content.status === 'generating'}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Fullscreen">
                <IconButton 
                  size="small" 
                  onClick={() => setFullscreenElement(content.elementId)}
                >
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          }
        />
        <CardContent>
          {content.status === 'generating' ? (
            <Box>
              <LinearProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                AI is generating content for this section...
              </Typography>
            </Box>
          ) : isEditing ? (
            <Box>
              <TextField
                fullWidth
                multiline
                rows={8}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Stack direction="row" spacing={1}>
                <Button 
                  variant="contained" 
                  onClick={handleEditSave}
                  size="small"
                >
                  Save
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleEditCancel}
                  size="small"
                >
                  Cancel
                </Button>
              </Stack>
            </Box>
          ) : (
            <Typography 
              variant="body1" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                fontSize: settings.compactView ? '0.875rem' : '1rem',
              }}
            >
              {content.content}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderStructureView = () => (
    <Stack spacing={2}>
      <Typography variant="h6" gutterBottom>
        Content Structure Overview
      </Typography>
      
      <Paper elevation={1} sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="primary">
              {contentStructure.elements.filter(el => el.isEnabled).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Elements
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="success.main">
              {completedElements}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="secondary">
              {totalWordCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Words
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="info.main">
              {Math.round(totalWordCount / 250)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Est. Pages
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <List>
        {contentStructure.elements.filter(el => el.isEnabled).map(element => {
          const content = generatedContent.find(c => c.elementId === element.id);
          return (
            <ListItem key={element.id} divider>
              <ListItemIcon>
                {element.icon}
              </ListItemIcon>
              <ListItemText
                primary={element.name}
                secondary={`${element.description} • ${content?.wordCount || element.estimatedLength} words`}
              />
              <ListItemSecondaryAction>
                <Chip 
                  label={content?.status || 'pending'} 
                  size="small"
                  color={content?.status === 'completed' ? 'success' : 
                         content?.status === 'generating' ? 'warning' : 'default'}
                />
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
    </Stack>
  );

  const renderAnalyticsView = () => (
    <Stack spacing={3}>
      <Typography variant="h6" gutterBottom>
        Content Analytics
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Content Distribution" />
            <CardContent>
              <Stack spacing={2}>
                {['core', 'analysis', 'supplementary', 'assessment'].map(category => {
                  const categoryElements = contentStructure.elements.filter(
                    el => el.isEnabled && el.category === category
                  );
                  const categoryWords = categoryElements.reduce((sum, el) => {
                    const content = generatedContent.find(c => c.elementId === el.id);
                    return sum + (content?.wordCount || 0);
                  }, 0);
                  const percentage = totalWordCount > 0 ? (categoryWords / totalWordCount) * 100 : 0;
                  
                  return (
                    <Box key={category}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {category}
                        </Typography>
                        <Typography variant="body2">
                          {categoryWords} words ({percentage.toFixed(1)}%)
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={percentage} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Generation Progress" />
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {Math.round((completedElements / contentStructure.elements.filter(el => el.isEnabled).length) * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Content Generated
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(completedElements / contentStructure.elements.filter(el => el.isEnabled).length) * 100} 
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Divider />
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Quality Metrics
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Completeness</Typography>
                      <Typography variant="body2">85%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Coherence</Typography>
                      <Typography variant="body2">92%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Framework Alignment</Typography>
                      <Typography variant="body2">88%</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Real-Time Preview
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh content">
            <IconButton 
              onClick={simulateContentGeneration}
              disabled={disabled || isRefreshing}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            startIcon={<DownloadIcon />}
            onClick={() => onExport?.('pdf')}
            variant="outlined"
            size="small"
            disabled={disabled}
          >
            Export
          </Button>
        </Stack>
      </Box>

      {/* Settings */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Preview Settings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showWordCounts}
                    onChange={(e) => setSettings(prev => ({ ...prev, showWordCounts: e.target.checked }))}
                  />
                }
                label="Word Counts"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showTimestamps}
                    onChange={(e) => setSettings(prev => ({ ...prev, showTimestamps: e.target.checked }))}
                  />
                }
                label="Timestamps"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.compactView}
                    onChange={(e) => setSettings(prev => ({ ...prev, compactView: e.target.checked }))}
                  />
                }
                label="Compact View"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoRefresh}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                  />
                }
                label="Auto Refresh"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          {tabs.map((tab, index) => (
            <Tab 
              key={index}
              icon={tab.icon} 
              label={tab.label} 
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {generatedContent.length === 0 ? (
            <Alert severity="info">
              Configure your content structure to see a preview of the generated case study.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {generatedContent.map(renderContentElement)}
            </Stack>
          )}
        </Box>
      )}

      {activeTab === 1 && renderStructureView()}
      {activeTab === 2 && renderAnalyticsView()}
      {activeTab === 3 && (
        <SelectiveRegenerationManager
          elements={contentStructure.elements}
          generatedContent={contentMap}
          onRegenerateContent={handleSelectiveRegenerate}
          onUpdateContent={(elementId, newContent) => {
            // Update the local generated content
            setGeneratedContent(prev => prev.map(content => 
              content.elementId === elementId 
                ? { 
                    ...content, 
                    content: newContent, 
                    wordCount: newContent.split(' ').length,
                    lastUpdated: new Date(),
                    version: content.version + 1
                  }
                : content
            ));
            
            // Call the parent handler if provided
            if (onContentEdit) {
              onContentEdit(elementId, newContent);
            }
          }}
          framework={framework?.name}
          aiPrompt={aiPrompt}
          disabled={disabled}
        />
      )}

      {/* Fullscreen Dialog */}
      <Dialog 
        open={!!fullscreenElement} 
        onClose={() => setFullscreenElement(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {generatedContent.find(c => c.elementId === fullscreenElement)?.title}
            </Typography>
            <IconButton onClick={() => setFullscreenElement(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {generatedContent.find(c => c.elementId === fullscreenElement)?.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFullscreenElement(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Helper function to generate sample content
function generateSampleContent(
  element: ContentElement, 
  framework?: BusinessFramework,
  formData?: Record<string, any>,
  aiPrompt?: string
): string {
  const templates: Record<string, string> = {
    executive_summary: `This case study examines a critical business decision facing ${formData?.company_name || 'TechCorp'}, a ${formData?.industry || 'technology'} company. The organization must navigate ${formData?.primary_challenge || 'market expansion challenges'} while maintaining operational efficiency and stakeholder satisfaction. This scenario presents students with an opportunity to apply ${framework?.name || 'strategic thinking'} principles to real-world business challenges.

Key stakeholders include senior management, customers, employees, and investors. The decision timeline is constrained by market pressures and regulatory requirements. Students will analyze the situation through multiple lenses, considering financial implications, operational feasibility, and strategic alignment with corporate objectives.`,

    background: `${formData?.company_name || 'TechCorp'} was founded in ${formData?.founding_year || '2010'} and has grown to become a significant player in the ${formData?.industry || 'technology'} sector. The company operates in ${formData?.markets || 'North America and Europe'} with approximately ${formData?.employee_count || '500'} employees and annual revenues of ${formData?.annual_revenue || '$50 million'}.

The organization's core mission focuses on ${formData?.mission || 'delivering innovative solutions that transform how businesses operate'}. Recent market developments have created both opportunities and challenges, requiring strategic reassessment of current approaches.

Industry Context:
The ${formData?.industry || 'technology'} industry has experienced significant transformation over the past five years. Key trends include digital transformation acceleration, changing customer expectations, and increased regulatory scrutiny. Competitive pressures have intensified as new entrants leverage emerging technologies to disrupt traditional business models.`,

    problem_statement: `${formData?.company_name || 'TechCorp'} faces a critical decision regarding ${formData?.primary_challenge || 'market expansion strategy'}. The challenge emerged due to ${formData?.challenge_trigger || 'changing market conditions and competitive pressures'}.

The central question requires the organization to choose between multiple strategic alternatives, each with distinct risks and opportunities. Time constraints add urgency to the decision-making process, as delayed action could result in lost market opportunities or competitive disadvantage.

Specific considerations include:
- Financial investment requirements and expected returns
- Operational capabilities and resource allocation
- Market timing and competitive response
- Stakeholder impact and communication strategy
- Risk mitigation and contingency planning

The decision will have long-term implications for the organization's strategic direction and competitive positioning.`,

    key_players: `Chief Executive Officer (CEO): ${formData?.ceo_name || 'Sarah Johnson'} - Responsible for overall strategic direction and stakeholder communication. Brings 15 years of industry experience and strong relationships with key customers and investors.

Chief Financial Officer (CFO): ${formData?.cfo_name || 'Michael Chen'} - Oversees financial planning and risk assessment. Advocates for data-driven decision making and long-term financial sustainability.

Head of Operations: ${formData?.operations_head || 'Jennifer Martinez'} - Manages day-to-day operations and implementation feasibility. Focuses on operational efficiency and team capability development.

Board of Directors: Provides governance oversight and strategic guidance. Represents investor interests and ensures alignment with corporate objectives.

Key Customers: Major clients who account for 60% of company revenue. Their needs and preferences significantly influence strategic decisions.`,

    financial_data: `Revenue Analysis:
- Current annual revenue: ${formData?.annual_revenue || '$50M'}
- Revenue growth rate: ${formData?.growth_rate || '15%'} annually
- Customer concentration: Top 5 customers represent 60% of revenue
- Geographic distribution: 70% domestic, 30% international

Cost Structure:
- Personnel costs: 65% of revenue
- Technology and infrastructure: 20% of revenue
- Sales and marketing: 10% of revenue
- Administrative overhead: 5% of revenue

Financial Metrics:
- Gross margin: 45%
- EBITDA margin: 12%
- Current ratio: 2.1
- Debt-to-equity ratio: 0.3

Investment Requirements:
The proposed initiative requires initial investment of ${formData?.investment_amount || '$5M'} over 18 months, with expected payback period of 3 years. Cash flow projections indicate positive returns beginning in year 2.`,

    discussion_questions: `1. Strategic Analysis
   - How does this decision align with the company's stated mission and strategic objectives?
   - What are the key strategic alternatives available to the organization?
   - How should the company prioritize competing stakeholder interests?

2. Financial Evaluation
   - What financial metrics should guide the decision-making process?
   - How should the company evaluate the risk-return profile of different options?
   - What contingency planning is needed for financial scenarios?

3. Implementation Considerations
   - What operational capabilities are required for successful execution?
   - How should the organization sequence implementation activities?
   - What change management challenges might arise?

4. Risk Assessment
   - What are the primary risks associated with each strategic alternative?
   - How can the company mitigate identified risks?
   - What early warning indicators should be monitored?

5. Long-term Implications
   - How might this decision affect the company's competitive position?
   - What future opportunities or constraints might result from this choice?
   - How should success be measured and monitored?`,
  };

  const baseContent = templates[element.id] || `This section provides detailed analysis of ${element.name.toLowerCase()} relevant to the case study scenario. The content explores key concepts, presents relevant data, and guides students through critical thinking processes.

The analysis incorporates ${framework?.name || 'strategic frameworks'} to provide structured approach to understanding the business challenge. Students will examine multiple perspectives and develop recommendations based on sound business principles.`;

  // Adjust content length based on customOptions
  const targetWords = element.customOptions?.wordCount || element.estimatedLength || 200;
  const words = baseContent.split(' ');
  
  if (words.length > targetWords) {
    return words.slice(0, targetWords).join(' ') + '...';
  } else if (words.length < targetWords * 0.8) {
    // Add some additional content to meet target
    const additionalContent = `\n\nThis analysis requires careful consideration of multiple factors including market dynamics, competitive positioning, financial implications, and operational feasibility. Students should evaluate evidence systematically and develop well-reasoned recommendations that address stakeholder concerns while advancing organizational objectives.`;
    return baseContent + additionalContent;
  }
  
  return baseContent;
}