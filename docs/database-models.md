# Database Models Documentation

## Overview

This document describes the Rust models used in the Case Crafter application for database interactions. All models are built using SQLx with proper serialization, validation, and type safety.

## Model Architecture

### Design Principles

1. **Type Safety**: Strong typing with Rust enums for constrained values
2. **Serialization**: All models implement Serde for JSON conversion
3. **Validation**: Comprehensive validation using custom validator
4. **Repository Pattern**: Separate data access layer for clean architecture
5. **Immutability**: Update models separate from entity models

### Model Categories

- **Entity Models**: Direct database table representations
- **New Models**: Data transfer objects for creation
- **Update Models**: Data transfer objects for updates
- **View Models**: Aggregated data from database views
- **Enums**: Type-safe enumeration values

## Core Entity Models

### User (`User`)

Represents users in the multi-user system:

```rust
pub struct User {
    pub id: i64,
    pub username: String,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub password_hash: Option<String>,
    pub role: String,
    pub preferences: Option<String>, // JSON
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**Features:**
- Unique username and email constraints
- Role-based access control (admin, instructor, user)
- JSON preferences for customization
- Password hashing support for authentication
- Automatic timestamp management

**Related Models:**
- `NewUser`: For user creation
- `UpdateUser`: For user modifications

### Domain (`Domain`)

Categorizes case studies into subject areas:

```rust
pub struct Domain {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>, // Hex color for UI
    pub icon: Option<String>,  // Icon identifier
    pub created_at: DateTime<Utc>,
}
```

**Built-in Domains:**
- Business (strategy, management, operations)
- Technology (software, IT systems, digital transformation)
- Healthcare (medical procedures, patient care, systems)
- Science (research, experiments, analysis)

### CaseStudy (`CaseStudy`)

Main content entity storing generated case studies:

```rust
pub struct CaseStudy {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub domain_id: i64,
    pub template_id: Option<i64>,
    pub difficulty_level: Option<String>,
    pub estimated_duration: Option<i64>, // minutes
    pub learning_objectives: Option<String>, // JSON array
    pub tags: Option<String>, // JSON array
    pub content: String, // Markdown content
    pub background_info: Option<String>,
    pub problem_statement: Option<String>,
    pub analysis_framework: Option<String>,
    pub sample_solution: Option<String>,
    pub metadata: Option<String>, // JSON
    pub status: String,
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
}
```

**Lifecycle States:**
- Draft → Review → Published → Archived

**Content Structure:**
- Markdown-formatted main content
- Structured sections (background, problem, analysis, solution)
- Metadata for search and categorization

### AssessmentQuestion (`AssessmentQuestion`)

Questions linked to case studies for evaluation:

```rust
pub struct AssessmentQuestion {
    pub id: i64,
    pub case_study_id: i64,
    pub question_text: String,
    pub question_type: String,
    pub options: Option<String>, // JSON for multiple choice
    pub correct_answer: Option<String>,
    pub sample_answer: Option<String>,
    pub rubric: Option<String>, // JSON rubric
    pub points: i64,
    pub order_index: i64,
    pub is_required: bool,
    pub created_at: DateTime<Utc>,
}
```

**Question Types:**
- Multiple Choice: Structured options with correct answers
- Short Answer: Brief text responses
- Essay: Extended written responses
- Analysis: Detailed case analysis
- Reflection: Personal reflection and insights

### UserProgress (`UserProgress`)

Tracks learning analytics and user progress:

```rust
pub struct UserProgress {
    pub id: i64,
    pub user_id: i64,
    pub case_study_id: i64,
    pub status: String,
    pub time_spent: i64, // seconds
    pub answers: Option<String>, // JSON of user answers
    pub score: Option<f64>, // percentage
    pub feedback: Option<String>,
    pub notes: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub last_accessed: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}
