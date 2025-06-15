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
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Assignment as RubricIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  Download as DownloadIcon,
  AutoAwesome as AutoGenerateIcon,
  Star as StarIcon,
  CheckCircle as ExcellentIcon,
  ThumbUp as GoodIcon,
  RemoveCircle as NeedsWorkIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

import { GeneratedQuestion, QuestionType, DifficultyLevel } from './QuestionGenerator';

// Rubric interfaces
export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // percentage of total score
  levels: RubricLevel[];
}

export interface RubricLevel {
  id: string;
  name: string;
  description: string;
  points: number;
  keywords: string[];
}

export interface GeneratedRubric {
  id: string;
  questionId: string;
  questionType: QuestionType;
  title: string;
  totalPoints: number;
  criteria: RubricCriterion[];
  instructions: string;
  metadata: {
    createdAt: Date;
    difficulty: DifficultyLevel;
    estimatedGradingTime: number; // in minutes
  };
}

interface RubricGeneratorProps {
  question: GeneratedQuestion;
  onRubricGenerated?: (rubric: GeneratedRubric) => void;
  onClose?: () => void;
}

export const RubricGenerator: React.FC<RubricGeneratorProps> = ({
  question,
  onRubricGenerated,
  onClose,
}) => {
  // State management
  const [rubric, setRubric] = useState<GeneratedRubric | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<RubricCriterion | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Generation settings
  const [settings, setSettings] = useState({
    includeParticipation: false,
    includeCreativity: question.type === 'essay' || question.type === 'analysis',
    includeCriticalThinking: question.type === 'analysis',
    customCriteria: [] as string[],
    pointScale: question.points || 10,
    useFourPoint: true, // 4-point scale vs 5-point scale
  });

  // Generate rubric based on question type and content
  const generateRubric = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      // Simulate AI generation with a short delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const generatedRubric = createRubricForQuestion(question, settings);
      setRubric(generatedRubric);
      
      if (onRubricGenerated) {
        onRubricGenerated(generatedRubric);
      }
    } catch (error) {
      console.error('Rubric generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [question, settings, onRubricGenerated]);

  // Update criterion
  const updateCriterion = (criterionId: string, updates: Partial<RubricCriterion>) => {
    if (!rubric) return;
    
    setRubric(prev => ({
      ...prev!,
      criteria: prev!.criteria.map(c => 
        c.id === criterionId ? { ...c, ...updates } : c
      )
    }));
  };

  // Render generation settings
  const renderSettings = () => (
    <Card variant="outlined">
      <CardHeader title="Rubric Settings" />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Point Scale</Typography>
            <TextField
              fullWidth
              type="number"
              label="Total Points"
              value={settings.pointScale}
              onChange={(e) => setSettings(prev => ({ ...prev, pointScale: parseInt(e.target.value) }))}
              size="small"
              InputProps={{ inputProps: { min: 1, max: 100 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Performance Levels</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={settings.useFourPoint ? '4' : '5'}
                onChange={(e) => setSettings(prev => ({ ...prev, useFourPoint: e.target.value === '4' }))}
              >
                <MenuItem value="4">4-Point Scale (Excellent, Good, Fair, Poor)</MenuItem>
                <MenuItem value="5">5-Point Scale (Exceptional, Good, Satisfactory, Needs Work, Inadequate)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>Additional Criteria</Typography>
            <Stack spacing={1}>
              {(question.type === 'essay' || question.type === 'analysis') && (
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.includeCreativity}
                        onChange={(e) => setSettings(prev => ({ ...prev, includeCreativity: e.target.checked }))}
                      />
                    }
                    label="Include Creativity/Originality"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.includeCriticalThinking}
                        onChange={(e) => setSettings(prev => ({ ...prev, includeCriticalThinking: e.target.checked }))}
                      />
                    }
                    label="Include Critical Thinking"
                  />
                </>
              )}
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.includeParticipation}
                    onChange={(e) => setSettings(prev => ({ ...prev, includeParticipation: e.target.checked }))}
                  />
                }
                label="Include Participation/Effort"
              />
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // Render generated rubric
  const renderRubric = () => {
    if (!rubric) return null;

    return (
      <Card>
        <CardHeader 
          title={rubric.title}
          action={
            <Stack direction="row" spacing={1}>
              <IconButton onClick={() => setPreviewMode(!previewMode)}>
                <PreviewIcon />
              </IconButton>
              <IconButton>
                <DownloadIcon />
              </IconButton>
            </Stack>
          }
        />
        <CardContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Total Points:</strong> {rubric.totalPoints} • 
              <strong> Estimated Grading Time:</strong> {rubric.metadata.estimatedGradingTime} minutes •
              <strong> Criteria:</strong> {rubric.criteria.length}
            </Typography>
          </Alert>

          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Instructions:</strong> {rubric.instructions}
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Criterion</strong></TableCell>
                  <TableCell><strong>Weight</strong></TableCell>
                  <TableCell><strong>Excellent</strong></TableCell>
                  <TableCell><strong>Good</strong></TableCell>
                  <TableCell><strong>Fair</strong></TableCell>
                  <TableCell><strong>Poor</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rubric.criteria.map((criterion) => (
                  <TableRow key={criterion.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {criterion.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {criterion.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={`${criterion.weight}%`} size="small" />
                    </TableCell>
                    {criterion.levels.map((level) => (
                      <TableCell key={level.id}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {level.points} pts
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {level.description}
                        </Typography>
                      </TableCell>
                    ))}
                    <TableCell>
                      <IconButton size="small" onClick={() => setEditingCriterion(criterion)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  // Render preview mode
  const renderPreview = () => {
    if (!rubric) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Student View - {rubric.title}</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {rubric.instructions}
        </Typography>
        
        {rubric.criteria.map((criterion) => (
          <Card key={criterion.id} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {criterion.name} ({criterion.weight}% of grade)
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {criterion.description}
              </Typography>
              
              <Grid container spacing={1}>
                {criterion.levels.map((level, index) => (
                  <Grid item xs={12} sm={3} key={level.id}>
                    <Paper 
                      sx={{ 
                        p: 1, 
                        textAlign: 'center',
                        bgcolor: index === 0 ? 'success.light' :
                                index === 1 ? 'info.light' :
                                index === 2 ? 'warning.light' : 'error.light',
                        color: 'white'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {level.name}
                      </Typography>
                      <Typography variant="caption">
                        {level.points} points
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Rubric Generator
        </Typography>
        <Stack direction="row" spacing={1}>
          {onClose && (
            <Button onClick={onClose} variant="outlined" size="small">
              Close
            </Button>
          )}
        </Stack>
      </Box>

      {/* Question Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Question Type:</strong> {question.type.replace('_', ' ')} • 
          <strong> Difficulty:</strong> {question.difficulty} • 
          <strong> Points:</strong> {question.points}
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {/* Settings Panel */}
          {renderSettings()}
          
          <Box sx={{ mt: 2 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AutoGenerateIcon />}
              onClick={generateRubric}
              disabled={isGenerating}
              size="large"
            >
              {isGenerating ? 'Generating...' : 'Generate Rubric'}
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12} md={8}>
          {/* Generated Rubric */}
          {!rubric ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <RubricIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No rubric generated yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure your settings and click "Generate Rubric" to create assessment criteria.
              </Typography>
            </Box>
          ) : previewMode ? (
            renderPreview()
          ) : (
            renderRubric()
          )}
        </Grid>
      </Grid>

      {/* Edit Criterion Dialog */}
      <Dialog 
        open={!!editingCriterion} 
        onClose={() => setEditingCriterion(null)}
        maxWidth="md"
        fullWidth
      >
        {editingCriterion && (
          <>
            <DialogTitle>
              Edit Criterion: {editingCriterion.name}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  label="Criterion Name"
                  value={editingCriterion.name}
                  onChange={(e) => setEditingCriterion(prev => ({ ...prev!, name: e.target.value }))}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={editingCriterion.description}
                  onChange={(e) => setEditingCriterion(prev => ({ ...prev!, description: e.target.value }))}
                />
                <Box>
                  <Typography gutterBottom>Weight: {editingCriterion.weight}%</Typography>
                  <Slider
                    value={editingCriterion.weight}
                    onChange={(_, value) => setEditingCriterion(prev => ({ ...prev!, weight: value as number }))}
                    min={5}
                    max={50}
                    step={5}
                    marks
                  />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingCriterion(null)}>Cancel</Button>
              <Button 
                variant="contained"
                onClick={() => {
                  updateCriterion(editingCriterion.id, editingCriterion);
                  setEditingCriterion(null);
                }}
              >
                Save Changes
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

// Helper function to create rubric based on question type
function createRubricForQuestion(
  question: GeneratedQuestion, 
  settings: any
): GeneratedRubric {
  const criteria: RubricCriterion[] = [];
  const basePoints = settings.pointScale;
  const levels = settings.useFourPoint ? 4 : 5;
  
  // Generate performance levels based on scale
  const createLevels = (maxPoints: number) => {
    const levelNames = settings.useFourPoint 
      ? ['Excellent', 'Good', 'Fair', 'Poor']
      : ['Exceptional', 'Good', 'Satisfactory', 'Needs Work', 'Inadequate'];
    
    return levelNames.map((name, index) => ({
      id: `level_${index}`,
      name,
      description: generateLevelDescription(name, question.type),
      points: Math.round(maxPoints * (levels - index - 1) / (levels - 1)),
      keywords: [],
    }));
  };

  // Core criteria based on question type
  if (question.type === 'multiple_choice') {
    criteria.push({
      id: 'accuracy',
      name: 'Answer Accuracy',
      description: 'Correctness of selected answer',
      weight: 100,
      levels: createLevels(basePoints),
    });
  } else if (question.type === 'short_answer') {
    criteria.push(
      {
        id: 'accuracy',
        name: 'Content Accuracy',
        description: 'Correctness and completeness of answer',
        weight: 70,
        levels: createLevels(Math.round(basePoints * 0.7)),
      },
      {
        id: 'clarity',
        name: 'Clarity & Communication',
        description: 'Clear expression of ideas',
        weight: 30,
        levels: createLevels(Math.round(basePoints * 0.3)),
      }
    );
  } else if (question.type === 'essay') {
    criteria.push(
      {
        id: 'content',
        name: 'Content Knowledge',
        description: 'Demonstrates understanding of key concepts',
        weight: 40,
        levels: createLevels(Math.round(basePoints * 0.4)),
      },
      {
        id: 'analysis',
        name: 'Analysis & Reasoning',
        description: 'Quality of analysis and logical reasoning',
        weight: 30,
        levels: createLevels(Math.round(basePoints * 0.3)),
      },
      {
        id: 'organization',
        name: 'Organization & Structure',
        description: 'Clear structure and logical flow',
        weight: 20,
        levels: createLevels(Math.round(basePoints * 0.2)),
      },
      {
        id: 'communication',
        name: 'Writing Quality',
        description: 'Grammar, style, and clarity',
        weight: 10,
        levels: createLevels(Math.round(basePoints * 0.1)),
      }
    );
  } else if (question.type === 'analysis') {
    criteria.push(
      {
        id: 'analysis_depth',
        name: 'Depth of Analysis',
        description: 'Thoroughness and insight in analysis',
        weight: 40,
        levels: createLevels(Math.round(basePoints * 0.4)),
      },
      {
        id: 'evidence',
        name: 'Use of Evidence',
        description: 'Appropriate use of supporting evidence',
        weight: 30,
        levels: createLevels(Math.round(basePoints * 0.3)),
      },
      {
        id: 'critical_thinking',
        name: 'Critical Thinking',
        description: 'Evaluation and synthesis of information',
        weight: 30,
        levels: createLevels(Math.round(basePoints * 0.3)),
      }
    );
  }

  // Add optional criteria
  if (settings.includeCreativity) {
    criteria.push({
      id: 'creativity',
      name: 'Creativity & Originality',
      description: 'Original thinking and creative approaches',
      weight: 15,
      levels: createLevels(Math.round(basePoints * 0.15)),
    });
  }

  if (settings.includeParticipation) {
    criteria.push({
      id: 'participation',
      name: 'Participation & Effort',
      description: 'Demonstrated effort and engagement',
      weight: 10,
      levels: createLevels(Math.round(basePoints * 0.1)),
    });
  }

  // Normalize weights to 100%
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  criteria.forEach(c => {
    c.weight = Math.round((c.weight / totalWeight) * 100);
  });

  return {
    id: `rubric_${question.id}`,
    questionId: question.id,
    questionType: question.type,
    title: `${question.type.replace('_', ' ')} Rubric`,
    totalPoints: basePoints,
    criteria,
    instructions: generateInstructions(question.type, basePoints),
    metadata: {
      createdAt: new Date(),
      difficulty: question.difficulty,
      estimatedGradingTime: estimateGradingTime(question.type, basePoints),
    },
  };
}

function generateLevelDescription(levelName: string, questionType: QuestionType): string {
  const descriptions: Record<string, Record<QuestionType, string>> = {
    'Excellent': {
      multiple_choice: 'Correct answer selected',
      short_answer: 'Complete and accurate response',
      essay: 'Exceptional understanding and insight',
      analysis: 'Thorough and sophisticated analysis',
      true_false: 'Correct answer with clear reasoning',
      fill_blank: 'All blanks filled correctly',
      matching: 'All matches correct',
      ordering: 'Perfect sequence',
    },
    'Good': {
      multiple_choice: 'Mostly correct with minor issues',
      short_answer: 'Good understanding with minor gaps',
      essay: 'Strong understanding with good examples',
      analysis: 'Good analysis with solid reasoning',
      true_false: 'Correct answer',
      fill_blank: 'Most blanks correct',
      matching: 'Most matches correct',
      ordering: 'Mostly correct sequence',
    },
    'Fair': {
      multiple_choice: 'Partially correct',
      short_answer: 'Basic understanding shown',
      essay: 'Adequate understanding',
      analysis: 'Basic analysis attempted',
      true_false: 'Answer with some reasoning',
      fill_blank: 'Some blanks correct',
      matching: 'Some matches correct',
      ordering: 'Some elements in order',
    },
    'Poor': {
      multiple_choice: 'Incorrect answer',
      short_answer: 'Minimal understanding',
      essay: 'Limited understanding',
      analysis: 'Superficial or incorrect analysis',
      true_false: 'Incorrect answer',
      fill_blank: 'Few or no correct answers',
      matching: 'Few or no correct matches',
      ordering: 'Incorrect sequence',
    },
  };

  return descriptions[levelName]?.[questionType] || 'Standard performance level';
}

function generateInstructions(questionType: QuestionType, totalPoints: number): string {
  const instructions: Record<QuestionType, string> = {
    multiple_choice: `Evaluate the selected answer for accuracy. Total points: ${totalPoints}`,
    short_answer: `Assess completeness, accuracy, and clarity of the response. Total points: ${totalPoints}`,
    essay: `Evaluate content knowledge, analysis, organization, and writing quality. Total points: ${totalPoints}`,
    analysis: `Assess depth of analysis, use of evidence, and critical thinking. Total points: ${totalPoints}`,
    true_false: `Evaluate correctness and reasoning provided. Total points: ${totalPoints}`,
    fill_blank: `Check accuracy of completed responses. Total points: ${totalPoints}`,
    matching: `Verify correctness of all matches. Total points: ${totalPoints}`,
    ordering: `Assess accuracy of sequence or arrangement. Total points: ${totalPoints}`,
  };

  return instructions[questionType] || `Evaluate response according to criteria. Total points: ${totalPoints}`;
}

function estimateGradingTime(questionType: QuestionType, points: number): number {
  const baseTime: Record<QuestionType, number> = {
    multiple_choice: 0.5,
    true_false: 0.5,
    short_answer: 2,
    fill_blank: 1,
    matching: 1,
    ordering: 1,
    essay: 8,
    analysis: 10,
  };

  const complexity = Math.max(1, points / 10);
  return Math.round(baseTime[questionType] * complexity);
}