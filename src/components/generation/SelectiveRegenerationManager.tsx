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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  Slider,
  Switch,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Compare as CompareIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AIIcon,
  Psychology as BrainIcon,
  Tune as TuneIcon,
  RestoreFromTrash as RestoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  MemoryIcon,
} from '@mui/icons-material';
import { ContentElement } from './ContentStructureSelector';

interface RegenerationTask {
  id: string;
  elementId: string;
  elementName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  priority: 'low' | 'medium' | 'high';
  dependencies: string[];
  regenerationReason: string;
  customInstructions?: string;
  preserveStyle?: boolean;
  previousVersion?: string;
  newVersion?: string;
  aiModel?: string;
  temperature?: number;
  retryCount?: number;
}

interface RegenerationHistory {
  id: string;
  timestamp: Date;
  elementId: string;
  reason: string;
  success: boolean;
  duration: number;
  previousContent: string;
  newContent: string;
  userRating?: 1 | 2 | 3 | 4 | 5;
  userFeedback?: string;
}

interface RegenerationSettings {
  aiModel: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'local-llama';
  temperature: number;
  maxTokens: number;
  preserveStyle: boolean;
  preserveLength: boolean;
  autoRetry: boolean;
  maxRetries: number;
  batchSize: number;
  delayBetweenRequests: number;
  enableDependencyTracking: boolean;
  qualityThreshold: number;
}

interface SelectiveRegenerationManagerProps {
  elements: ContentElement[];
  generatedContent: Record<string, string>;
  onRegenerateContent: (elementId: string, options: RegenerationOptions) => Promise<string>;
  onUpdateContent: (elementId: string, newContent: string) => void;
  framework?: string;
  aiPrompt?: string;
  disabled?: boolean;
}

interface RegenerationOptions {
  reason: string;
  customInstructions?: string;
  preserveStyle?: boolean;
  preserveLength?: boolean;
  temperature?: number;
  aiModel?: string;
  priority?: 'low' | 'medium' | 'high';
}

