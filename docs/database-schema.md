# Case Crafter Database Schema

## Overview

The Case Crafter application uses SQLite as its local database to store case studies, user data, configurations, and analytics. This document outlines the database schema design and relationships.

## Core Tables

### Users (`users`)
Stores user account information for multi-user support:
- **Primary Key**: `id` (auto-increment)
- **Unique Fields**: `username`, `email`
- **Roles**: admin, instructor, user
- **Features**: Password hashing support, JSON preferences storage

### Domains (`domains`)
Categorizes case studies into subject areas:
- **Default Domains**: Business, Technology, Healthcare, Science
- **UI Support**: Color coding and icons for visual organization
- **Extensible**: New domains can be added dynamically

### Case Studies (`case_studies`)
Core content table storing generated case studies:
- **Content**: Markdown-formatted main content
- **Structure**: Background, problem statement, analysis framework
- **Metadata**: Tags, learning objectives, difficulty levels
- **Lifecycle**: Draft → Review → Published → Archived
- **Relationships**: Links to domains, templates, and creators

### Assessment Questions (`assessment_questions`)
Questions linked to case studies for evaluation:
- **Question Types**: Multiple choice, short answer, essay, analysis, reflection
- **Grading Support**: Rubrics, point values, sample answers
- **Ordering**: Configurable question sequence

## Supporting Tables

### Configuration Templates (`configuration_templates`)
Dynamic form configurations for case study generation:
- **JSON Schema**: Stores field definitions and validation rules
- **Domain-Specific**: Templates tailored to different subject areas
- **Version Control**: Template activation and default settings

### Generation History (`generation_history`)
Tracks AI generation processes and performance:
- **Provider Agnostic**: Supports multiple AI services (Ollama, OpenAI, etc.)
- **Performance Metrics**: Token usage, generation time, success rates
- **Audit Trail**: Complete record of generation attempts

### User Progress (`user_progress`)
Learning analytics and progress tracking:
- **Status Tracking**: Not started → In progress → Completed → Reviewed
- **Performance Data**: Time spent, scores, completion rates
- **Personalization**: User notes and feedback storage

### App Settings (`app_settings`)
Application configuration and user preferences:
- **Typed Values**: String, number, boolean, JSON data types
- **User Control**: Configurable vs. system-only settings
- **Defaults**: Pre-populated with sensible defaults

## Extended Features

### Attachments (`attachments`)
File management for case study resources:
- **File Metadata**: Size, type, original names
- **Storage**: Relative paths in app data directory
- **Relationships**: Links to specific case studies

### Collections (`collections`)
Playlists/groupings of related case studies:
- **Curation**: User-created collections of case studies
- **Sharing**: Public/private collection visibility
- **Ordering**: Configurable sequence within collections

## Performance Optimizations

### Indexes
Strategic indexes on frequently queried columns:
- Domain and status filtering on case studies
- User progress lookups
- Assessment question relationships
- Timestamp-based queries

### Views
Pre-computed views for common queries:
- **Case Study Summary**: Aggregated case study information with domain and author details
- **User Progress Summary**: Analytics dashboard data for user performance

### Triggers
Automatic timestamp maintenance:
- `updated_at` field updates on record modifications
- Consistent audit trail across all tables

## Data Relationships

```
users 1:n case_studies
users 1:n user_progress  
users 1:n collections
domains 1:n case_studies
case_studies 1:n assessment_questions
case_studies 1:n attachments
case_studies 1:n user_progress
case_studies n:m collections (via collection_case_studies)
configuration_templates 1:n case_studies
```

## Security Considerations

- Foreign key constraints enforced
- Check constraints on enumerated values
- Password hashing support for future authentication
- Role-based access control framework
- Audit trails for sensitive operations

## Future Extensions

The schema is designed to support:
- Collaborative editing and sharing
- Advanced analytics and reporting  
- Integration with external learning management systems
- Multi-tenant deployments
- Content versioning and revision history