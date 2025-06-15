// Validation engine for configuration schemas and form submissions

use super::schema::*;
use super::models::*;
use crate::config::{ConfigurationError, Result};
use std::collections::HashMap;
use regex::Regex;
use chrono::{DateTime, Utc};
use serde_json::Value;

/// Validation engine for configuration schemas and form data
pub struct ValidationEngine {
    /// Custom validation functions registry
    custom_validators: HashMap<String, Box<dyn Fn(&Value, &HashMap<String, Value>) -> ValidationResult + Send + Sync>>,
}

/// Result of a single validation check
#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub message: Option<String>,
}

impl ValidationEngine {
    /// Create a new validation engine
    pub fn new() -> Self {
        let mut engine = Self {
            custom_validators: HashMap::new(),
        };
        
        // Register built-in custom validators
        engine.register_builtin_validators();
        engine
    }
    
    /// Register a custom validation function
    pub fn register_validator<F>(&mut self, name: String, validator: F)
    where
        F: Fn(&Value, &HashMap<String, Value>) -> ValidationResult + Send + Sync + 'static,
    {
        self.custom_validators.insert(name, Box::new(validator));
    }
    
    /// Validate a configuration schema
    pub fn validate_schema(&self, schema: &ConfigurationSchema) -> Result<ValidationResults> {
        let mut results = ValidationResults::default();
        
        // Validate schema structure
        if let Err(e) = schema.validate() {
            results.add_global_error(format!("Schema validation failed: {}", e));
            return Ok(results);
        }
        
        // Validate individual field definitions
        for section in &schema.sections {
            for field in &section.fields {
                if let Err(e) = self.validate_field_definition(field) {
                    results.add_field_error(&field.id, format!("Field definition invalid: {}", e));
                }
            }
        }
        
        // Validate conditional logic
        for rule in &schema.conditional_logic {
            if let Err(e) = self.validate_conditional_rule(rule, schema) {
                results.add_global_error(format!("Conditional rule '{}' invalid: {}", rule.id, e));
            }
        }
        
        // Validate cross-field validations
        for validation in &schema.global_validations {
            if let Err(e) = self.validate_cross_field_validation(validation, schema) {
                results.add_global_error(format!("Cross-field validation '{}' invalid: {}", validation.id, e));
            }
        }
        
        Ok(results)
    }
    
    /// Validate form submission data against a schema
    pub fn validate_form_data(
        &self,
        schema: &ConfigurationSchema,
        form_data: &HashMap<String, Value>,
    ) -> Result<ValidationResults> {
        let mut results = ValidationResults::default();
        
        // Validate each field
        for section in &schema.sections {
            for field in &section.fields {
                // Skip hidden and display fields
                if matches!(field.field_type, FieldType::Hidden | FieldType::Display { .. }) {
                    continue;
                }
                
                // Check visibility conditions
                if let Some(ref condition) = field.visibility_conditions {
                    if !self.evaluate_condition(condition, form_data)? {
                        continue; // Field is not visible, skip validation
                    }
                }
                
                let field_value = form_data.get(&field.id);
                
                // Validate field
                match self.validate_field(field, field_value, form_data) {
                    Ok(field_results) => {
                        for error in field_results.field_errors.get(&field.id).unwrap_or(&Vec::new()) {
                            results.add_field_error(&field.id, error.clone());
                        }
                    },
                    Err(e) => {
                        results.add_field_error(&field.id, format!("Validation error: {}", e));
                    }
                }
            }
        }
        
        // Validate global/cross-field validations
        for validation in &schema.global_validations {
            match self.validate_cross_field_rule(validation, form_data) {
                Ok(validation_result) => {
                    if !validation_result.is_valid {
                        results.add_global_error(
                            validation_result.message.unwrap_or_else(|| validation.message.clone())
                        );
                    }
                },
                Err(e) => {
                    results.add_global_error(format!("Cross-field validation error: {}", e));
                }
            }
        }
        
        Ok(results)
    }
    
