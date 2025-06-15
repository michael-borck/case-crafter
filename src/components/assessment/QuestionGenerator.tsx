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
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Slider,
  Stepper,
  Step,
  StepLabel,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  Psychology as AIIcon,
  Quiz as QuizIcon,
  ExpandMore as ExpandIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Preview as PreviewIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as RadioIcon,
  TextFields as TextIcon,
  Description as EssayIcon,
  Analytics as AnalysisIcon,
  Timer as TimerIcon,
  FlagOutlined as ObjectiveIcon,
  Assignment as RubricIcon,
} from '@mui/icons-material';

import { ContentItem } from '../content/ContentLibrary';
import { RubricGenerator } from './RubricGenerator';

// Question types and interfaces
export type QuestionType = 'multiple_choice' | 'short_answer' | 'essay' | 'analysis' | 'true_false' | 'fill_blank' | 'matching' | 'ordering';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type CognitiveLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  cognitiveLevel: CognitiveLevel;
  question: string;
  options?: QuestionOption[];
  correctAnswer?: string;
  sampleAnswer?: string;
  rubric?: string[];
  hints?: string[];
  explanation: string;
  points: number;
  estimatedTime: number; // in minutes
  learningObjective: string;
  keywords: string[];
  sourceSection?: string;
  metadata: {
    createdAt: Date;
    aiProvider: string;
    confidence: number;
    reviewed: boolean;
    approved: boolean;
  };
}

export interface QuestionGenerationSettings {
  questionTypes: QuestionType[];
  difficultyDistribution: Record<DifficultyLevel, number>;
  cognitiveDistribution: Record<CognitiveLevel, number>;
  totalQuestions: number;
  includeHints: boolean;
  includeExplanations: boolean;
  includeRubrics: boolean;
  targetAudience: 'undergraduate' | 'graduate' | 'professional';
  focusAreas: string[];
  timeLimit?: number;
  pointsPerQuestion: number;
}

interface QuestionGeneratorProps {
  contentItem: ContentItem;
  onQuestionsGenerated?: (questions: GeneratedQuestion[]) => void;
  onClose?: () => void;
}

