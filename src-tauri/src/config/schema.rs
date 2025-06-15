// JSON schema definitions for configurable input fields

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

/// Main configuration schema for a form or input collection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigurationSchema {
    /// Unique identifier for this configuration
    pub id: String,
    /// Human-readable name for this configuration
    pub name: String,
    /// Description of what this configuration is for
    pub description: Option<String>,
    /// Version of this configuration schema
    pub version: String,
    /// Business framework this configuration belongs to (e.g., "Harvard Business Review", "McKinsey 7S")
    pub framework: Option<String>,
    /// Category for organization (e.g., "case_study_generation", "assessment_creation")
    pub category: String,
    /// Ordered list of field groups/sections
    pub sections: Vec<FieldSection>,
    /// Global validation rules that apply across fields
    pub global_validations: Vec<CrossFieldValidation>,
    /// Conditional logic rules for showing/hiding fields
    pub conditional_logic: Vec<ConditionalRule>,
    /// Default values for fields
    pub defaults: HashMap<String, serde_json::Value>,
    /// Schema metadata
    pub metadata: SchemaMetadata,
    /// When this schema was created
    pub created_at: DateTime<Utc>,
    /// When this schema was last updated
    pub updated_at: DateTime<Utc>,
    /// Who created/owns this schema
    pub created_by: Option<String>,
}

/// A logical grouping of related fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldSection {
    /// Unique identifier within this configuration
    pub id: String,
    /// Display name for this section
    pub title: String,
    /// Optional description or help text
    pub description: Option<String>,
    /// Display order within the form
    pub order: i32,
    /// Whether this section can be collapsed
    pub collapsible: bool,
    /// Whether this section starts collapsed
    pub collapsed_by_default: bool,
    /// Icon to display with this section
    pub icon: Option<String>,
    /// Fields within this section
    pub fields: Vec<FieldDefinition>,
    /// Conditions for when this section should be visible
    pub visibility_conditions: Option<ConditionalExpression>,
}

/// Definition of a single input field
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDefinition {
    /// Unique identifier within this configuration
    pub id: String,
    /// Display name/label for this field
    pub label: String,
    /// Type of input field
    pub field_type: FieldType,
    /// Whether this field is required
    pub required: bool,
    /// Placeholder text
    pub placeholder: Option<String>,
    /// Help text or description
    pub help_text: Option<String>,
    /// Default value for this field
    pub default_value: Option<serde_json::Value>,
    /// Validation rules for this field
    pub validations: Vec<ValidationRule>,
    /// Options for select/radio/checkbox fields
    pub options: Option<FieldOptions>,
    /// Layout and display properties
    pub display: FieldDisplay,
    /// Conditions for when this field should be visible
    pub visibility_conditions: Option<ConditionalExpression>,
    /// Fields that depend on this field's value
    pub dependent_fields: Vec<String>,
    /// Business framework mapping
    pub framework_mapping: Option<FrameworkMapping>,
}

