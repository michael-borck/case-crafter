// Business framework selector and integration component

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Stack,
  Alert,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

export interface BusinessFramework {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  estimatedMinutes: number;
  keyQuestions: string[];
  outputSections: string[];
  requiredFields: FrameworkField[];
  icon: string;
  color: string;
  useCases: string[];
  learningObjectives: string[];
}

export interface FrameworkField {
  id: string;
  label: string;
  type: string;
  description: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
}

interface FrameworkSelectorProps {
  onFrameworkSelect: (framework: BusinessFramework) => void;
  selectedFramework?: BusinessFramework | undefined;
}

// Predefined business frameworks
const BUSINESS_FRAMEWORKS: BusinessFramework[] = [
  {
    id: 'porters-five-forces',
    name: "Porter's Five Forces",
    description: 'Analyze competitive forces that shape strategy and determine profitability',
    category: 'Strategy',
    complexity: 'Intermediate',
    estimatedMinutes: 45,
    keyQuestions: [
      'How intense is competitive rivalry in the industry?',
      'What is the threat of new entrants?',
      'How much bargaining power do suppliers have?',
      'How much bargaining power do buyers have?',
      'What is the threat of substitute products?'
    ],
    outputSections: [
      'Industry Overview',
      'Competitive Rivalry Analysis',
      'Threat of New Entrants',
      'Supplier Bargaining Power',
      'Buyer Bargaining Power',
      'Threat of Substitutes',
      'Strategic Implications',
      'Recommendations'
    ],
    requiredFields: [
      {
        id: 'company_name',
        label: 'Company Name',
        type: 'text',
        description: 'Name of the company being analyzed',
        required: true,
        placeholder: 'e.g., Apple Inc.'
      },
      {
        id: 'industry',
        label: 'Industry',
        type: 'select',
        description: 'Primary industry sector',
        required: true,
        options: ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Energy', 'Other']
      },
      {
        id: 'market_position',
        label: 'Market Position',
        type: 'select',
        description: 'Company\'s position in the market',
        required: true,
        options: ['Market Leader', 'Strong Competitor', 'Niche Player', 'Challenger', 'Follower']
      },
      {
        id: 'geographical_scope',
        label: 'Geographical Scope',
        type: 'multiselect',
        description: 'Markets where the company operates',
        required: true,
        options: ['Local', 'Regional', 'National', 'International', 'Global']
      }
    ],
    icon: '🏢',
    color: '#1976d2',
    useCases: [
      'Industry attractiveness assessment',
      'Competitive strategy formulation',
      'Market entry decisions',
      'Investment analysis'
    ],
    learningObjectives: [
      'Understand competitive dynamics',
      'Identify strategic opportunities and threats',
      'Develop competitive positioning strategies'
    ]
  },
  {
    id: 'swot-analysis',
    name: 'SWOT Analysis',
    description: 'Evaluate Strengths, Weaknesses, Opportunities, and Threats',
    category: 'Strategy',
    complexity: 'Beginner',
    estimatedMinutes: 30,
    keyQuestions: [
      'What are the organization\'s key strengths?',
      'What weaknesses need to be addressed?',
      'What opportunities exist in the environment?',
      'What threats could impact the organization?'
    ],
    outputSections: [
      'Executive Summary',
      'Strengths Analysis',
      'Weaknesses Analysis',
      'Opportunities Analysis',
      'Threats Analysis',
      'SWOT Matrix',
      'Strategic Recommendations',
      'Action Plan'
    ],
    requiredFields: [
      {
        id: 'organization_name',
        label: 'Organization Name',
        type: 'text',
        description: 'Name of the organization being analyzed',
        required: true,
        placeholder: 'e.g., Tesla Inc.'
      },
      {
        id: 'analysis_scope',
        label: 'Analysis Scope',
        type: 'select',
        description: 'Scope of the SWOT analysis',
        required: true,
        options: ['Entire Organization', 'Business Unit', 'Product Line', 'Project', 'Department']
      },
      {
        id: 'time_frame',
        label: 'Time Frame',
        type: 'select',
        description: 'Time horizon for the analysis',
        required: true,
        options: ['Current State', '1 Year', '3 Years', '5 Years', '10+ Years']
      },
      {
        id: 'stakeholder_perspective',
        label: 'Stakeholder Perspective',
        type: 'multiselect',
        description: 'Key stakeholder groups to consider',
        required: true,
        options: ['Customers', 'Employees', 'Shareholders', 'Suppliers', 'Community', 'Regulators']
      }
    ],
    icon: '⚖️',
    color: '#388e3c',
    useCases: [
      'Strategic planning sessions',
      'Business plan development',
      'Performance evaluation',
      'Change management initiatives'
    ],
    learningObjectives: [
      'Conduct internal and external analysis',
      'Identify strategic factors',
      'Develop strategic alternatives'
    ]
  },
  {
    id: 'lean-canvas',
    name: 'Lean Canvas',
    description: 'Business model design for startups and new ventures',
    category: 'Innovation',
    complexity: 'Intermediate',
    estimatedMinutes: 60,
    keyQuestions: [
      'What problem are you solving?',
      'Who are your target customers?',
      'What is your unique value proposition?',
      'How will you reach customers?',
      'What are your revenue streams?'
    ],
    outputSections: [
      'Problem Statement',
      'Customer Segments',
      'Unique Value Proposition',
      'Solution Overview',
      'Channels Strategy',
      'Revenue Streams',
      'Cost Structure',
      'Key Metrics',
      'Unfair Advantage',
      'Business Model Summary'
    ],
    requiredFields: [
      {
        id: 'venture_name',
        label: 'Venture Name',
        type: 'text',
        description: 'Name of the startup or new venture',
        required: true,
        placeholder: 'e.g., EcoDelivery'
      },
      {
        id: 'stage',
        label: 'Venture Stage',
        type: 'select',
        description: 'Current stage of the venture',
        required: true,
        options: ['Idea', 'Prototype', 'MVP', 'Early Stage', 'Growth', 'Established']
      },
      {
        id: 'target_market',
        label: 'Target Market',
        type: 'text',
        description: 'Primary target market',
        required: true,
        placeholder: 'e.g., Urban millennials'
      },
      {
        id: 'funding_status',
        label: 'Funding Status',
        type: 'select',
        description: 'Current funding situation',
        required: false,
        options: ['Bootstrapped', 'Seeking Investment', 'Angel Funded', 'VC Funded', 'Series A+']
      }
    ],
    icon: '🚀',
    color: '#f57c00',
    useCases: [
      'Startup business planning',
      'New product development',
      'Innovation workshops',
      'Entrepreneurship education'
    ],
    learningObjectives: [
      'Design lean business models',
      'Validate business assumptions',
      'Identify key success metrics'
    ]
  },
  {
    id: 'design-thinking',
    name: 'Design Thinking',
    description: 'Human-centered approach to innovation and problem-solving',
    category: 'Innovation',
    complexity: 'Advanced',
    estimatedMinutes: 90,
    keyQuestions: [
      'Who are the users and what are their needs?',
      'What is the core problem to be solved?',
      'How might we generate creative solutions?',
      'What prototypes can we build and test?',
      'How do we implement and scale solutions?'
    ],
    outputSections: [
      'Empathy Research Summary',
      'Problem Definition',
      'User Personas',
      'Ideation Process',
      'Solution Concepts',
      'Prototype Development',
      'Testing Results',
      'Implementation Plan',
      'Lessons Learned'
    ],
    requiredFields: [
      {
        id: 'challenge_name',
        label: 'Challenge Name',
        type: 'text',
        description: 'Name of the design challenge',
        required: true,
        placeholder: 'e.g., Improving Patient Experience'
      },
      {
        id: 'user_group',
        label: 'Primary User Group',
        type: 'text',
        description: 'Main users affected by the challenge',
        required: true,
        placeholder: 'e.g., Hospital patients'
      },
      {
        id: 'context',
        label: 'Context/Setting',
        type: 'text',
        description: 'Where does the challenge occur?',
        required: true,
        placeholder: 'e.g., Emergency department'
      },
      {
        id: 'constraints',
        label: 'Key Constraints',
        type: 'multiselect',
        description: 'Major limitations to consider',
        required: false,
        options: ['Budget', 'Time', 'Technology', 'Regulations', 'Resources', 'Stakeholder Buy-in']
      }
    ],
    icon: '🎨',
    color: '#9c27b0',
    useCases: [
      'Product innovation',
      'Service design',
      'Organizational change',
      'Social innovation'
    ],
    learningObjectives: [
      'Apply human-centered design methods',
      'Develop empathy for users',
      'Generate innovative solutions'
    ]
  }
];