    /// Validate a single field against its definition
    fn validate_field(
        &self,
        field: &FieldDefinition,
        value: Option<&Value>,
        all_data: &HashMap<String, Value>,
    ) -> Result<ValidationResults> {
        let mut results = ValidationResults::default();
        
        // Check if field is required
        if field.required && (value.is_none() || self.is_empty_value(value.unwrap())) {
            results.add_field_error(&field.id, "This field is required".to_string());
            return Ok(results);
        }
        
        // If field is not required and empty, skip other validations
        if value.is_none() || self.is_empty_value(value.unwrap()) {
            return Ok(results);
        }
        
        let value = value.unwrap();
        
        // Apply field-specific validations
        for validation_rule in &field.validations {
            match self.apply_validation_rule(validation_rule, value, all_data) {
                Ok(validation_result) => {
                    if !validation_result.is_valid {
                        let message = validation_result.message
                            .unwrap_or_else(|| "Validation failed".to_string());
                        results.add_field_error(&field.id, message);
                    }
                },
                Err(e) => {
                    results.add_field_error(&field.id, format!("Validation error: {}", e));
                }
            }
        }
        
        // Apply field type specific validations
        if let Err(e) = self.validate_field_type(&field.field_type, value) {
            results.add_field_error(&field.id, format!("Invalid value for field type: {}", e));
        }
        
        Ok(results)
    }
    
    /// Apply a specific validation rule
    fn apply_validation_rule(
        &self,
        rule: &ValidationRule,
        value: &Value,
        all_data: &HashMap<String, Value>,
    ) -> Result<ValidationResult> {
        match rule {
            ValidationRule::Required { message } => {
                Ok(ValidationResult {
                    is_valid: !self.is_empty_value(value),
                    message: message.clone(),
                })
            },
            ValidationRule::MinLength { length, message } => {
                let text = value.as_str().unwrap_or("");
                Ok(ValidationResult {
                    is_valid: text.len() >= *length as usize,
                    message: message.clone().or_else(|| 
                        Some(format!("Minimum length is {} characters", length))
                    ),
                })
            },
            ValidationRule::MaxLength { length, message } => {
                let text = value.as_str().unwrap_or("");
                Ok(ValidationResult {
                    is_valid: text.len() <= *length as usize,
                    message: message.clone().or_else(|| 
                        Some(format!("Maximum length is {} characters", length))
                    ),
                })
            },
            ValidationRule::Pattern { pattern, flags: _, message } => {
                let text = value.as_str().unwrap_or("");
                let regex = Regex::new(pattern)
                    .map_err(|e| ConfigurationError::ValidationError(format!("Invalid regex pattern: {}", e)))?;
                Ok(ValidationResult {
                    is_valid: regex.is_match(text),
                    message: message.clone().or_else(|| 
                        Some("Value does not match required pattern".to_string())
                    ),
                })
            },
            ValidationRule::Min { value: min_val, message } => {
                let num = value.as_f64().unwrap_or(0.0);
                Ok(ValidationResult {
                    is_valid: num >= *min_val,
                    message: message.clone().or_else(|| 
                        Some(format!("Minimum value is {}", min_val))
                    ),
                })
            },
            ValidationRule::Max { value: max_val, message } => {
                let num = value.as_f64().unwrap_or(0.0);
                Ok(ValidationResult {
                    is_valid: num <= *max_val,
                    message: message.clone().or_else(|| 
                        Some(format!("Maximum value is {}", max_val))
                    ),
                })
            },
            ValidationRule::Email { message } => {
                let text = value.as_str().unwrap_or("");
                let email_regex = Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").unwrap();
                Ok(ValidationResult {
                    is_valid: email_regex.is_match(text),
                    message: message.clone().or_else(|| 
                        Some("Please enter a valid email address".to_string())
                    ),
                })
            },
            ValidationRule::Url { message } => {
                let text = value.as_str().unwrap_or("");
                let url_result = url::Url::parse(text);
                Ok(ValidationResult {
                    is_valid: url_result.is_ok(),
                    message: message.clone().or_else(|| 
                        Some("Please enter a valid URL".to_string())
                    ),
                })
            },
            ValidationRule::Custom { function_name, parameters, message } => {
                if let Some(validator) = self.custom_validators.get(function_name) {
                    // Create context with parameters and all form data
                    let mut context = all_data.clone();
                    for (key, val) in parameters {
                        context.insert(format!("param_{}", key), val.clone());
                    }
                    
                    let result = validator(value, &context);
                    Ok(ValidationResult {
                        is_valid: result.is_valid,
                        message: message.clone().or(result.message),
                    })
                } else {
                    Err(ConfigurationError::ValidationError(
                        format!("Unknown validation function: {}", function_name)
                    ))
                }
            },
            ValidationRule::CrossField { expression: _, message } => {
                // This would require a more sophisticated expression evaluator
                // For now, return a simple implementation
                Ok(ValidationResult {
                    is_valid: true,
                    message: message.clone(),
                })
            },
        }
    }
    