/// Types of input fields supported
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "config")]
pub enum FieldType {
    /// Single-line text input
    Text {
        min_length: Option<i32>,
        max_length: Option<i32>,
        pattern: Option<String>,
    },
    /// Multi-line text area
    TextArea {
        min_length: Option<i32>,
        max_length: Option<i32>,
        rows: Option<i32>,
        resize: bool,
    },
    /// Rich text editor
    RichText {
        allowed_formats: Vec<String>,
        max_length: Option<i32>,
        upload_images: bool,
    },
    /// Numeric input
    Number {
        min: Option<f64>,
        max: Option<f64>,
        step: Option<f64>,
        decimal_places: Option<i32>,
    },
    /// Integer input
    Integer {
        min: Option<i64>,
        max: Option<i64>,
        step: Option<i64>,
    },
    /// Email input with validation
    Email,
    /// URL input with validation
    Url,
    /// Phone number input
    Phone {
        format: Option<String>,
        country_code: Option<String>,
    },
    /// Date picker
    Date {
        min_date: Option<String>,
        max_date: Option<String>,
        format: String,
    },
    /// Date and time picker
    DateTime {
        min_datetime: Option<String>,
        max_datetime: Option<String>,
        format: String,
        timezone: Option<String>,
    },
    /// Time picker
    Time {
        format: String,
        step_minutes: Option<i32>,
    },
    /// Single select dropdown
    Select {
        searchable: bool,
        clearable: bool,
        placeholder: Option<String>,
    },
    /// Multi-select dropdown
    MultiSelect {
        searchable: bool,
        max_selections: Option<i32>,
        placeholder: Option<String>,
    },
    /// Radio button group
    Radio {
        inline: bool,
    },
    /// Checkbox group
    CheckboxGroup {
        inline: bool,
        max_selections: Option<i32>,
    },
    /// Single checkbox
    Checkbox,
    /// Toggle switch
    Toggle,
    /// Slider input
    Slider {
        min: f64,
        max: f64,
        step: Option<f64>,
        marks: Option<Vec<SliderMark>>,
    },
    /// Rating input (stars, etc.)
    Rating {
        max_rating: i32,
        allow_half: bool,
        icon: String,
    },
    /// File upload
    FileUpload {
        accepted_types: Vec<String>,
        max_size: Option<i64>,
        multiple: bool,
    },
    /// Image upload with preview
    ImageUpload {
        accepted_formats: Vec<String>,
        max_size: Option<i64>,
        max_width: Option<i32>,
        max_height: Option<i32>,
        crop_aspect_ratio: Option<String>,
    },
    /// Color picker
    Color {
        format: String, // hex, rgb, hsl
        alpha: bool,
    },
    /// JSON editor
    Json {
        schema: Option<serde_json::Value>,
    },
    /// Array of repeated field groups
    FieldArray {
        min_items: Option<i32>,
        max_items: Option<i32>,
        item_schema: Box<FieldDefinition>,
    },
    /// Group of fields that can be added/removed dynamically
    DynamicFieldGroup {
        fields: Vec<FieldDefinition>,
        min_groups: Option<i32>,
        max_groups: Option<i32>,
    },
    /// Hidden field for storing computed or system values
    Hidden,
    /// Display-only field (not editable)
    Display {
        format: Option<String>,
    },
    /// Divider or spacer
    Divider {
        style: String,
    },
}

/// Configuration for fields with predefined options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldOptions {
    /// Static list of options
    pub static_options: Option<Vec<OptionItem>>,
    /// Dynamic options loaded from an API or database
    pub dynamic_options: Option<DynamicOptionsConfig>,
    /// Whether to allow custom values not in the list
    pub allow_custom: bool,
    /// Custom value validation when allow_custom is true
    pub custom_validation: Option<ValidationRule>,
}

/// A single option item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptionItem {
    /// Internal value
    pub value: serde_json::Value,
    /// Display label
    pub label: String,
    /// Optional description
    pub description: Option<String>,
    /// Whether this option is disabled
    pub disabled: bool,
    /// Optional icon
    pub icon: Option<String>,
    /// Optional group this option belongs to
    pub group: Option<String>,
    /// Additional metadata
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

/// Configuration for loading options dynamically
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DynamicOptionsConfig {
    /// Source type (database, api, computed)
    pub source_type: String,
    /// Source configuration (query, endpoint, etc.)
    pub source_config: HashMap<String, serde_json::Value>,
    /// Field dependencies that trigger reload
    pub dependencies: Vec<String>,
    /// Caching configuration
    pub cache_config: Option<CacheConfig>,
}

/// Caching configuration for dynamic options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    /// Cache duration in seconds
    pub duration: i32,
    /// Whether to cache per user
    pub per_user: bool,
    /// Cache key template
    pub key_template: Option<String>,
}

