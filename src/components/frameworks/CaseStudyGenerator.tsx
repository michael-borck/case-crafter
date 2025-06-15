// Main case study generator integrating frameworks and forms

import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
} from '@mui/icons-material';
import { FrameworkSelector, BusinessFramework } from './FrameworkSelector';
import { FrameworkMapper } from './FrameworkMapper';
import { DynamicForm } from '../forms/DynamicForm';
import { ConfigurationSchema } from '../../types/configuration';

interface GeneratedCaseStudy {
  title: string;
  framework: string;
  content: {
    sections: CaseStudySection[];
    metadata: CaseStudyMetadata;
  };
  generatedAt: string;
}

interface CaseStudySection {
  id: string;
  title: string;
  content: string;
  questions?: string[];
  keyPoints?: string[];
}

interface CaseStudyMetadata {
  learningObjectives: string[];
  targetAudience: string[];
  difficultyLevel: string;
  estimatedDuration: number;
  keywords: string[];
  frameworkElements: string[];
}

const steps = [
  'Select Framework',
  'Configure Mapping',
  'Input Details',
  'Generate Case Study'
];

export const CaseStudyGenerator: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFramework, setSelectedFramework] = useState<BusinessFramework | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState<ConfigurationSchema | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generatedCaseStudy, setGeneratedCaseStudy] = useState<GeneratedCaseStudy | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError(null);
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedFramework(null);
    setGeneratedSchema(null);
    setFormData({});
    setGeneratedCaseStudy(null);
    setError(null);
  };

  const handleFrameworkSelect = (framework: BusinessFramework) => {
    setSelectedFramework(framework);
  };

  const handleMappingComplete = (schema: ConfigurationSchema) => {
    setGeneratedSchema(schema);
    handleNext();
  };

  const handleFormSubmit = async (data: Record<string, any>) => {
    setFormData(data);
    setIsGenerating(true);
    setError(null);

    try {
      // Simulate case study generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const caseStudy = await generateCaseStudy(data);
      setGeneratedCaseStudy(caseStudy);
      handleNext();
    } catch (err) {
      setError('Failed to generate case study. Please try again.');
      console.error('Case study generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCaseStudy = async (data: Record<string, any>): Promise<GeneratedCaseStudy> => {
    if (!selectedFramework) {
      throw new Error('Missing framework');
    }

    // Simulate AI-powered case study generation
    const sections: CaseStudySection[] = selectedFramework.outputSections.map((sectionTitle, index) => {
      const content = generateSectionContent(sectionTitle, data, selectedFramework);
      const questions = generateSectionQuestions(sectionTitle, selectedFramework);
      
      return {
        id: `section-${index + 1}`,
        title: sectionTitle,
        content,
        questions,
        keyPoints: generateKeyPoints(sectionTitle),
      };
    });

    return {
      title: data.case_title || `${selectedFramework.name} Case Study`,
      framework: selectedFramework.name,
      content: {
        sections,
        metadata: {
          learningObjectives: data.learning_objectives || selectedFramework.learningObjectives,
          targetAudience: data.target_audience || ['undergraduate'],
          difficultyLevel: data.difficulty_level || selectedFramework.complexity,
          estimatedDuration: selectedFramework.estimatedMinutes,
          keywords: extractKeywords(data),
          frameworkElements: selectedFramework.keyQuestions,
        },
      },
      generatedAt: new Date().toISOString(),
    };
  };

  const generateSectionContent = (sectionTitle: string, data: Record<string, any>, framework: BusinessFramework): string => {
    // This would be replaced with actual AI generation
    const company = data.company_name || data.organization_name || data.venture_name || 'Example Company';
    const industry = data.industry || 'Technology';
    
    const templates: Record<string, string> = {
      'Executive Summary': `This case study examines ${company}, a ${industry.toLowerCase()} company, through the lens of ${framework.name}. The analysis provides insights into strategic decision-making and competitive dynamics within the ${industry.toLowerCase()} sector.`,
      
      'Industry Overview': `The ${industry.toLowerCase()} industry has experienced significant transformation in recent years. ${company} operates in a highly competitive environment characterized by rapid technological change, evolving consumer preferences, and regulatory challenges.`,
      
      'Background & Context': `${company} was founded with the mission to revolutionize the ${industry.toLowerCase()} sector. The company has grown from a startup to a significant player in the market, facing both opportunities and challenges along the way.`,
      
      'Problem Statement': `${company} faces several strategic challenges that require careful analysis using the ${framework.name} framework. These challenges include market positioning, competitive pressures, and operational efficiency.`,
      
      'Competitive Rivalry Analysis': `The competitive landscape in the ${industry.toLowerCase()} industry is intense, with ${company} facing competition from both established players and emerging startups. Key competitive factors include innovation, pricing, and customer service.`,
      
      'Strategic Implications': `Based on the ${framework.name} analysis, several strategic implications emerge for ${company}. These insights will guide future decision-making and strategic planning initiatives.`,
      
      'Recommendations': `The following recommendations are based on the comprehensive ${framework.name} analysis: 1) Focus on core competencies, 2) Enhance competitive positioning, 3) Develop strategic partnerships, 4) Invest in innovation and technology.`,
    };

    return templates[sectionTitle] || `This section provides detailed analysis of ${sectionTitle.toLowerCase()} for ${company} using the ${framework.name} framework. The analysis considers industry dynamics, competitive factors, and strategic implications.`;
  };

  const generateSectionQuestions = (sectionTitle: string, framework: BusinessFramework): string[] => {
    const questionTemplates: Record<string, string[]> = {
      'Competitive Rivalry Analysis': [
        'How intense is the competitive rivalry in this industry?',
        'What are the key competitive factors?',
        'How does the company differentiate itself from competitors?'
      ],
      'Strategic Implications': [
        'What are the key strategic insights from this analysis?',
        'How should the company respond to identified opportunities and threats?',
        'What are the potential risks of different strategic options?'
      ],
      'Recommendations': [
        'Which recommendations are most critical for immediate implementation?',
        'How should the company prioritize these recommendations?',
        'What resources are needed to implement these strategies?'
      ],
    };

    return questionTemplates[sectionTitle] || [
      `What are the key insights from the ${sectionTitle.toLowerCase()} analysis?`,
      `How does this section relate to the overall ${framework.name} framework?`,
      'What actions should management consider based on this analysis?'
    ];
  };

  const generateKeyPoints = (sectionTitle: string): string[] => {
    return [
      `Key finding related to ${sectionTitle.toLowerCase()}`,
      'Important strategic consideration',
      'Critical success factor identified',
    ];
  };

  const extractKeywords = (data: Record<string, any>): string[] => {
    const keywords = new Set<string>();
    
    Object.values(data).forEach(value => {
      if (typeof value === 'string') {
        // Simple keyword extraction - in production, use more sophisticated NLP
        const words = value.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        words.forEach(word => keywords.add(word));
      }
    });

    return Array.from(keywords).slice(0, 10);
  };

  const downloadCaseStudy = () => {
    if (!generatedCaseStudy) return;

    const content = `
# ${generatedCaseStudy.title}

**Framework:** ${generatedCaseStudy.framework}
**Generated:** ${new Date(generatedCaseStudy.generatedAt).toLocaleDateString()}

## Learning Objectives
${generatedCaseStudy.content.metadata.learningObjectives.map(obj => `- ${obj}`).join('\n')}

## Target Audience
${generatedCaseStudy.content.metadata.targetAudience.join(', ')}

## Difficulty Level
${generatedCaseStudy.content.metadata.difficultyLevel}

---

${generatedCaseStudy.content.sections.map(section => `
## ${section.title}

${section.content}

### Discussion Questions
${section.questions?.map(q => `1. ${q}`).join('\n') || 'No questions provided'}

### Key Points
${section.keyPoints?.map(point => `- ${point}`).join('\n') || 'No key points provided'}

---
`).join('\n')}

## Keywords
${generatedCaseStudy.content.metadata.keywords.join(', ')}
    `;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedCaseStudy.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <FrameworkSelector
            onFrameworkSelect={handleFrameworkSelect}
            selectedFramework={selectedFramework || undefined}
          />
        );
      case 1:
        return selectedFramework ? (
          <FrameworkMapper
            framework={selectedFramework}
            onMappingComplete={handleMappingComplete}
          />
        ) : (
          <Alert severity="error">No framework selected</Alert>
        );
      case 2:
        return generatedSchema ? (
          <DynamicForm
            schema={generatedSchema}
            initialData={generatedSchema.defaults}
            onSubmit={handleFormSubmit}
            showProgress={true}
            mode="create"
          />
        ) : null;
      case 3:
        return generatedCaseStudy ? (
          <CaseStudyPreview caseStudy={generatedCaseStudy} onDownload={downloadCaseStudy} />
        ) : null;
      default:
        return 'Unknown step';
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0: return selectedFramework !== null;
      case 1: return generatedSchema !== null;
      case 2: return Object.keys(formData).length > 0;
      default: return true;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Case Study Generator
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Create comprehensive case studies using proven business frameworks.
        Follow the guided process to generate educational content tailored to your needs.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        {isGenerating ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <Stack spacing={2} alignItems="center">
              <CircularProgress size={60} />
              <Typography variant="h6">Generating Case Study...</Typography>
              <Typography variant="body2" color="text.secondary">
                Analyzing framework requirements and creating comprehensive content
              </Typography>
            </Stack>
          </Box>
        ) : (
          renderStepContent(activeStep)
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeStep === steps.length - 1 ? (
            <Button onClick={handleReset}>
              Generate Another
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!canProceed() || isGenerating}
            >
              {activeStep === steps.length - 2 ? 'Generate Case Study' : 'Next'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// Case Study Preview Component
interface CaseStudyPreviewProps {
  caseStudy: GeneratedCaseStudy;
  onDownload: () => void;
}

const CaseStudyPreview: React.FC<CaseStudyPreviewProps> = ({ caseStudy, onDownload }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Generated Case Study</Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={onDownload}
        >
          Download Case Study
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {caseStudy.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Framework: {caseStudy.framework}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={caseStudy.content.metadata.difficultyLevel} color="primary" size="small" />
            <Chip label={`${caseStudy.content.metadata.estimatedDuration} min`} color="secondary" size="small" />
            <Chip label={`${caseStudy.content.sections.length} sections`} color="info" size="small" />
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Learning Objectives:
          </Typography>
          {caseStudy.content.metadata.learningObjectives.map((objective, objIndex) => (
            <Typography key={objIndex} variant="body2" color="text.secondary">
              • {objective}
            </Typography>
          ))}
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {caseStudy.content.sections.map((section) => (
          <Card key={section.id}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {section.title}
              </Typography>
              <Typography variant="body1" paragraph>
                {section.content}
              </Typography>
              
              {section.questions && section.questions.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Discussion Questions:
                  </Typography>
                  {section.questions.map((question, index) => (
                    <Typography key={index} variant="body2" color="text.secondary">
                      {index + 1}. {question}
                    </Typography>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};