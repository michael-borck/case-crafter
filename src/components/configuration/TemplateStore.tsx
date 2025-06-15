// Template store component with categories and featured templates

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Avatar,
  Stack,
  Tab,
  Tabs,
  Skeleton,
  Rating,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingIcon,
  FiberNew as NewIcon,
  Recommend as RecommendIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { ConfigurationSchema } from '../../types/configuration';

interface StoreTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  schema: ConfigurationSchema;
  authorName: string;
  authorAvatar?: string;
  authorVerified: boolean;
  downloads: number;
  rating: number;
  reviewCount: number;
  isNew: boolean;
  isFeatured: boolean;
  isFree: boolean;
  price?: number;
  previewImages: string[];
  createdAt: string;
  updatedAt: string;
  framework?: string;
  difficulty?: string;
  estimatedTime?: number;
}

interface TemplateStoreProps {
  onTemplateSelect?: (template: StoreTemplate) => void;
  onTemplateDownload?: (template: StoreTemplate) => void;
}

const STORE_CATEGORIES = [
  { id: 'all', name: 'All Templates', count: 24 },
  { id: 'featured', name: 'Featured', count: 8 },
  { id: 'business', name: 'Business Analysis', count: 12 },
  { id: 'education', name: 'Educational', count: 6 },
  { id: 'research', name: 'Research & Academic', count: 4 },
  { id: 'industry', name: 'Industry Specific', count: 8 },
  { id: 'free', name: 'Free Templates', count: 18 },
];

const FEATURED_TEMPLATES: StoreTemplate[] = [
  {
    id: 'featured-porter',
    name: "Porter's Five Forces Pro",
    description: 'Professional-grade strategic analysis template with advanced competitive intelligence features',
    category: 'business',
    tags: ['strategy', 'business', 'competitive-analysis', 'professional'],
    schema: {} as ConfigurationSchema,
    authorName: 'Strategic Insights Ltd.',
    authorVerified: true,
    downloads: 2847,
    rating: 4.8,
    reviewCount: 156,
    isNew: false,
    isFeatured: true,
    isFree: false,
    price: 29.99,
    previewImages: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    framework: "Porter's Five Forces",
    difficulty: 'Advanced',
    estimatedTime: 90,
  },
  {
    id: 'featured-lean',
    name: 'Lean Startup Canvas',
    description: 'Complete lean startup methodology with integrated validation frameworks',
    category: 'business',
    tags: ['startup', 'lean', 'innovation', 'validation'],
    schema: {} as ConfigurationSchema,
    authorName: 'Innovation Hub',
    authorVerified: true,
    downloads: 1923,
    rating: 4.9,
    reviewCount: 89,
    isNew: true,
    isFeatured: true,
    isFree: true,
    previewImages: [],
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-22T00:00:00Z',
    framework: 'Lean Canvas',
    difficulty: 'Intermediate',
    estimatedTime: 60,
  },
  {
    id: 'featured-design',
    name: 'Design Thinking Workshop',
    description: 'Comprehensive design thinking framework for innovation and problem-solving',
    category: 'education',
    tags: ['design-thinking', 'innovation', 'workshop', 'education'],
    schema: {} as ConfigurationSchema,
    authorName: 'Dr. Sarah Chen',
    authorVerified: true,
    downloads: 1456,
    rating: 4.7,
    reviewCount: 67,
    isNew: false,
    isFeatured: true,
    isFree: false,
    price: 19.99,
    previewImages: [],
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
    framework: 'Design Thinking',
    difficulty: 'Advanced',
    estimatedTime: 120,
  },
];