/// Display and layout properties for a field
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDisplay {
    /// CSS class names
    pub css_classes: Vec<String>,
    /// Inline styles
    pub styles: HashMap<String, String>,
    /// Grid layout properties
    pub grid: GridLayout,
    /// Whether field is disabled
    pub disabled: bool,
    /// Whether field is read-only
    pub readonly: bool,
    /// Whether to auto-focus this field
    pub auto_focus: bool,
    /// Tab order
    pub tab_index: Option<i32>,
    /// Tooltip text
    pub tooltip: Option<String>,
    /// Field width (xs, sm, md, lg, xl, or custom)
    pub width: String,
}

/// Grid layout configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridLayout {
    /// Columns to span on different breakpoints
    pub xs: Option<i32>,
    pub sm: Option<i32>,
    pub md: Option<i32>,
    pub lg: Option<i32>,
    pub xl: Option<i32>,
    /// Column offset
    pub offset: Option<i32>,
}

/// Slider mark definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SliderMark {
    pub value: f64,
    pub label: Option<String>,
}

/// Validation rule for a field
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "config")]
pub enum ValidationRule {
    /// Required field validation
    Required {
        message: Option<String>,
    },
    /// Minimum length validation
    MinLength {
        length: i32,
        message: Option<String>,
    },
    /// Maximum length validation
    MaxLength {
        length: i32,
        message: Option<String>,
    },
    /// Pattern matching validation
    Pattern {
        pattern: String,
        flags: Option<String>,
        message: Option<String>,
    },
    /// Minimum value validation
    Min {
        value: f64,
        message: Option<String>,
    },
    /// Maximum value validation
    Max {
        value: f64,
        message: Option<String>,
    },
    /// Email format validation
    Email {
        message: Option<String>,
    },
    /// URL format validation
    Url {
        message: Option<String>,
    },
    /// Custom validation function
    Custom {
        function_name: String,
        parameters: HashMap<String, serde_json::Value>,
        message: Option<String>,
    },
    /// Cross-field validation
    CrossField {
        expression: String,
        message: Option<String>,
    },
}

/// Cross-field validation that spans multiple fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossFieldValidation {
    /// Unique identifier for this validation
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Fields involved in this validation
    pub fields: Vec<String>,
    /// Validation expression
    pub expression: String,
    /// Error message when validation fails
    pub message: String,
    /// When to trigger this validation
    pub trigger: ValidationTrigger,
}

/// When to trigger validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationTrigger {
    /// On any field change
    OnChange,
    /// On form submission
    OnSubmit,
    /// On field blur
    OnBlur,
    /// Custom trigger condition
    Custom(String),
}

/// Conditional rule for showing/hiding fields or sections
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionalRule {
    /// Unique identifier for this rule
    pub id: String,
    /// Target field or section ID
    pub target: String,
    /// Action to take when condition is met
    pub action: ConditionalAction,
    /// Condition expression
    pub condition: ConditionalExpression,
}

/// Actions that can be taken based on conditions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConditionalAction {
    /// Show the target
    Show,
    /// Hide the target
    Hide,
    /// Enable the target
    Enable,
    /// Disable the target
    Disable,
    /// Set a value
    SetValue(serde_json::Value),
    /// Clear a value
    ClearValue,
    /// Show error message
    ShowError(String),
    /// Set field options
    SetOptions(Vec<OptionItem>),
}

/// Conditional expression for evaluating when rules should apply
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "config")]
pub enum ConditionalExpression {
    /// Simple field equals value
    Equals {
        field: String,
        value: serde_json::Value,
    },
    /// Field not equals value
    NotEquals {
        field: String,
        value: serde_json::Value,
    },
    /// Field greater than value
    GreaterThan {
        field: String,
        value: serde_json::Value,
    },
    /// Field less than value
    LessThan {
        field: String,
        value: serde_json::Value,
    },
    /// Field contains value (for arrays/strings)
    Contains {
        field: String,
        value: serde_json::Value,
    },
    /// Field is empty/null
    IsEmpty {
        field: String,
    },
    /// Field is not empty/null
    IsNotEmpty {
        field: String,
    },
    /// Field matches pattern
    Matches {
        field: String,
        pattern: String,
    },
    /// Field value is in list
    In {
        field: String,
        values: Vec<serde_json::Value>,
    },
    /// AND operation
    And {
        expressions: Vec<ConditionalExpression>,
    },
    /// OR operation
    Or {
        expressions: Vec<ConditionalExpression>,
    },
    /// NOT operation
    Not {
        expression: Box<ConditionalExpression>,
    },
    /// Custom JavaScript expression
    Custom {
        expression: String,
    },
}