```

**Progress Tracking:**
- Time spent on each case study
- Completion status and scores
- User notes and instructor feedback
- Analytics for learning insights

## Supporting Models

### ConfigurationTemplate (`ConfigurationTemplate`)

Dynamic form configurations for case study generation:

```rust
pub struct ConfigurationTemplate {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub domain_id: Option<i64>,
    pub template_data: String, // JSON schema
    pub is_default: bool,
    pub is_active: bool,
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### GenerationHistory (`GenerationHistory`)

AI generation audit trail:

```rust
pub struct GenerationHistory {
    pub id: i64,
    pub case_study_id: Option<i64>,
    pub generation_type: String,
    pub prompt_template: Option<String>,
    pub user_input: Option<String>, // JSON
    pub ai_provider: Option<String>,
    pub model_name: Option<String>,
    pub prompt_tokens: Option<i64>,
    pub completion_tokens: Option<i64>,
    pub generation_time_ms: Option<i64>,
    pub success: bool,
    pub error_message: Option<String>,
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
}
```

### AppSetting (`AppSetting`)

Application configuration and user preferences:

```rust
pub struct AppSetting {
    pub id: i64,
    pub key: String,
    pub value: String,
    pub data_type: String,
    pub description: Option<String>,
    pub is_user_configurable: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### Collection (`Collection`) and Attachment (`Attachment`)

Content organization and file management models for grouping case studies and managing file attachments.

## View Models

### CaseStudySummary

Aggregated case study data with joined information:

```rust
pub struct CaseStudySummary {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub difficulty_level: Option<String>,
    pub estimated_duration: Option<i64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub domain_name: String,
    pub domain_color: Option<String>,
    pub author: String,
    pub question_count: i64,
}
```

### UserProgressSummary

User analytics with aggregated statistics:

```rust
pub struct UserProgressSummary {
    pub user_id: i64,
    pub username: String,
    pub completed_count: i64,
    pub in_progress_count: i64,
    pub total_attempted: i64,
    pub average_score: Option<f64>,
    pub total_time_spent: i64,
}
```

## Type-Safe Enums

### UserRole
```rust
pub enum UserRole {
    Admin,      // "admin"
    Instructor, // "instructor"
    User,       // "user"
}
```

### DifficultyLevel
```rust
pub enum DifficultyLevel {
    Beginner,     // "beginner"
    Intermediate, // "intermediate"
    Advanced,     // "advanced"
}
```

### CaseStudyStatus
```rust
pub enum CaseStudyStatus {
    Draft,     // "draft"
    Review,    // "review"
    Published, // "published"
    Archived,  // "archived"
}
```

### QuestionType
```rust
pub enum QuestionType {
    MultipleChoice, // "multiple_choice"
    ShortAnswer,    // "short_answer"
    Essay,          // "essay"
    Analysis,       // "analysis"
    Reflection,     // "reflection"
}
```

### ProgressStatus
```rust
pub enum ProgressStatus {
    NotStarted,  // "not_started"
    InProgress,  // "in_progress"
    Completed,   // "completed"
    Reviewed,    // "reviewed"
}
```

## Validation System

### Validation Rules

The validation system enforces:

- **Username**: 3-50 characters, alphanumeric and underscore only
- **Email**: Basic format validation (optional fields)
- **Titles**: 5-200 characters
- **Content**: 50-50,000 characters
- **JSON Fields**: Valid JSON format
- **Enums**: Constrained to valid values
- **Numbers**: Positive values for durations and points

### Validation Usage

```rust
use case_crafter::database::{NewUser, Validatable, ValidationError};

let user = NewUser {
    username: "test_user".to_string(),
    email: Some("test@example.com".to_string()),
    // ... other fields
};

match user.validate() {
    Ok(()) => println!("User data is valid"),
    Err(ValidationError::RequiredField { field }) => {
        println!("Missing required field: {}", field);
    }
    Err(ValidationError::TooShort { field, min }) => {
        println!("Field '{}' is too short (minimum {} characters)", field, min);
    }
    // Handle other validation errors...
}
```

## Repository Pattern

### Repository Benefits

1. **Separation of Concerns**: Business logic separate from data access
2. **Testability**: Easy to mock for unit testing
3. **Query Optimization**: Centralized query management
4. **Type Safety**: Compile-time query validation with SQLx

### Repository Usage

```rust
use case_crafter::database::{UserRepository, NewUser};

let user_repo = UserRepository::new(pool);

// Create user
let new_user = NewUser {
    username: "john_doe".to_string(),
    email: Some("john@example.com".to_string()),
    role: Some("user".to_string()),
    // ... other fields
};

let user = user_repo.create(new_user).await?;

// Find by ID
let user = user_repo.find_by_id(1).await?;

// List all users
let users = user_repo.list_all().await?;
```

## JSON Field Handling

### Learning Objectives Example
```json
[
  "Understand business strategy fundamentals",
  "Analyze competitive positioning",
  "Evaluate strategic options"
]
```

### Tags Example
```json
[
  "business",
  "strategy", 
  "competition",
  "analysis"
]
```

### Assessment Rubric Example
```json
{
  "criteria": [
    {
      "name": "Analysis Depth",
      "weight": 40,
      "levels": [
        {"score": 4, "description": "Comprehensive analysis"},
        {"score": 3, "description": "Good analysis"},
        {"score": 2, "description": "Basic analysis"},
        {"score": 1, "description": "Superficial analysis"}
      ]
    },
    {
      "name": "Use of Frameworks",
      "weight": 30,
      "levels": [
        {"score": 4, "description": "Expert application"},
        {"score": 3, "description": "Good application"},
        {"score": 2, "description": "Basic application"},
        {"score": 1, "description": "Poor application"}
      ]
    }
  ]
}
```

## Best Practices

### Model Design
1. **Use Option<T>** for nullable database fields
2. **Separate creation/update models** from entity models
3. **Validate data** before database operations
4. **Use enums** for constrained values
5. **Store JSON** in String fields with validation

### Database Operations
1. **Use repositories** for data access
2. **Handle errors gracefully** with Result types
3. **Use transactions** for multi-table operations
4. **Validate input** before database calls
5. **Use prepared statements** (automatic with SQLx)

### Performance Considerations
1. **Use views** for complex aggregations
2. **Index frequently queried fields**
3. **Limit large text fields** with validation
4. **Use connection pooling** for concurrent access
5. **Paginate large result sets**

This model system provides a robust foundation for the Case Crafter application with type safety, validation, and clean separation of concerns.