const NEW_TEMPLATES: StoreTemplate[] = [
  {
    id: 'new-healthcare',
    name: 'Healthcare Innovation Framework',
    description: 'Specialized framework for healthcare case studies and innovation analysis',
    category: 'industry',
    tags: ['healthcare', 'innovation', 'industry-specific', 'analysis'],
    schema: {} as ConfigurationSchema,
    authorName: 'MedTech Solutions',
    authorVerified: false,
    downloads: 234,
    rating: 4.5,
    reviewCount: 12,
    isNew: true,
    isFeatured: false,
    isFree: true,
    previewImages: [],
    createdAt: '2024-01-25T00:00:00Z',
    updatedAt: '2024-01-25T00:00:00Z',
    framework: 'Healthcare Innovation',
    difficulty: 'Advanced',
    estimatedTime: 75,
  },
  {
    id: 'new-sustainability',
    name: 'ESG & Sustainability Assessment',
    description: 'Environmental, Social, and Governance framework for sustainable business analysis',
    category: 'business',
    tags: ['esg', 'sustainability', 'environment', 'governance'],
    schema: {} as ConfigurationSchema,
    authorName: 'Green Business Institute',
    authorVerified: true,
    downloads: 456,
    rating: 4.6,
    reviewCount: 23,
    isNew: true,
    isFeatured: false,
    isFree: false,
    price: 24.99,
    previewImages: [],
    createdAt: '2024-01-23T00:00:00Z',
    updatedAt: '2024-01-24T00:00:00Z',
    framework: 'ESG Framework',
    difficulty: 'Intermediate',
    estimatedTime: 90,
  },
];

const POPULAR_TEMPLATES: StoreTemplate[] = [
  {
    id: 'popular-swot',
    name: 'SWOT Analysis Plus',
    description: 'Enhanced SWOT framework with stakeholder analysis and action planning',
    category: 'business',
    tags: ['swot', 'analysis', 'strategy', 'planning'],
    schema: {} as ConfigurationSchema,
    authorName: 'Business Analytics Co.',
    authorVerified: true,
    downloads: 3421,
    rating: 4.4,
    reviewCount: 203,
    isNew: false,
    isFeatured: false,
    isFree: true,
    previewImages: [],
    createdAt: '2023-12-15T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    framework: 'SWOT Analysis',
    difficulty: 'Beginner',
    estimatedTime: 45,
  },
  {
    id: 'popular-value-prop',
    name: 'Value Proposition Canvas',
    description: 'Customer-focused value proposition design and validation framework',
    category: 'business',
    tags: ['value-proposition', 'customer', 'design', 'validation'],
    schema: {} as ConfigurationSchema,
    authorName: 'Customer First Labs',
    authorVerified: false,
    downloads: 2876,
    rating: 4.3,
    reviewCount: 145,
    isNew: false,
    isFeatured: false,
    isFree: true,
    previewImages: [],
    createdAt: '2023-11-20T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    framework: 'Value Proposition Canvas',
    difficulty: 'Intermediate',
    estimatedTime: 60,
  },
];

