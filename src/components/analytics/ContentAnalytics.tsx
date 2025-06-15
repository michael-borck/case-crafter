import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Stack,
  Chip,
  Paper,
  LinearProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingIcon,
  Speed as ReadabilityIcon,
  TextFields as TextIcon,
  Lightbulb as InsightIcon,
  CheckCircle as GoodIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { ContentItem } from '../content/ContentLibrary';

// Analytics interfaces
interface ReadabilityMetrics {
  fleschKincaidGrade: number;
  fleschReadingEase: number;
  averageWordsPerSentence: number;
  averageSyllablesPerWord: number;
  readingLevel: 'elementary' | 'middle_school' | 'high_school' | 'college' | 'graduate';
  estimatedReadingTime: number; // in minutes
}

interface ContentMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordsPerParagraph: number;
  longestSentence: number;
  shortestSentence: number;
  vocabularyComplexity: number; // 0-100 scale
  passiveVoicePercentage: number;
}

interface ContentAnalytics {
  id: string;
  contentId: string;
  contentTitle: string;
  readability: ReadabilityMetrics;
  metrics: ContentMetrics;
  insights: AnalyticsInsight[];
  suggestions: string[];
  lastAnalyzed: Date;
}

interface AnalyticsInsight {
  type: 'good' | 'warning' | 'error' | 'info';
  category: 'readability' | 'structure' | 'vocabulary' | 'engagement';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

interface ContentAnalyticsProps {
  contentItems?: ContentItem[];
  selectedContentId?: string;
  onContentSelect?: (contentId: string) => void;
}

export const ContentAnalytics: React.FC<ContentAnalyticsProps> = ({
  contentItems = [],
  selectedContentId,
  onContentSelect,
}) => {
  // State management
  const [analytics, setAnalytics] = useState<ContentAnalytics[]>([]);
  const [selectedContent, setSelectedContent] = useState<string>(selectedContentId || '');

  // Generate analytics for content items
  useEffect(() => {
    if (contentItems.length > 0) {
      const generatedAnalytics = contentItems.map(item => generateContentAnalytics(item));
      setAnalytics(generatedAnalytics);
      
      if (!selectedContent && contentItems.length > 0) {
        setSelectedContent(contentItems[0]?.id || '');
      }
    }
  }, [contentItems, selectedContent]);

  // Get current analytics
  const currentAnalytics = useMemo(() => {
    return analytics.find(a => a.contentId === selectedContent);
  }, [analytics, selectedContent]);

  // Render readability score card
  const renderReadabilityCard = () => {
    if (!currentAnalytics) return null;

    const { readability } = currentAnalytics;
    const scoreColor = getReadabilityColor(readability.fleschReadingEase);

    return (
      <Card>
        <CardHeader 
          title="Readability Analysis"
          avatar={<Avatar sx={{ bgcolor: `${scoreColor}.main` }}><ReadabilityIcon /></Avatar>}
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: `${scoreColor}.light`, color: `${scoreColor}.dark` }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  {Math.round(readability.fleschReadingEase)}
                </Typography>
                <Typography variant="body2">
                  Flesch Reading Ease
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Reading Level</Typography>
                  <Chip 
                    label={readability.readingLevel.replace('_', ' ')} 
                    color={getReadingLevelColor(readability.readingLevel)}
                    size="small"
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Grade Level</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {Math.round(readability.fleschKincaidGrade)}th Grade
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Estimated Reading Time</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {readability.estimatedReadingTime} minutes
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Render content metrics
  const renderMetricsCard = () => {
    if (!currentAnalytics) return null;

    const { metrics } = currentAnalytics;

    return (
      <Card>
        <CardHeader 
          title="Content Metrics"
          avatar={<Avatar sx={{ bgcolor: 'info.main' }}><TextIcon /></Avatar>}
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {metrics.wordCount.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Words
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary">
                  {metrics.sentenceCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sentences
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {metrics.paragraphCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Paragraphs
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {Math.round(currentAnalytics.readability.averageWordsPerSentence)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Avg Words/Sentence
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>Text Complexity</Typography>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Vocabulary Complexity</Typography>
              <Typography variant="body2">{metrics.vocabularyComplexity}%</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={metrics.vocabularyComplexity} 
              color={metrics.vocabularyComplexity > 70 ? 'warning' : 'success'}
            />
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Passive Voice Usage</Typography>
              <Typography variant="body2">{metrics.passiveVoicePercentage}%</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={metrics.passiveVoicePercentage} 
              color={metrics.passiveVoicePercentage > 25 ? 'warning' : 'success'}
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render insights and suggestions
  const renderInsightsCard = () => {
    if (!currentAnalytics) return null;

    const { insights, suggestions } = currentAnalytics;

    return (
      <Card>
        <CardHeader 
          title="Content Insights"
          avatar={<Avatar sx={{ bgcolor: 'warning.main' }}><InsightIcon /></Avatar>}
        />
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Key Insights</Typography>
          <List dense>
            {insights.map((insight, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {insight.type === 'good' && <GoodIcon color="success" />}
                  {insight.type === 'warning' && <WarningIcon color="warning" />}
                  {insight.type === 'error' && <ErrorIcon color="error" />}
                  {insight.type === 'info' && <InfoIcon color="info" />}
                </ListItemIcon>
                <ListItemText
                  primary={insight.title}
                  secondary={insight.description}
                />
                <Chip 
                  label={insight.impact} 
                  size="small" 
                  color={insight.impact === 'high' ? 'error' : insight.impact === 'medium' ? 'warning' : 'default'}
                />
              </ListItem>
            ))}
          </List>

          {suggestions.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Improvement Suggestions</Typography>
              <List dense>
                {suggestions.map((suggestion, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <TrendingIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={suggestion} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Content Analytics
        </Typography>
      </Box>

      {/* Content Selector */}
      {contentItems.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>Select Content</InputLabel>
              <Select
                value={selectedContent}
                onChange={(e) => {
                  setSelectedContent(e.target.value);
                  if (onContentSelect) onContentSelect(e.target.value);
                }}
                label="Select Content"
              >
                {contentItems.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    <Box>
                      <Typography variant="body1">{item.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.wordCount} words • {item.category}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      )}

      {/* Analytics Dashboard */}
      {currentAnalytics ? (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            {renderReadabilityCard()}
          </Grid>
          
          <Grid item xs={12} lg={6}>
            {renderMetricsCard()}
          </Grid>
          
          <Grid item xs={12}>
            {renderInsightsCard()}
          </Grid>
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <AnalyticsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No content selected for analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a content item to view detailed analytics and insights.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Helper functions for analytics generation

function generateContentAnalytics(contentItem: ContentItem): ContentAnalytics {
  const content = contentItem.content || contentItem.searchableContent || '';
  
  // Basic text analysis
  const words = content.split(/\s+/).filter(word => word.length > 0);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const paragraphCount = Math.max(paragraphs.length, 1);
  
  // Calculate readability metrics (simplified)
  const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const averageSyllablesPerWord = calculateAverageSyllables(words);
  
  // Flesch-Kincaid calculations
  const fleschKincaidGrade = Math.max(0, 
    0.39 * averageWordsPerSentence + 11.8 * averageSyllablesPerWord - 15.59
  );
  
  const fleschReadingEase = Math.max(0, Math.min(100,
    206.835 - 1.015 * averageWordsPerSentence - 84.6 * averageSyllablesPerWord
  ));
  
  const readingLevel = getReadingLevel(fleschReadingEase);
  const estimatedReadingTime = Math.ceil(wordCount / 200); // 200 WPM average
  
  // Content metrics
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const longestSentence = Math.max(...sentenceLengths, 0);
  const shortestSentence = Math.min(...sentenceLengths.filter(l => l > 0), 0);
  
  const vocabularyComplexity = calculateVocabularyComplexity(words);
  const passiveVoicePercentage = calculatePassiveVoiceUsage(sentences);
  
  // Generate insights
  const insights = generateInsights({
    fleschReadingEase,
    averageWordsPerSentence,
    vocabularyComplexity,
    passiveVoicePercentage,
    wordCount,
    paragraphCount,
  });
  
  const suggestions = generateSuggestions({
    fleschReadingEase,
    averageWordsPerSentence,
    vocabularyComplexity,
    passiveVoicePercentage,
  });

  return {
    id: `analytics_${contentItem.id}`,
    contentId: contentItem.id,
    contentTitle: contentItem.title,
    readability: {
      fleschKincaidGrade,
      fleschReadingEase,
      averageWordsPerSentence,
      averageSyllablesPerWord,
      readingLevel,
      estimatedReadingTime,
    },
    metrics: {
      wordCount,
      sentenceCount,
      paragraphCount,
      averageWordsPerParagraph: paragraphCount > 0 ? wordCount / paragraphCount : 0,
      longestSentence,
      shortestSentence,
      vocabularyComplexity,
      passiveVoicePercentage,
    },
    insights,
    suggestions,
    lastAnalyzed: new Date(),
  };
}

function calculateAverageSyllables(words: string[]): number {
  if (words.length === 0) return 0;
  
  const totalSyllables = words.reduce((sum, word) => {
    return sum + countSyllables(word);
  }, 0);
  
  return totalSyllables / words.length;
}

function countSyllables(word: string): number {
  // Simplified syllable counting
  const vowels = 'aeiouyAEIOUY';
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i] || '');
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Handle silent 'e'
  if (word.endsWith('e') && count > 1) {
    count--;
  }
  
  return Math.max(1, count);
}

function getReadingLevel(fleschScore: number): 'elementary' | 'middle_school' | 'high_school' | 'college' | 'graduate' {
  if (fleschScore >= 90) return 'elementary';
  if (fleschScore >= 80) return 'middle_school';
  if (fleschScore >= 70) return 'high_school';
  if (fleschScore >= 60) return 'college';
  return 'graduate';
}

function getReadabilityColor(fleschScore: number): 'success' | 'info' | 'warning' | 'error' {
  if (fleschScore >= 80) return 'success';
  if (fleschScore >= 70) return 'info';
  if (fleschScore >= 60) return 'warning';
  return 'error';
}

function getReadingLevelColor(level: string): 'success' | 'info' | 'warning' | 'error' | 'default' {
  switch (level) {
    case 'elementary': return 'success';
    case 'middle_school': return 'info';
    case 'high_school': return 'warning';
    case 'college': return 'error';
    case 'graduate': return 'default';
    default: return 'default';
  }
}

function calculateVocabularyComplexity(words: string[]): number {
  // Simplified complexity based on word length and common words
  const complexWords = words.filter(word => word.length > 6).length;
  return Math.min(100, Math.round((complexWords / words.length) * 100));
}

function calculatePassiveVoiceUsage(sentences: string[]): number {
  // Very simplified passive voice detection
  const passiveIndicators = ['was', 'were', 'been', 'being', 'is', 'are', 'am'];
  const passiveSentences = sentences.filter(sentence => {
    const words = sentence.toLowerCase().split(/\s+/);
    return passiveIndicators.some(indicator => words.includes(indicator)) &&
           words.some(word => word.endsWith('ed'));
  });
  
  return Math.round((passiveSentences.length / sentences.length) * 100);
}

function generateInsights(metrics: any): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  
  // Readability insights
  if (metrics.fleschReadingEase >= 80) {
    insights.push({
      type: 'good',
      category: 'readability',
      title: 'Excellent Readability',
      description: 'Content is easy to read and accessible to most audiences.',
      impact: 'low',
    });
  } else if (metrics.fleschReadingEase < 60) {
    insights.push({
      type: 'warning',
      category: 'readability',
      title: 'Complex Reading Level',
      description: 'Content may be difficult for some readers. Consider simplifying.',
      impact: 'high',
    });
  }
  
  // Sentence length insights
  if (metrics.averageWordsPerSentence > 25) {
    insights.push({
      type: 'warning',
      category: 'structure',
      title: 'Long Sentences',
      description: 'Average sentence length is quite long. Consider breaking up sentences.',
      impact: 'medium',
    });
  }
  
  // Vocabulary insights
  if (metrics.vocabularyComplexity > 50) {
    insights.push({
      type: 'info',
      category: 'vocabulary',
      title: 'Complex Vocabulary',
      description: 'Content uses sophisticated vocabulary. Ensure it matches your audience.',
      impact: 'medium',
    });
  }
  
  // Passive voice insights
  if (metrics.passiveVoicePercentage > 25) {
    insights.push({
      type: 'warning',
      category: 'engagement',
      title: 'High Passive Voice Usage',
      description: 'Consider using more active voice for better engagement.',
      impact: 'medium',
    });
  }
  
  return insights;
}

function generateSuggestions(metrics: any): string[] {
  const suggestions: string[] = [];
  
  if (metrics.fleschReadingEase < 70) {
    suggestions.push('Use shorter sentences to improve readability');
    suggestions.push('Replace complex words with simpler alternatives where possible');
  }
  
  if (metrics.averageWordsPerSentence > 20) {
    suggestions.push('Break long sentences into smaller, more digestible chunks');
  }
  
  if (metrics.passiveVoicePercentage > 20) {
    suggestions.push('Convert passive voice sentences to active voice for better engagement');
  }
  
  if (metrics.vocabularyComplexity > 60) {
    suggestions.push('Consider providing definitions for technical terms');
    suggestions.push('Use examples to clarify complex concepts');
  }
  
  return suggestions;
}