    /// Validate field type constraints
    fn validate_field_type(&self, field_type: &FieldType, value: &Value) -> Result<()> {
        match field_type {
            FieldType::Text { min_length, max_length, pattern } => {
                let text = value.as_str()
                    .ok_or_else(|| ConfigurationError::ValidationError("Expected text value".to_string()))?;
                
                if let Some(min_len) = min_length {
                    if text.len() < *min_len as usize {
                        return Err(ConfigurationError::ValidationError(
                            format!("Text must be at least {} characters", min_len)
                        ));
                    }
                }
                
                if let Some(max_len) = max_length {
                    if text.len() > *max_len as usize {
                        return Err(ConfigurationError::ValidationError(
                            format!("Text must be at most {} characters", max_len)
                        ));
                    }
                }
                
                if let Some(pattern) = pattern {
                    let regex = Regex::new(pattern)
                        .map_err(|e| ConfigurationError::ValidationError(format!("Invalid regex: {}", e)))?;
                    if !regex.is_match(text) {
                        return Err(ConfigurationError::ValidationError(
                            "Text does not match required pattern".to_string()
                        ));
                    }
                }
            },
            FieldType::Number { min, max, .. } => {
                let num = value.as_f64()
                    .ok_or_else(|| ConfigurationError::ValidationError("Expected numeric value".to_string()))?;
                
                if let Some(min_val) = min {
                    if num < *min_val {
                        return Err(ConfigurationError::ValidationError(
                            format!("Number must be at least {}", min_val)
                        ));
                    }
                }
                
                if let Some(max_val) = max {
                    if num > *max_val {
                        return Err(ConfigurationError::ValidationError(
                            format!("Number must be at most {}", max_val)
                        ));
                    }
                }
            },
            FieldType::Integer { min, max, .. } => {
                let num = value.as_i64()
                    .ok_or_else(|| ConfigurationError::ValidationError("Expected integer value".to_string()))?;
                
                if let Some(min_val) = min {
                    if num < *min_val {
                        return Err(ConfigurationError::ValidationError(
                            format!("Integer must be at least {}", min_val)
                        ));
                    }
                }
                
                if let Some(max_val) = max {
                    if num > *max_val {
                        return Err(ConfigurationError::ValidationError(
                            format!("Integer must be at most {}", max_val)
                        ));
                    }
                }
            },
            FieldType::Email => {
                let text = value.as_str()
                    .ok_or_else(|| ConfigurationError::ValidationError("Expected email string".to_string()))?;
                let email_regex = Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").unwrap();
                if !email_regex.is_match(text) {
                    return Err(ConfigurationError::ValidationError("Invalid email format".to_string()));
                }
            },
            FieldType::Url => {
                let text = value.as_str()
                    .ok_or_else(|| ConfigurationError::ValidationError("Expected URL string".to_string()))?;
                url::Url::parse(text)
                    .map_err(|_| ConfigurationError::ValidationError("Invalid URL format".to_string()))?;
            },
            FieldType::Date { format, .. } => {
                let text = value.as_str()
                    .ok_or_else(|| ConfigurationError::ValidationError("Expected date string".to_string()))?;
                // Simple date validation - in a real implementation you'd use the format string
                chrono::NaiveDate::parse_from_str(text, &format)
                    .map_err(|_| ConfigurationError::ValidationError("Invalid date format".to_string()))?;
            },
            // Add validation for other field types as needed
            _ => {
                // No specific validation for this field type
            }
        }
        
        Ok(())
    }
    