export const TemplateStore: React.FC<TemplateStoreProps> = ({
  onTemplateSelect,
  onTemplateDownload,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const tabs = ['Featured', 'New & Updated', 'Most Popular', 'Browse All'];

  const getCurrentTemplates = () => {
    switch (currentTab) {
      case 0: return FEATURED_TEMPLATES;
      case 1: return NEW_TEMPLATES;
      case 2: return POPULAR_TEMPLATES;
      case 3: return [...FEATURED_TEMPLATES, ...NEW_TEMPLATES, ...POPULAR_TEMPLATES];
      default: return FEATURED_TEMPLATES;
    }
  };

  const handleToggleFavorite = (templateId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(templateId)) {
        newFavorites.delete(templateId);
      } else {
        newFavorites.add(templateId);
      }
      return newFavorites;
    });
  };

  const handleDownload = (template: StoreTemplate) => {
    // Simulate download process
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onTemplateDownload?.(template);
    }, 1000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'success';
      case 'intermediate': return 'primary';
      case 'advanced': return 'warning';
      case 'expert': return 'error';
      default: return 'default';
    }
  };

  const formatDownloads = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const renderTemplateCard = (template: StoreTemplate) => (
    <Grid item xs={12} sm={6} md={4} key={template.id}>
      <Card 
        sx={{ 
          height: '100%',
          position: 'relative',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 6,
            transform: 'translateY(-4px)',
          },
          transition: 'all 0.3s ease-in-out'
        }}
        onClick={() => onTemplateSelect?.(template)}
      >
        {/* Status Badges */}
        <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
          <Stack direction="row" spacing={1}>
            {template.isFeatured && (
              <Chip 
                label="Featured" 
                size="small" 
                color="primary" 
                icon={<StarIcon />}
              />
            )}
            {template.isNew && (
              <Chip 
                label="New" 
                size="small" 
                color="success" 
                icon={<NewIcon />}
              />
            )}
            {template.isFree && (
              <Chip 
                label="Free" 
                size="small" 
                color="info" 
              />
            )}
          </Stack>
        </Box>

        {/* Favorite Button */}
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(template.id);
            }}
            sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.default' } }}
          >
            {favorites.has(template.id) ? (
              <StarIcon color="warning" />
            ) : (
              <StarBorderIcon />
            )}
          </IconButton>
        </Box>

        <CardContent sx={{ pt: 6 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
              {template.framework?.[0] || 'T'}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {template.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {template.authorName}
                </Typography>
                {template.authorVerified && (
                  <Tooltip title="Verified Author">
                    <VerifiedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  </Tooltip>
                )}
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
              minHeight: 60,
            }}
          >
            {template.description}
          </Typography>

          {/* Metadata */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {template.difficulty && (
              <Chip 
                label={template.difficulty} 
                size="small" 
                color={getDifficultyColor(template.difficulty) as any}
                variant="outlined"
              />
            )}
            {template.estimatedTime && (
              <Chip 
                label={`${template.estimatedTime}min`} 
                size="small" 
                variant="outlined"
              />
            )}
          </Box>

          {/* Rating and Stats */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Rating value={template.rating} precision={0.1} size="small" readOnly />
              <Typography variant="body2" color="text.secondary">
                ({template.reviewCount})
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {formatDownloads(template.downloads)} downloads
            </Typography>
          </Box>

          {/* Tags */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
            {template.tags.slice(0, 3).map((tag) => (
              <Chip 
                key={tag} 
                label={tag} 
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
            {template.tags.length > 3 && (
              <Chip 
                label={`+${template.tags.length - 3}`} 
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>

          {/* Price and Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              {template.isFree ? (
                <Typography variant="h6" color="success.main">
                  Free
                </Typography>
              ) : (
                <Typography variant="h6" color="primary.main">
                  ${template.price}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ViewIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onTemplateSelect?.(template);
                }}
              >
                Preview
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(template);
                }}
                disabled={loading}
              >
                {template.isFree ? 'Get' : 'Buy'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Template Store
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover and download professional configuration templates
        </Typography>
      </Box>

      {/* Categories */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Categories
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {STORE_CATEGORIES.map((category) => (
            <Chip
              key={category.id}
              label={`${category.name} (${category.count})`}
              variant={selectedCategory === category.id ? 'filled' : 'outlined'}
              color={selectedCategory === category.id ? 'primary' : 'default'}
              onClick={() => setSelectedCategory(category.id)}
              clickable
            />
          ))}
        </Stack>
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, value) => setCurrentTab(value)}>
          {tabs.map((tab, index) => (
            <Tab 
              key={tab} 
              label={tab}
              icon={
                index === 0 ? <StarIcon /> :
                index === 1 ? <NewIcon /> :
                index === 2 ? <TrendingIcon /> :
                <RecommendIcon />
              }
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* Templates Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="80%" height={32} />
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="rectangular" width="100%" height={60} sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Skeleton variant="rounded" width={60} height={24} />
                    <Skeleton variant="rounded" width={80} height={24} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton variant="text" width={50} height={32} />
                    <Skeleton variant="rounded" width={80} height={32} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {getCurrentTemplates().map(renderTemplateCard)}
        </Grid>
      )}

      {getCurrentTemplates().length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No templates found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try selecting a different category or tab
          </Typography>
        </Box>
      )}

      {/* Statistics */}
      <Box sx={{ mt: 6, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Store Statistics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                24
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Templates
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                18
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Free Templates
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                12.5k
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Downloads
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                4.6
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Rating
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};