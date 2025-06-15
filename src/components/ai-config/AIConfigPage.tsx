import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import { Settings as SettingsIcon, Psychology as ModelIcon, Tune as TuneIcon } from '@mui/icons-material';
import { useAIConfig } from '../../hooks/useAIConfig';
import { ProviderSettings } from './ProviderSettings';
import { ModelSelector } from './ModelSelector';
import { ParameterTuner } from './ParameterTuner';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ai-config-tabpanel-${index}`}
      aria-labelledby={`ai-config-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `ai-config-tab-${index}`,
    'aria-controls': `ai-config-tabpanel-${index}`,
  };
}

export const AIConfigPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { config, modelConfigs, isLoading, error, clearError } = useAIConfig();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom color="primary">
          AI Configuration
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Configure AI providers, models, and generation parameters for Case Crafter
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Paper elevation={2} sx={{ minHeight: '600px' }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="AI configuration tabs"
            variant="fullWidth"
          >
            <Tab 
              icon={<SettingsIcon />} 
              label="Provider Settings" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<ModelIcon />} 
              label="Model Selection" 
              {...a11yProps(1)} 
            />
            <Tab 
              icon={<TuneIcon />} 
              label="Parameter Tuning" 
              {...a11yProps(2)} 
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          <ProviderSettings 
            config={config}
            onConfigUpdate={() => {
              // The hook will automatically reload the config
            }}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <ModelSelector 
            config={config}
            modelConfigs={modelConfigs}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <ParameterTuner 
            config={config}
            modelConfigs={modelConfigs}
          />
        </TabPanel>
      </Paper>
    </Container>
  );
};