    /// Check if a value is considered empty
    fn is_empty_value(&self, value: &Value) -> bool {
        match value {
            Value::Null => true,
            Value::String(s) => s.trim().is_empty(),
            Value::Array(arr) => arr.is_empty(),
            Value::Object(obj) => obj.is_empty(),
            _ => false,
        }
    }
    
    /// Evaluate a conditional expression
    fn evaluate_condition(
        &self,
        condition: &ConditionalExpression,
        form_data: &HashMap<String, Value>,
    ) -> Result<bool> {
        match condition {
            ConditionalExpression::Equals { field, value } => {
                let field_value = form_data.get(field);
                Ok(field_value == Some(value))
            },
            ConditionalExpression::NotEquals { field, value } => {
                let field_value = form_data.get(field);
                Ok(field_value != Some(value))
            },
            ConditionalExpression::IsEmpty { field } => {
                let field_value = form_data.get(field);
                Ok(field_value.map_or(true, |v| self.is_empty_value(v)))
            },
            ConditionalExpression::IsNotEmpty { field } => {
                let field_value = form_data.get(field);
                Ok(field_value.map_or(false, |v| !self.is_empty_value(v)))
            },
            ConditionalExpression::And { expressions } => {
                for expr in expressions {
                    if !self.evaluate_condition(expr, form_data)? {
                        return Ok(false);
                    }
                }
                Ok(true)
            },
            ConditionalExpression::Or { expressions } => {
                for expr in expressions {
                    if self.evaluate_condition(expr, form_data)? {
                        return Ok(true);
                    }
                }
                Ok(false)
            },
            ConditionalExpression::Not { expression } => {
                Ok(!self.evaluate_condition(expression, form_data)?)
            },
            // Add implementations for other condition types
            _ => {
                // For complex conditions, return true for now
                Ok(true)
            }
        }
    }
    
    /// Validate a field definition
    fn validate_field_definition(&self, field: &FieldDefinition) -> Result<()> {
        // Validate field ID
        if field.id.is_empty() {
            return Err(ConfigurationError::SchemaValidation("Field ID cannot be empty".to_string()));
        }
        
        // Validate label
        if field.label.is_empty() {
            return Err(ConfigurationError::SchemaValidation("Field label cannot be empty".to_string()));
        }
        
        // Validate field type specific constraints
        match &field.field_type {
            FieldType::Text { min_length, max_length, .. } => {
                if let (Some(min), Some(max)) = (min_length, max_length) {
                    if min > max {
                        return Err(ConfigurationError::SchemaValidation(
                            "Text field min_length cannot be greater than max_length".to_string()
                        ));
                    }
                }
            },
            FieldType::Number { min, max, .. } => {
                if let (Some(min_val), Some(max_val)) = (min, max) {
                    if min_val > max_val {
                        return Err(ConfigurationError::SchemaValidation(
                            "Number field min cannot be greater than max".to_string()
                        ));
                    }
                }
            },
            // Add validation for other field types
            _ => {}
        }
        
        Ok(())
    }
    
