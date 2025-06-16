import { useState } from "react";
import "./App.css";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  Box,
  IconButton,
  Avatar,
  Stack,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Lightbulb as LightbulbIcon,
  DarkMode as DarkModeIcon,
  Psychology as PsychologyIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  QuestionAnswer as QuestionIcon,
  Build as ConfigIcon,
  Folder as TemplateIcon,
  Store as StoreIcon,
  Construction as BuilderIcon,
  AutoAwesome as GeneratorIcon,
  AccountTree as ConditionalIcon,
  LibraryBooks as LibraryIcon,
  History as HistoryIcon,
  Quiz as AssessmentIcon,
  Analytics as AnalysisIcon,
} from "@mui/icons-material";
import { useTheme } from "./theme/ThemeProvider";
import { AIConfigPage } from "./components/ai-config/AIConfigPage";
import { FormDemo } from "./components/forms/FormDemo";
import { ValidationDemo } from "./components/forms/ValidationDemo";
import { ConditionalLogicDemo } from "./components/forms/ConditionalLogicDemo";
import { CaseStudyWizard } from "./components/generation/CaseStudyWizard";
import { TemplateManager, TemplateStore, TemplateBuilder } from "./components/configuration";
import { ContentLibrary } from "./components/content";
import { ContentLibrarySimple } from "./components/content/ContentLibrarySimple";
import { QuestionGenerator } from "./components/assessment";
import { ContentAnalytics } from "./components/analytics";

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 72;

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'ai-config' | 'case-studies' | 'questions' | 'question-generator' | 'analytics' | 'configuration' | 'validation' | 'conditional' | 'generator' | 'templates' | 'template-store' | 'template-builder' | 'categories' | 'revisions'>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { mode, toggleTheme } = useTheme();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'ai-config':
        return <AIConfigPage />;
      case 'configuration':
        return <FormDemo />;
      case 'validation':
        return <ValidationDemo />;
      case 'conditional':
        return <ConditionalLogicDemo />;
      case 'generator':
        return <CaseStudyWizard />;
      case 'templates':
        return <TemplateManager />;
      case 'template-store':
        return <TemplateStore />;
      case 'template-builder':
        return <TemplateBuilder />;
      case 'case-studies':
        return <ContentLibrary />;
      case 'categories':
        return <div>Category Manager - Temporarily disabled due to import issues</div>;
      case 'revisions':
        return <div>Revision History - Temporarily disabled due to import issues</div>;
      case 'question-generator':
        return <QuestionGenerator />;
      case 'analytics':
        return <ContentAnalytics />;
      case 'home':
      default:
        return renderHomePage();
    }
  };

  const quickLinks = [
    {
      title: 'Create Case Study',
      description: 'Generate a new case study using AI and business frameworks',
      icon: <GeneratorIcon sx={{ fontSize: 40 }} />,
      action: () => setCurrentPage('generator'),
      color: 'primary.main',
    },
    {
      title: 'Browse Templates',
      description: 'Explore and customize pre-built case study templates',
      icon: <TemplateIcon sx={{ fontSize: 40 }} />,
      action: () => setCurrentPage('templates'),
      color: 'secondary.main',
    },
    {
      title: 'AI Configuration',
      description: 'Configure AI providers and model settings',
      icon: <SettingsIcon sx={{ fontSize: 40 }} />,
      action: () => setCurrentPage('ai-config'),
      color: 'success.main',
    },
    {
      title: 'Content Library',
      description: 'Search and browse case studies, templates, and assessments',
      icon: <LibraryIcon sx={{ fontSize: 40 }} />,
      action: () => setCurrentPage('case-studies'),
      color: 'info.main',
    },
    {
      title: 'Generate Questions',
      description: 'Create intelligent assessment questions from your content',
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      action: () => setCurrentPage('question-generator'),
      color: 'warning.main',
    },
  ];

  const renderHomePage = () => (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={4}>
        {/* Welcome Section */}
        <Card elevation={2}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h2" component="h1" gutterBottom color="primary" sx={{ fontWeight: 700 }}>
              Welcome to Case Crafter
            </Typography>
            <Typography variant="h5" color="text.secondary" paragraph sx={{ fontWeight: 300 }}>
              Intelligent case study generator for educational purposes
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
              Generate realistic business case studies, assessment questions, and learning materials 
              tailored to specific domains and educational objectives using AI-powered content generation.
            </Typography>
          </CardContent>
        </Card>

        {/* Quick Links Section */}
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Quick Actions
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(auto-fit, minmax(250px, 1fr))' },
              gap: 3,
            }}
          >
            {quickLinks.map((link, index) => (
              <Card
                key={index}
                elevation={2}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    elevation: 6,
                    transform: 'translateY(-4px)',
                  },
                }}
                onClick={link.action}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box
                    sx={{
                      color: link.color,
                      mb: 2,
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    {link.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {link.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    {link.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Features Overview */}
        <Card elevation={2}>
          <CardContent sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Key Features
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 4,
              }}
            >
              <Box>
                <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
                  AI-Powered Generation
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Leverage multiple AI providers including OpenAI, Anthropic, and local models through Ollama 
                  to generate high-quality, contextually relevant case studies.
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
                  Business Frameworks
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Integrate proven business frameworks like SWOT, Porter's Five Forces, and Business Model Canvas 
                  to structure your case studies professionally.
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
                  Template System
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Create, share, and customize templates for different industries and educational levels. 
                  Build a library of reusable content structures.
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
                  Offline-First Design
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Work without internet connectivity using local AI models and encrypted local storage. 
                  Your data stays private and accessible anywhere.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card elevation={2}>
          <CardContent sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Getting Started
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Typography variant="h6" color="primary" sx={{ mr: 2, minWidth: 24 }}>
                  1.
                </Typography>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Configure your AI provider
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Set up your preferred AI service (OpenAI, Anthropic, or local Ollama) in the AI Configuration section.
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Typography variant="h6" color="primary" sx={{ mr: 2, minWidth: 24 }}>
                  2.
                </Typography>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Choose a template or start from scratch
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Browse the template library or use the Case Study Generator to create custom content.
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Typography variant="h6" color="primary" sx={{ mr: 2, minWidth: 24 }}>
                  3.
                </Typography>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Generate and refine your content
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use AI assistance to create comprehensive case studies with assessments and learning objectives.
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const navigationItems = [
    { id: 'home', label: 'Home', icon: <HomeIcon />, category: 'main' },
    { id: 'generator', label: 'Case Study Generator', icon: <GeneratorIcon />, category: 'content' },
    { id: 'case-studies', label: 'Content Library', icon: <LibraryIcon />, category: 'content' },
    { id: 'categories', label: 'Categories & Tags', icon: <ConfigIcon />, category: 'content' },
    { id: 'question-generator', label: 'Question Generator', icon: <AssessmentIcon />, category: 'assessment' },
    { id: 'analytics', label: 'Content Analytics', icon: <AnalysisIcon />, category: 'assessment' },
    { id: 'templates', label: 'Template Manager', icon: <TemplateIcon />, category: 'templates' },
    { id: 'template-store', label: 'Template Store', icon: <StoreIcon />, category: 'templates' },
    { id: 'template-builder', label: 'Template Builder', icon: <BuilderIcon />, category: 'templates' },
    { id: 'configuration', label: 'Dynamic Forms Demo', icon: <ConfigIcon />, category: 'development' },
    { id: 'validation', label: 'Validation Demo', icon: <QuestionIcon />, category: 'development' },
    { id: 'conditional', label: 'Conditional Logic Demo', icon: <ConditionalIcon />, category: 'development' },
    { id: 'ai-config', label: 'AI Configuration', icon: <SettingsIcon />, category: 'settings' },
  ];

  const renderNavItem = (item: any) => {
    const isActive = currentPage === item.id;
    
    const button = (
      <ListItemButton
        key={item.id}
        onClick={() => setCurrentPage(item.id as any)}
        selected={isActive}
        sx={{
          minHeight: 48,
          justifyContent: sidebarCollapsed ? 'center' : 'initial',
          px: 2.5,
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: sidebarCollapsed ? 0 : 3,
            justifyContent: 'center',
          }}
        >
          {item.icon}
        </ListItemIcon>
        {!sidebarCollapsed && <ListItemText primary={item.label} />}
      </ListItemButton>
    );

    return sidebarCollapsed ? (
      <Tooltip key={item.id} title={item.label} placement="right">
        {button}
      </Tooltip>
    ) : button;
  };

  const renderNavCategory = (categoryLabel: string, items: any[]) => {
    if (sidebarCollapsed) {
      return items.map(renderNavItem);
    }

    return (
      <Box key={categoryLabel}>
        <Typography
          variant="overline"
          sx={{
            px: 2.5,
            py: 1,
            display: 'block',
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {categoryLabel}
        </Typography>
        {items.map(renderNavItem)}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Persistent Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            boxSizing: 'border-box',
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
          },
        }}
      >
        {/* Sidebar Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            px: sidebarCollapsed ? 1 : 2,
            py: 2,
            minHeight: 64,
          }}
        >
          {!sidebarCollapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ mr: 1, bgcolor: 'primary.main', width: 32, height: 32 }}>
                <PsychologyIcon fontSize="small" />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                Case Crafter
              </Typography>
            </Box>
          )}
          {sidebarCollapsed && (
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <PsychologyIcon fontSize="small" />
            </Avatar>
          )}
          <IconButton
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            size="small"
          >
            {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Box>

        <Divider />

        {/* Navigation */}
        <List sx={{ flexGrow: 1, py: 1 }}>
          {renderNavCategory('Main', navigationItems.filter(item => item.category === 'main'))}
          <Divider sx={{ my: 1 }} />
          {renderNavCategory('Content', navigationItems.filter(item => item.category === 'content'))}
          <Divider sx={{ my: 1 }} />
          {renderNavCategory('Assessment', navigationItems.filter(item => item.category === 'assessment'))}
          <Divider sx={{ my: 1 }} />
          {renderNavCategory('Templates', navigationItems.filter(item => item.category === 'templates'))}
          <Divider sx={{ my: 1 }} />
          {renderNavCategory('Development', navigationItems.filter(item => item.category === 'development'))}
          <Divider sx={{ my: 1 }} />
          {renderNavCategory('Settings', navigationItems.filter(item => item.category === 'settings'))}
        </List>
      </Drawer>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <AppBar 
          position="static" 
          elevation={1}
          sx={{ 
            zIndex: (theme) => theme.zIndex.drawer - 1,
          }}
        >
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              {navigationItems.find(item => item.id === currentPage)?.label || 'Case Crafter'}
            </Typography>
            <IconButton color="inherit" onClick={toggleTheme}>
              {mode === 'light' ? <DarkModeIcon /> : <LightbulbIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {renderCurrentPage()}
        </Box>
      </Box>
    </Box>
  );
}

export default App;