export const QuestionGenerator: React.FC<QuestionGeneratorProps> = ({
  contentItem,
  onQuestionsGenerated,
  onClose,
}) => {
  // State management
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [previewQuestion, setPreviewQuestion] = useState<GeneratedQuestion | null>(null);
  const [rubricQuestion, setRubricQuestion] = useState<GeneratedQuestion | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Generation settings
  const [settings, setSettings] = useState<QuestionGenerationSettings>({
    questionTypes: ['multiple_choice', 'short_answer', 'essay'],
    difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
    cognitiveDistribution: { 
      remember: 20, 
      understand: 30, 
      apply: 25, 
      analyze: 15, 
      evaluate: 7, 
      create: 3 
    },
    totalQuestions: 10,
    includeHints: true,
    includeExplanations: true,
    includeRubrics: true,
    targetAudience: 'undergraduate',
    focusAreas: [],
    pointsPerQuestion: 1,
  });

  // UI state
  const [showSettings, setShowSettings] = useState(false);

  // Available question types configuration
  const questionTypeConfig: Record<QuestionType, {
    label: string;
    icon: React.ReactElement;
    description: string;
    minTime: number;
    maxTime: number;
  }> = {
    multiple_choice: {
      label: 'Multiple Choice',
      icon: <RadioIcon />,
      description: 'Questions with multiple options, one or more correct answers',
      minTime: 2,
      maxTime: 5,
    },
    short_answer: {
      label: 'Short Answer',
      icon: <TextIcon />,
      description: 'Brief written responses requiring specific knowledge',
      minTime: 3,
      maxTime: 8,
    },
    essay: {
      label: 'Essay',
      icon: <EssayIcon />,
      description: 'Extended written responses demonstrating understanding',
      minTime: 15,
      maxTime: 45,
    },
    analysis: {
      label: 'Analysis',
      icon: <AnalysisIcon />,
      description: 'Critical thinking questions requiring detailed analysis',
      minTime: 10,
      maxTime: 30,
    },
    true_false: {
      label: 'True/False',
      icon: <CheckIcon />,
      description: 'Binary choice questions testing factual knowledge',
      minTime: 1,
      maxTime: 3,
    },
    fill_blank: {
      label: 'Fill in the Blank',
      icon: <TextIcon />,
      description: 'Complete sentences or paragraphs with missing words',
      minTime: 2,
      maxTime: 5,
    },
    matching: {
      label: 'Matching',
      icon: <TextIcon />,
      description: 'Match items from two lists',
      minTime: 3,
      maxTime: 8,
    },
    ordering: {
      label: 'Ordering',
      icon: <TextIcon />,
      description: 'Arrange items in correct sequence',
      minTime: 3,
      maxTime: 10,
    },
  };

  // Generate questions using AI
  const generateQuestions = useCallback(async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setActiveStep(1);

    try {
      // Simulate API call with progress updates
      const progressSteps = [
        'Analyzing content structure...',
        'Identifying key concepts...',
        'Generating question templates...',
        'Creating detailed questions...',
        'Validating question quality...',
        'Finalizing assessments...',
      ];

      for (let i = 0; i < progressSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setGenerationProgress((i + 1) * (100 / progressSteps.length));
      }

      // Generate sample questions based on settings
      const generatedQuestions = await generateSampleQuestions(contentItem, settings);
      setQuestions(generatedQuestions);
      setActiveStep(2);

      if (onQuestionsGenerated) {
        onQuestionsGenerated(generatedQuestions);
      }

    } catch (error) {
      console.error('Question generation failed:', error);
      // Handle error state
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [contentItem, settings, onQuestionsGenerated]);

  // Render generation settings
  const renderSettings = () => (
    <Box>
      <Grid container spacing={3}>
        {/* Question Types */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>Question Types</Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {Object.entries(questionTypeConfig).map(([type, config]) => (
                <Grid item xs={12} sm={6} md={4} key={type}>
                  <Card 
                    variant={settings.questionTypes.includes(type as QuestionType) ? 'elevation' : 'outlined'}
                    sx={{ 
                      cursor: 'pointer',
                      border: settings.questionTypes.includes(type as QuestionType) ? 2 : 1,
                      borderColor: settings.questionTypes.includes(type as QuestionType) ? 'primary.main' : 'divider',
                    }}
                    onClick={() => {
                      const newTypes = settings.questionTypes.includes(type as QuestionType)
                        ? settings.questionTypes.filter(t => t !== type)
                        : [...settings.questionTypes, type as QuestionType];
                      setSettings(prev => ({ ...prev, questionTypes: newTypes }));
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Box sx={{ color: 'primary.main', mb: 1 }}>
                        {config.icon}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {config.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {config.minTime}-{config.maxTime} min
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Generation Parameters */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>Generation Parameters</Typography>
          <Stack spacing={2}>
            <TextField
              label="Total Questions"
              type="number"
              value={settings.totalQuestions}
              onChange={(e) => setSettings(prev => ({ ...prev, totalQuestions: parseInt(e.target.value) }))}
              InputProps={{ inputProps: { min: 1, max: 50 } }}
              size="small"
            />
            
            <FormControl size="small">
              <InputLabel>Target Audience</InputLabel>
              <Select
                value={settings.targetAudience}
                onChange={(e) => setSettings(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                label="Target Audience"
              >
                <MenuItem value="undergraduate">Undergraduate</MenuItem>
                <MenuItem value="graduate">Graduate</MenuItem>
                <MenuItem value="professional">Professional</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Points Per Question"
              type="number"
              value={settings.pointsPerQuestion}
              onChange={(e) => setSettings(prev => ({ ...prev, pointsPerQuestion: parseInt(e.target.value) }))}
              InputProps={{ inputProps: { min: 1, max: 10 } }}
              size="small"
            />
          </Stack>
        </Grid>

        {/* Difficulty Distribution */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>Difficulty Distribution (%)</Typography>
          <Stack spacing={2}>
            {Object.entries(settings.difficultyDistribution).map(([level, value]) => (
              <Box key={level}>
                <Typography variant="body2" sx={{ mb: 1, textTransform: 'capitalize' }}>
                  {level}: {value}%
                </Typography>
                <Slider
                  value={value}
                  onChange={(_, newValue) => setSettings(prev => ({
                    ...prev,
                    difficultyDistribution: {
                      ...prev.difficultyDistribution,
                      [level]: newValue as number
                    }
                  }))}
                  min={0}
                  max={100}
                  size="small"
                  color={level === 'easy' ? 'success' : level === 'medium' ? 'warning' : 'error'}
                />
              </Box>
            ))}
          </Stack>
        </Grid>

        {/* Options */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>Options</Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.includeHints}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeHints: e.target.checked }))}
                />
              }
              label="Include Hints"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.includeExplanations}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeExplanations: e.target.checked }))}
                />
              }
              label="Include Explanations"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.includeRubrics}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeRubrics: e.target.checked }))}
                />
              }
              label="Include Rubrics"
            />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );

  // Render generated questions
  const renderQuestions = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Generated Questions ({questions.length})
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={generateQuestions}
            disabled={isGenerating}
            size="small"
          >
            Regenerate
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={questions.length === 0}
            size="small"
          >
            Export Questions
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2}>
        {questions.map((question, index) => (
          <Grid item xs={12} key={question.id}>
            <Card variant="outlined">
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">
                      Question {index + 1}
                    </Typography>
                    <Chip 
                      label={questionTypeConfig[question.type]?.label} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    <Chip 
                      label={question.difficulty} 
                      size="small" 
                      color={
                        question.difficulty === 'easy' ? 'success' :
                        question.difficulty === 'medium' ? 'warning' : 'error'
                      }
                    />
                    <Chip 
                      label={`${question.points} pts`} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                }
                action={
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" onClick={() => setPreviewQuestion(question)}>
                      <PreviewIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => setRubricQuestion(question)}>
                      <RubricIcon />
                    </IconButton>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                }
              />
              <CardContent>
                <Typography variant="body1" paragraph>
                  {question.question}
                </Typography>

                {question.type === 'multiple_choice' && question.options && (
                  <Box sx={{ ml: 2 }}>
                    {question.options.map((option, optIndex) => (
                      <Box key={option.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography 
                          variant="body2" 
                          color={option.isCorrect ? 'success.main' : 'text.primary'}
                          sx={{ fontWeight: option.isCorrect ? 'bold' : 'normal' }}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option.text}
                          {option.isCorrect && ' ✓'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                  <Chip label={question.cognitiveLevel} size="small" />
                  <Chip label={`${question.estimatedTime} min`} size="small" icon={<TimerIcon />} />
                  <Chip 
                    label={question.learningObjective} 
                    size="small" 
                    icon={<ObjectiveIcon />}
                    variant="outlined"
                  />
                </Box>

                {settings.includeExplanations && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Explanation:</strong> {question.explanation}
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render generation stepper
  const renderGenerationStepper = () => (
    <Box sx={{ mb: 3 }}>
      <Stepper activeStep={activeStep} orientation="horizontal">
        <Step>
          <StepLabel>Configure Settings</StepLabel>
        </Step>
        <Step>
          <StepLabel>Generate Questions</StepLabel>
        </Step>
        <Step>
          <StepLabel>Review & Export</StepLabel>
        </Step>
      </Stepper>

      {isGenerating && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={generationProgress} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Generating questions... {Math.round(generationProgress)}%
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Assessment Question Generator
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<SettingsIcon />}
            onClick={() => setShowSettings(!showSettings)}
            variant={showSettings ? 'contained' : 'outlined'}
            size="small"
          >
            Settings
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outlined" size="small">
              Close
            </Button>
          )}
        </Stack>
      </Box>

      {/* Content Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Content:</strong> {contentItem.title} • 
          <strong> Word Count:</strong> {contentItem.wordCount} • 
          <strong> Estimated Questions:</strong> {Math.ceil(contentItem.wordCount / 250)}
        </Typography>
      </Alert>

      {/* Generation Stepper */}
      {renderGenerationStepper()}

      {/* Settings Panel */}
      <Accordion expanded={showSettings} onChange={() => setShowSettings(!showSettings)}>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Typography variant="h6">Generation Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {renderSettings()}
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 3 }} />

      {/* Main Content Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab 
            label={
              <Badge badgeContent={questions.length} color="primary">
                Questions
              </Badge>
            } 
            icon={<QuizIcon />} 
          />
          <Tab label="Preview" icon={<PreviewIcon />} />
          <Tab label="Analytics" icon={<AnalysisIcon />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {questions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <AIIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No questions generated yet
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure your settings and click "Generate Questions" to create AI-powered assessments from your content.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AIIcon />}
                onClick={generateQuestions}
                disabled={isGenerating || settings.questionTypes.length === 0}
                size="large"
              >
                {isGenerating ? 'Generating...' : 'Generate Questions'}
              </Button>
            </Box>
          ) : (
            renderQuestions()
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <PreviewIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Question Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Preview how questions will appear to students
          </Typography>
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <AnalysisIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Question Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View difficulty distribution and cognitive levels
          </Typography>
        </Box>
      )}

      {/* Question Preview Dialog */}
      <Dialog 
        open={!!previewQuestion} 
        onClose={() => setPreviewQuestion(null)}
        maxWidth="md"
        fullWidth
      >
        {previewQuestion && (
          <>
            <DialogTitle>
              Question Preview - {questionTypeConfig[previewQuestion.type]?.label}
            </DialogTitle>
            <DialogContent>
              <Typography variant="h6" gutterBottom>
                {previewQuestion.question}
              </Typography>
              
              {previewQuestion.type === 'multiple_choice' && previewQuestion.options && (
                <Box sx={{ mt: 2 }}>
                  {previewQuestion.options.map((option, index) => (
                    <Box key={option.id} sx={{ mb: 1 }}>
                      <Typography variant="body1">
                        {String.fromCharCode(65 + index)}. {option.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {previewQuestion.hints && previewQuestion.hints.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Hint:</strong> {previewQuestion.hints[0]}
                  </Typography>
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewQuestion(null)}>Close</Button>
              <Button variant="contained">Edit Question</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Rubric Generator Dialog */}
      <Dialog 
        open={!!rubricQuestion} 
        onClose={() => setRubricQuestion(null)}
        maxWidth="xl"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          {rubricQuestion && (
            <RubricGenerator
              question={rubricQuestion}
              onClose={() => setRubricQuestion(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// Helper function to generate sample questions
async function generateSampleQuestions(
  contentItem: ContentItem, 
  settings: QuestionGenerationSettings
): Promise<GeneratedQuestion[]> {
  // In a real implementation, this would call an AI service
  // For now, we'll generate sample questions based on the content
  
  const sampleQuestions: GeneratedQuestion[] = [];
  const questionTypes = settings.questionTypes;
  const totalQuestions = settings.totalQuestions;

  for (let i = 0; i < totalQuestions; i++) {
    const type = questionTypes[i % questionTypes.length] || 'multiple_choice';
    const difficulty: DifficultyLevel = 
      i < totalQuestions * 0.3 ? 'easy' :
      i < totalQuestions * 0.8 ? 'medium' : 'hard';

    const cognitiveLevel: CognitiveLevel = 
      difficulty === 'easy' ? 'remember' :
      difficulty === 'medium' ? 'understand' : 'analyze';

    const typeConfig = {
      multiple_choice: { minTime: 2 },
      short_answer: { minTime: 3 },
      essay: { minTime: 15 },
      analysis: { minTime: 10 },
      true_false: { minTime: 1 },
      fill_blank: { minTime: 2 },
      matching: { minTime: 3 },
      ordering: { minTime: 3 },
    };

    const question: GeneratedQuestion = {
      id: `q_${i + 1}`,
      type,
      difficulty,
      cognitiveLevel,
      question: generateSampleQuestionText(contentItem, type, difficulty),
      points: settings.pointsPerQuestion,
      estimatedTime: typeConfig[type].minTime,
      learningObjective: `Understand key concepts from ${contentItem.title}`,
      keywords: contentItem.tags.slice(0, 3),
      explanation: `This question tests understanding of core concepts related to ${contentItem.category}.`,
      metadata: {
        createdAt: new Date(),
        aiProvider: 'Sample Generator',
        confidence: 0.85,
        reviewed: false,
        approved: false,
      },
    };

    if (type === 'multiple_choice') {
      question.options = generateMultipleChoiceOptions(contentItem, difficulty);
    }

    if (settings.includeHints) {
      question.hints = [`Consider the main themes in ${contentItem.title}`];
    }

    if (settings.includeRubrics && (type === 'essay' || type === 'analysis')) {
      question.rubric = [
        'Demonstrates clear understanding of concepts',
        'Provides relevant examples',
        'Shows critical thinking',
        'Uses appropriate terminology',
      ];
    }

    sampleQuestions.push(question);
  }

  return sampleQuestions;
}

function generateSampleQuestionText(contentItem: ContentItem, type: QuestionType, _difficulty: DifficultyLevel): string {
  const baseQuestions: Record<QuestionType, string[]> = {
    multiple_choice: [
      `Which of the following best describes the main challenge in "${contentItem.title}"?`,
      `What was the primary factor that led to the situation described in the case study?`,
      `According to the case study, which approach would be most effective for addressing the core issue?`,
    ],
    short_answer: [
      `Explain the key challenges faced in "${contentItem.title}".`,
      `What were the main factors that contributed to the situation?`,
      `Describe the potential impact of the proposed solution.`,
    ],
    essay: [
      `Analyze the strategic decisions made in "${contentItem.title}" and evaluate their effectiveness.`,
      `Discuss the long-term implications of the situation presented in the case study.`,
      `Compare and contrast the different approaches available to address the main challenge.`,
    ],
    analysis: [
      `Critically analyze the decision-making process outlined in "${contentItem.title}".`,
      `Evaluate the stakeholder perspectives and their influence on the outcome.`,
      `Assess the risk factors and mitigation strategies presented in the case.`,
    ],
    true_false: [
      `The main challenge in "${contentItem.title}" was primarily financial. True or False?`,
      `According to the case, the proposed solution addresses all stakeholder concerns. True or False?`,
    ],
    fill_blank: [
      `The key factor that led to success in "${contentItem.title}" was _______.`,
      `The main stakeholders affected by this decision include _______ and _______.`,
    ],
    matching: [
      `Match the following concepts from "${contentItem.title}" with their definitions.`,
      `Connect each strategy with its corresponding outcome in the case study.`,
    ],
    ordering: [
      `Arrange the following events from "${contentItem.title}" in chronological order.`,
      `Order the following steps in the decision-making process described in the case.`,
    ],
  };

  const questions = baseQuestions[type];
  return questions[Math.floor(Math.random() * questions.length)] || `Sample question for ${contentItem.title}`;
}

function generateMultipleChoiceOptions(_contentItem: ContentItem, _difficulty: DifficultyLevel): QuestionOption[] {
  const options: QuestionOption[] = [
    {
      id: 'opt_a',
      text: `Implementing a comprehensive digital transformation strategy`,
      isCorrect: true,
      explanation: 'This aligns with the main theme of the case study.',
    },
    {
      id: 'opt_b',
      text: `Maintaining the current operational model`,
      isCorrect: false,
      explanation: 'This would not address the core challenges identified.',
    },
    {
      id: 'opt_c',
      text: `Focusing solely on cost reduction measures`,
      isCorrect: false,
      explanation: 'This approach is too narrow for the complex situation presented.',
    },
    {
      id: 'opt_d',
      text: `Outsourcing all operations to third parties`,
      isCorrect: false,
      explanation: 'This extreme approach does not consider the nuances of the case.',
    },
  ];

  return options;
}