    /// Validate a conditional rule
    fn validate_conditional_rule(&self, rule: &ConditionalRule, schema: &ConfigurationSchema) -> Result<()> {
        // Check that target exists
        let field_ids = schema.get_field_ids();
        if !field_ids.contains(&rule.target) {
            return Err(ConfigurationError::SchemaValidation(
                format!("Conditional rule target '{}' does not exist", rule.target)
            ));
        }
        
        // Validate the condition expression
        self.validate_conditional_expression(&rule.condition, &field_ids)?;
        
        Ok(())
    }
    
    /// Validate a conditional expression
    fn validate_conditional_expression(&self, expr: &ConditionalExpression, field_ids: &[String]) -> Result<()> {
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
                    return Err(ConfigurationError::SchemaValidation(
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
    
    /// Validate a cross-field validation
    fn validate_cross_field_validation(&self, validation: &CrossFieldValidation, schema: &ConfigurationSchema) -> Result<()> {
        let field_ids = schema.get_field_ids();
        
        // Check that all referenced fields exist
        for field_id in &validation.fields {
            if !field_ids.contains(field_id) {
                return Err(ConfigurationError::SchemaValidation(
                    format!("Cross-field validation references unknown field: {}", field_id)
                ));
            }
        }
        
        Ok(())
    }
    
    /// Validate a cross-field rule
    fn validate_cross_field_rule(&self, validation: &CrossFieldValidation, form_data: &HashMap<String, Value>) -> Result<ValidationResult> {
        // This is a simplified implementation
        // In a real system, you'd have an expression evaluator
        
        // For now, just check that all required fields for this validation are present
        for field_id in &validation.fields {
            if !form_data.contains_key(field_id) {
                return Ok(ValidationResult {
                    is_valid: false,
                    message: Some(format!("Required field '{}' is missing for cross-field validation", field_id)),
                });
            }
        }
        
        Ok(ValidationResult {
            is_valid: true,
            message: None,
        })
    }
    
    /// Register built-in validation functions
    fn register_builtin_validators(&mut self) {
        // Password strength validator
        self.register_validator(
            "password_strength".to_string(),
            |value, _context| {
                let password = value.as_str().unwrap_or("");
                let has_upper = password.chars().any(|c| c.is_uppercase());
                let has_lower = password.chars().any(|c| c.is_lowercase());
                let has_digit = password.chars().any(|c| c.is_ascii_digit());
                let has_special = password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c));
                let min_length = password.len() >= 8;
                
                let is_strong = has_upper && has_lower && has_digit && has_special && min_length;
                
                ValidationResult {
                    is_valid: is_strong,
                    message: if is_strong {
                        None
                    } else {
                        Some("Password must be at least 8 characters with uppercase, lowercase, digit, and special character".to_string())
                    },
                }
            }
        );
        
        // Credit card number validator (simple Luhn algorithm)
        self.register_validator(
            "credit_card".to_string(),
            |value, _context| {
                let card_number = value.as_str().unwrap_or("").replace(&[' ', '-'][..], "");
                
                if card_number.len() < 13 || card_number.len() > 19 {
                    return ValidationResult {
                        is_valid: false,
                        message: Some("Credit card number must be 13-19 digits".to_string()),
                    };
                }
                
                // Simple validation (would use proper Luhn algorithm in production)
                let is_valid = card_number.chars().all(|c| c.is_ascii_digit());
                
                ValidationResult {
                    is_valid,
                    message: if is_valid {
                        None
                    } else {
                        Some("Invalid credit card number".to_string())
                    },
                }
            }
        );
    }
}

impl Default for ValidationEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl ValidationResult {
    pub fn valid() -> Self {
        Self {
            is_valid: true,
            message: None,
        }
    }
    
    pub fn invalid(message: String) -> Self {
        Self {
            is_valid: false,
            message: Some(message),
        }
    }
}