export const SelectiveRegenerationManager: React.FC<SelectiveRegenerationManagerProps> = ({
  elements,
  generatedContent,
  onRegenerateContent,
  onUpdateContent,
  framework,
  aiPrompt,
  disabled = false,
}) => {
  const [tasks, setTasks] = useState<RegenerationTask[]>([]);
  const [history, setHistory] = useState<RegenerationHistory[]>([]);
  const [settings, setSettings] = useState<RegenerationSettings>({
    aiModel: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    preserveStyle: true,
    preserveLength: false,
    autoRetry: true,
    maxRetries: 3,
    batchSize: 3,
    delayBetweenRequests: 1000,
    enableDependencyTracking: true,
    qualityThreshold: 0.8,
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [regenerationDialog, setRegenerationDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [compareDialog, setCompareDialog] = useState<{open: boolean, elementId?: string}>({open: false});
  
  const [regenerationReason, setRegenerationReason] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [preserveStyle, setPreserveStyle] = useState(true);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Calculate statistics
  const stats = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;
    const runningTasks = tasks.filter(t => t.status === 'running').length;
    const totalProgress = tasks.length > 0 ? 
      tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length : 0;
    
    return {
      total: tasks.length,
      completed: completedTasks,
      failed: failedTasks,
      running: runningTasks,
      pending: tasks.length - completedTasks - failedTasks - runningTasks,
      progress: totalProgress,
      successRate: tasks.length > 0 ? (completedTasks / (completedTasks + failedTasks)) * 100 : 0,
    };
  }, [tasks]);

  const handleElementSelect = useCallback((elementId: string, selected: boolean) => {
    setSelectedElements(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(elementId);
      } else {
        newSet.delete(elementId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedElements(new Set(elements.filter(el => el.isEnabled).map(el => el.id)));
  }, [elements]);

  const handleSelectNone = useCallback(() => {
    setSelectedElements(new Set());
  }, []);

  const handleStartRegeneration = useCallback(() => {
    if (selectedElements.size === 0) return;

    const newTasks: RegenerationTask[] = Array.from(selectedElements).map(elementId => {
      const element = elements.find(el => el.id === elementId);
      return {
        id: `task-${Date.now()}-${elementId}`,
        elementId,
        elementName: element?.name || 'Unknown Element',
        status: 'pending' as const,
        progress: 0,
        priority,
        dependencies: element?.dependencies || [],
        regenerationReason,
        customInstructions: customInstructions || undefined,
        preserveStyle,
        aiModel: settings.aiModel,
        temperature: settings.temperature,
        retryCount: 0,
      };
    });

    setTasks(prev => [...prev, ...newTasks]);
    setRegenerationDialog(false);
    setRegenerationReason('');
    setCustomInstructions('');
    setSelectedElements(new Set());
    
    // Start processing tasks
    processRegenerationTasks(newTasks);
  }, [selectedElements, elements, priority, regenerationReason, customInstructions, preserveStyle, settings]);

  const processRegenerationTasks = useCallback(async (newTasks: RegenerationTask[]) => {
    setIsRunning(true);
    
    // Sort tasks by priority and dependencies
    const sortedTasks = [...newTasks].sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });

    for (let i = 0; i < sortedTasks.length; i += settings.batchSize) {
      const batch = sortedTasks.slice(i, i + settings.batchSize);
      
      await Promise.all(batch.map(async (task) => {
        await processIndividualTask(task);
        
        // Delay between requests if not the last batch
        if (i + settings.batchSize < sortedTasks.length) {
          await new Promise(resolve => setTimeout(resolve, settings.delayBetweenRequests));
        }
      }));
    }
    
    setIsRunning(false);
  }, [settings]);

  const processIndividualTask = useCallback(async (task: RegenerationTask) => {
    const startTime = new Date();
    
    // Update task status to running
    setTasks(prev => prev.map(t => 
      t.id === task.id 
        ? { ...t, status: 'running' as const, startTime, progress: 10 }
        : t
    ));

    try {
      // Simulate progress updates
      for (let progress = 20; progress <= 80; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, progress } : t
        ));
      }

      // Call the actual regeneration function
      const newContent = await onRegenerateContent(task.elementId, {
        reason: task.regenerationReason,
        customInstructions: task.customInstructions,
        preserveStyle: task.preserveStyle,
        temperature: task.temperature,
        aiModel: task.aiModel,
        priority: task.priority,
      });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update task as completed
      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { 
              ...t, 
              status: 'completed' as const, 
              progress: 100, 
              endTime,
              newVersion: newContent 
            }
          : t
      ));

      // Add to history
      const historyEntry: RegenerationHistory = {
        id: `history-${Date.now()}-${task.elementId}`,
        timestamp: endTime,
        elementId: task.elementId,
        reason: task.regenerationReason,
        success: true,
        duration,
        previousContent: generatedContent[task.elementId] || '',
        newContent,
      };

      setHistory(prev => [historyEntry, ...prev.slice(0, 49)]); // Keep last 50 entries

      // Update the content
      onUpdateContent(task.elementId, newContent);

    } catch (error) {
      const endTime = new Date();
      
      // Update task as failed
      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { 
              ...t, 
              status: 'failed' as const, 
              endTime,
              retryCount: (t.retryCount || 0) + 1
            }
          : t
      ));

      // Add failed attempt to history
      const historyEntry: RegenerationHistory = {
        id: `history-${Date.now()}-${task.elementId}`,
        timestamp: endTime,
        elementId: task.elementId,
        reason: task.regenerationReason,
        success: false,
        duration: endTime.getTime() - startTime.getTime(),
        previousContent: generatedContent[task.elementId] || '',
        newContent: '',
      };

      setHistory(prev => [historyEntry, ...prev.slice(0, 49)]);

      // Auto-retry if enabled and under retry limit
      if (settings.autoRetry && (task.retryCount || 0) < settings.maxRetries) {
        setTimeout(() => {
          processIndividualTask({ ...task, retryCount: (task.retryCount || 0) + 1 });
        }, 2000);
      }
    }
  }, [onRegenerateContent, onUpdateContent, generatedContent, settings]);

  const handleCancelRegeneration = useCallback(() => {
    setTasks(prev => prev.map(task => 
      task.status === 'pending' || task.status === 'running'
        ? { ...task, status: 'cancelled' as const }
        : task
    ));
    setIsRunning(false);
  }, []);

  const handleRetryFailed = useCallback(() => {
    const failedTasks = tasks.filter(t => t.status === 'failed');
    if (failedTasks.length > 0) {
      processRegenerationTasks(failedTasks.map(task => ({ ...task, status: 'pending' as const, retryCount: 0 })));
    }
  }, [tasks, processRegenerationTasks]);

  const handleClearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status !== 'completed' && t.status !== 'failed'));
  }, []);

  const getTaskStatusIcon = (status: RegenerationTask['status']) => {
    switch (status) {
      case 'completed': return <CheckIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'running': return <RefreshIcon color="primary" className="animate-spin" />;
      case 'cancelled': return <CancelIcon color="disabled" />;
      default: return <InfoIcon color="disabled" />;
    }
  };

  const getTaskStatusColor = (status: RegenerationTask['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'primary';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const renderRegenerationDialog = () => (
    <Dialog open={regenerationDialog} onClose={() => setRegenerationDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>Configure Regeneration</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            {selectedElements.size} element(s) selected for regeneration
          </Alert>

          <TextField
            fullWidth
            label="Regeneration Reason"
            value={regenerationReason}
            onChange={(e) => setRegenerationReason(e.target.value)}
            placeholder="e.g., Improve clarity, Add more examples, Update for new requirements"
            helperText="Brief description of why content needs regeneration"
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Custom Instructions"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Specific instructions for the AI to follow during regeneration..."
            helperText="Optional: Provide specific guidance for content regeneration"
          />

          <FormControl>
            <FormLabel>Priority Level</FormLabel>
            <RadioGroup
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              row
            >
              <FormControlLabel value="low" control={<Radio />} label="Low" />
              <FormControlLabel value="medium" control={<Radio />} label="Medium" />
              <FormControlLabel value="high" control={<Radio />} label="High" />
            </RadioGroup>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={preserveStyle}
                onChange={(e) => setPreserveStyle(e.target.checked)}
              />
            }
            label="Preserve Writing Style"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRegenerationDialog(false)}>Cancel</Button>
        <Button 
          onClick={handleStartRegeneration} 
          variant="contained" 
          disabled={!regenerationReason.trim() || selectedElements.size === 0}
        >
          Start Regeneration
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderSettingsDialog = () => (
    <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Regeneration Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>AI Model</InputLabel>
            <Select
              value={settings.aiModel}
              onChange={(e) => setSettings(prev => ({ ...prev, aiModel: e.target.value as any }))}
              label="AI Model"
            >
              <MenuItem value="gpt-4">GPT-4</MenuItem>
              <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
              <MenuItem value="claude-3">Claude 3</MenuItem>
              <MenuItem value="local-llama">Local LLaMA</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography gutterBottom>Temperature: {settings.temperature}</Typography>
            <Slider
              value={settings.temperature}
              onChange={(_, value) => setSettings(prev => ({ ...prev, temperature: value as number }))}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: 'Focused' },
                { value: 0.5, label: 'Balanced' },
                { value: 1, label: 'Creative' },
              ]}
            />
          </Box>

          <TextField
            fullWidth
            type="number"
            label="Max Tokens"
            value={settings.maxTokens}
            onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
          />

          <TextField
            fullWidth
            type="number"
            label="Batch Size"
            value={settings.batchSize}
            onChange={(e) => setSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
            helperText="Number of elements to regenerate simultaneously"
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.autoRetry}
                onChange={(e) => setSettings(prev => ({ ...prev, autoRetry: e.target.checked }))}
              />
            }
            label="Auto Retry Failed Tasks"
          />

          {settings.autoRetry && (
            <TextField
              fullWidth
              type="number"
              label="Max Retries"
              value={settings.maxRetries}
              onChange={(e) => setSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSettingsDialog(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Selective Regeneration Manager
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<HistoryIcon />}
            onClick={() => setHistoryDialog(true)}
            variant="outlined"
            size="small"
          >
            History
          </Button>
          <Button
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsDialog(true)}
            variant="outlined"
            size="small"
          >
            Settings
          </Button>
        </Stack>
      </Box>

      {/* Statistics */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} sm={2}>
            <Typography variant="h4" color="primary">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Tasks
            </Typography>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Typography variant="h4" color="success.main">
              {stats.completed}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Typography variant="h4" color="error.main">
              {stats.failed}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Failed
            </Typography>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Typography variant="h4" color="warning.main">
              {stats.running}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Running
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" gutterBottom>
                  Overall Progress: {Math.round(stats.progress)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.progress} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Element Selection */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader 
          title="Select Elements to Regenerate"
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={handleSelectAll}>Select All</Button>
              <Button size="small" onClick={handleSelectNone}>Select None</Button>
              <Button 
                variant="contained" 
                onClick={() => setRegenerationDialog(true)}
                disabled={selectedElements.size === 0 || isRunning}
                startIcon={<RefreshIcon />}
              >
                Regenerate Selected
              </Button>
            </Stack>
          }
        />
        <CardContent>
          <FormGroup>
            <Grid container spacing={1}>
              {elements.filter(el => el.isEnabled).map(element => (
                <Grid item xs={12} sm={6} md={4} key={element.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedElements.has(element.id)}
                        onChange={(e) => handleElementSelect(element.id, e.target.checked)}
                        disabled={isRunning}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {element.icon}
                        <Typography variant="body2">{element.name}</Typography>
                      </Box>
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </FormGroup>
        </CardContent>
      </Card>

      {/* Task Queue */}
      {tasks.length > 0 && (
        <Card variant="outlined">
          <CardHeader 
            title={`Regeneration Tasks (${tasks.length})`}
            action={
              <Stack direction="row" spacing={1}>
                {isRunning ? (
                  <Button 
                    startIcon={<StopIcon />}
                    onClick={handleCancelRegeneration}
                    color="error"
                    size="small"
                  >
                    Cancel
                  </Button>
                ) : (
                  <>
                    <Button 
                      startIcon={<RefreshIcon />}
                      onClick={handleRetryFailed}
                      disabled={stats.failed === 0}
                      size="small"
                    >
                      Retry Failed
                    </Button>
                    <Button 
                      startIcon={<RestoreIcon />}
                      onClick={handleClearCompleted}
                      size="small"
                    >
                      Clear Completed
                    </Button>
                  </>
                )}
              </Stack>
            }
          />
          <CardContent>
            <List>
              {tasks.slice(0, 10).map(task => (
                <ListItem key={task.id} divider>
                  <ListItemIcon>
                    {getTaskStatusIcon(task.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{task.elementName}</Typography>
                        <Chip 
                          label={task.status} 
                          size="small" 
                          color={getTaskStatusColor(task.status)}
                        />
                        <Chip 
                          label={task.priority} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {task.regenerationReason}
                        </Typography>
                        {task.status === 'running' && (
                          <LinearProgress 
                            variant="determinate" 
                            value={task.progress} 
                            sx={{ mt: 1, height: 4, borderRadius: 2 }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {task.endTime && task.startTime && (
                      <Typography variant="caption" color="text.secondary">
                        {Math.round((task.endTime.getTime() - task.startTime.getTime()) / 1000)}s
                      </Typography>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            {tasks.length > 10 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                ... and {tasks.length - 10} more tasks
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {renderRegenerationDialog()}
      {renderSettingsDialog()}
    </Box>
  );
};