/// Business framework mapping for a field
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameworkMapping {
    /// Framework name (e.g., "Porter's Five Forces", "SWOT Analysis")
    pub framework: String,
    /// Component within the framework
    pub component: String,
    /// Specific element or aspect
    pub element: Option<String>,
    /// Description of how this field maps to the framework
    pub description: Option<String>,
    /// Additional metadata for framework integration
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Schema metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaMetadata {
    /// Tags for categorization
    pub tags: Vec<String>,
    /// Target audience (e.g., "educators", "consultants", "students")
    pub target_audience: Vec<String>,
    /// Difficulty level
    pub difficulty_level: Option<String>,
    /// Estimated time to complete
    pub estimated_minutes: Option<i32>,
    /// Whether this is a template
    pub is_template: bool,
    /// Whether this is active/published
    pub is_active: bool,
    /// Language/locale
    pub locale: String,
    /// Custom metadata
    pub custom: HashMap<String, serde_json::Value>,
}

/// Default implementations
impl Default for GridLayout {
    fn default() -> Self {
        Self {
            xs: None,
            sm: None,
            md: None,
            lg: None,
            xl: None,
            offset: None,
        }
    }
}

impl Default for FieldDisplay {
    fn default() -> Self {
        Self {
            css_classes: Vec::new(),
            styles: HashMap::new(),
            grid: GridLayout::default(),
            disabled: false,
            readonly: false,
            auto_focus: false,
            tab_index: None,
            tooltip: None,
            width: "md".to_string(),
        }
    }
}

impl Default for SchemaMetadata {
    fn default() -> Self {
        Self {
            tags: Vec::new(),
            target_audience: Vec::new(),
            difficulty_level: None,
            estimated_minutes: None,
            is_template: false,
            is_active: true,
            locale: "en".to_string(),
            custom: HashMap::new(),
        }
    }
}

/// JSON Schema validation helpers
impl ConfigurationSchema {
    /// Validate the schema structure
    pub fn validate(&self) -> crate::config::Result<()> {
        // Validate field IDs are unique
        let mut field_ids = std::collections::HashSet::new();
        for section in &self.sections {
            for field in &section.fields {
                if !field_ids.insert(&field.id) {
                    return Err(crate::config::ConfigurationError::SchemaValidation(
                        format!("Duplicate field ID: {}", field.id)
                    ));
                }
            }
        }

        // Validate conditional logic references valid fields
        for rule in &self.conditional_logic {
            self.validate_conditional_expression(&rule.condition, &field_ids)?;
        }

        Ok(())
    }

    fn validate_conditional_expression(
        &self,
        expr: &ConditionalExpression,
        field_ids: &std::collections::HashSet<&String>,
    ) -> crate::config::Result<()> {
        match expr {
            ConditionalExpression::Equals { field, .. } |
            ConditionalExpression::NotEquals { field, .. } |
            ConditionalExpression::GreaterThan { field, .. } |
            ConditionalExpression::LessThan { field, .. } |
            ConditionalExpression::Contains { field, .. } |
            ConditionalExpression::IsEmpty { field } |
            ConditionalExpression::IsNotEmpty { field } |
            ConditionalExpression::Matches { field, .. } |
            ConditionalExpression::In { field, .. } => {
                if !field_ids.contains(field) {
                    return Err(crate::config::ConfigurationError::SchemaValidation(
                        format!("Conditional expression references unknown field: {}", field)
                    ));
                }
            },
            ConditionalExpression::And { expressions } |
            ConditionalExpression::Or { expressions } => {
                for expr in expressions {
                    self.validate_conditional_expression(expr, field_ids)?;
                }
            },
            ConditionalExpression::Not { expression } => {
                self.validate_conditional_expression(expression, field_ids)?;
            },
            ConditionalExpression::Custom { .. } => {
                // Custom expressions would need special validation
            },
        }
        Ok(())
    }

    /// Get all field IDs in this schema
    pub fn get_field_ids(&self) -> Vec<String> {
        self.sections
            .iter()
            .flat_map(|section| section.fields.iter().map(|field| field.id.clone()))
            .collect()
    }

    /// Get field by ID
    pub fn get_field(&self, field_id: &str) -> Option<&FieldDefinition> {
        self.sections
            .iter()
            .flat_map(|section| section.fields.iter())
            .find(|field| field.id == field_id)
    }

    /// Get section by ID
    pub fn get_section(&self, section_id: &str) -> Option<&FieldSection> {
        self.sections.iter().find(|section| section.id == section_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_validation() {
        let schema = ConfigurationSchema {
            id: "test".to_string(),
            name: "Test Schema".to_string(),
            description: None,
            version: "1.0".to_string(),
            framework: None,
            category: "test".to_string(),
            sections: vec![
                FieldSection {
                    id: "section1".to_string(),
                    title: "Section 1".to_string(),
                    description: None,
                    order: 1,
                    collapsible: false,
                    collapsed_by_default: false,
                    icon: None,
                    fields: vec![
                        FieldDefinition {
                            id: "field1".to_string(),
                            label: "Field 1".to_string(),
                            field_type: FieldType::Text { min_length: None, max_length: None, pattern: None },
                            required: false,
                            placeholder: None,
                            help_text: None,
                            default_value: None,
                            validations: Vec::new(),
                            options: None,
                            display: FieldDisplay::default(),
                            visibility_conditions: None,
                            dependent_fields: Vec::new(),
                            framework_mapping: None,
                        }
                    ],
                    visibility_conditions: None,
                }
            ],
            global_validations: Vec::new(),
            conditional_logic: Vec::new(),
            defaults: HashMap::new(),
            metadata: SchemaMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: None,
        };

        assert!(schema.validate().is_ok());
    }

    #[test]
    fn test_duplicate_field_ids() {
        let mut schema = ConfigurationSchema {
            id: "test".to_string(),
            name: "Test Schema".to_string(),
            description: None,
            version: "1.0".to_string(),
            framework: None,
            category: "test".to_string(),
            sections: vec![
                FieldSection {
                    id: "section1".to_string(),
                    title: "Section 1".to_string(),
                    description: None,
                    order: 1,
                    collapsible: false,
                    collapsed_by_default: false,
                    icon: None,
                    fields: vec![
                        FieldDefinition {
                            id: "field1".to_string(),
                            label: "Field 1".to_string(),
                            field_type: FieldType::Text { min_length: None, max_length: None, pattern: None },
                            required: false,
                            placeholder: None,
                            help_text: None,
                            default_value: None,
                            validations: Vec::new(),
                            options: None,
                            display: FieldDisplay::default(),
                            visibility_conditions: None,
                            dependent_fields: Vec::new(),
                            framework_mapping: None,
                        },
                        FieldDefinition {
                            id: "field1".to_string(), // Duplicate ID
                            label: "Field 1 Duplicate".to_string(),
                            field_type: FieldType::Text { min_length: None, max_length: None, pattern: None },
                            required: false,
                            placeholder: None,
                            help_text: None,
                            default_value: None,
                            validations: Vec::new(),
                            options: None,
                            display: FieldDisplay::default(),
                            visibility_conditions: None,
                            dependent_fields: Vec::new(),
                            framework_mapping: None,
                        }
                    ],
                    visibility_conditions: None,
                }
            ],
            global_validations: Vec::new(),
            conditional_logic: Vec::new(),
            defaults: HashMap::new(),
            metadata: SchemaMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: None,
        };

        assert!(schema.validate().is_err());
    }
}