const getFrameworkIcon = (category: string) => {
  switch (category) {
    case 'Strategy': return <BusinessIcon />;
    case 'Innovation': return <PsychologyIcon />;
    case 'Operations': return <BuildIcon />;
    case 'Analysis': return <AssessmentIcon />;
    default: return <TrendingUpIcon />;
  }
};

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  onFrameworkSelect,
  selectedFramework
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState<BusinessFramework | null>(null);

  const handleFrameworkClick = (framework: BusinessFramework) => {
    onFrameworkSelect(framework);
  };

  const handleDetailsOpen = (framework: BusinessFramework) => {
    setSelectedForDetails(framework);
    setDetailsOpen(true);
  };

  const categories = [...new Set(BUSINESS_FRAMEWORKS.map(f => f.category))];

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Beginner': return 'success';
      case 'Intermediate': return 'primary';
      case 'Advanced': return 'warning';
      case 'Expert': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Select Business Framework
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Choose a business framework to structure your case study. Each framework provides
        specific guidance, questions, and templates for analysis.
      </Typography>

      {selectedFramework && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <strong>Selected:</strong> {selectedFramework.name} - {selectedFramework.description}
        </Alert>
      )}

      {categories.map(category => (
        <Box key={category} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getFrameworkIcon(category)}
            {category} Frameworks
          </Typography>
          
          <Grid container spacing={3}>
            {BUSINESS_FRAMEWORKS
              .filter(framework => framework.category === category)
              .map(framework => (
                <Grid item xs={12} md={6} lg={4} key={framework.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      border: selectedFramework?.id === framework.id ? 2 : 1,
                      borderColor: selectedFramework?.id === framework.id ? 'primary.main' : 'divider',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => handleFrameworkClick(framework)}
                  >
                    <CardContent>
                      {/* Header */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: framework.color,
                            width: 48,
                            height: 48,
                            mr: 2,
                            fontSize: '1.5rem'
                          }}
                        >
                          {framework.icon}
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="h6" noWrap>
                            {framework.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={framework.complexity}
                              size="small"
                              color={getComplexityColor(framework.complexity) as any}
                              variant="outlined"
                            />
                            <Chip
                              label={`${framework.estimatedMinutes} min`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </Box>

                      {/* Description */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {framework.description}
                      </Typography>

                      {/* Key Questions Preview */}
                      <Typography variant="subtitle2" gutterBottom>
                        Key Questions:
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        • {framework.keyQuestions[0]}
                        {framework.keyQuestions.length > 1 && (
                          <span style={{ fontStyle: 'italic' }}>
                            {' '}+{framework.keyQuestions.length - 1} more
                          </span>
                        )}
                      </Typography>

                      {/* Actions */}
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDetailsOpen(framework);
                          }}
                        >
                          View Details
                        </Button>
                        <Button
                          size="small"
                          variant={selectedFramework?.id === framework.id ? 'contained' : 'outlined'}
                          color="primary"
                        >
                          {selectedFramework?.id === framework.id ? 'Selected' : 'Select'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Box>
      ))}

      {/* Framework Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedForDetails && (
              <>
                <Avatar sx={{ bgcolor: selectedForDetails.color }}>
                  {selectedForDetails.icon}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedForDetails.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedForDetails.category} • {selectedForDetails.complexity} • {selectedForDetails.estimatedMinutes} minutes
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedForDetails && (
            <Stack spacing={3}>
              <Typography variant="body1">
                {selectedForDetails.description}
              </Typography>

              {/* Learning Objectives */}
              <Box>
                <Typography variant="h6" gutterBottom>Learning Objectives</Typography>
                <List dense>
                  {selectedForDetails.learningObjectives.map((objective, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Typography variant="body2">•</Typography>
                      </ListItemIcon>
                      <ListItemText primary={objective} />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Key Questions */}
              <Box>
                <Typography variant="h6" gutterBottom>Key Questions</Typography>
                <List dense>
                  {selectedForDetails.keyQuestions.map((question, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Typography variant="body2" color="primary">{index + 1}.</Typography>
                      </ListItemIcon>
                      <ListItemText primary={question} />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Output Sections */}
              <Box>
                <Typography variant="h6" gutterBottom>Case Study Sections</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedForDetails.outputSections.map((section, index) => (
                    <Chip key={index} label={section} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>

              {/* Use Cases */}
              <Box>
                <Typography variant="h6" gutterBottom>Common Use Cases</Typography>
                <List dense>
                  {selectedForDetails.useCases.map((useCase, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Typography variant="body2">•</Typography>
                      </ListItemIcon>
                      <ListItemText primary={useCase} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Stack>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          {selectedForDetails && (
            <Button
              variant="contained"
              onClick={() => {
                handleFrameworkClick(selectedForDetails);
                setDetailsOpen(false);
              }}
            >
              Select Framework
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};