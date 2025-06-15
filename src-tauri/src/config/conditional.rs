// Conditional logic engine for dynamic field behavior

use super::models::*;
use super::schema::*;
use std::collections::HashMap;
use serde_json::Value;
use regex::Regex;

/// Conditional logic engine for evaluating field dependencies
#[derive(Clone)]
pub struct ConditionalEngine {
    /// Cache for compiled expressions to improve performance
    expression_cache: HashMap<String, CompiledExpression>,
}

/// A compiled conditional expression for faster evaluation
#[derive(Debug, Clone)]
pub struct CompiledExpression {
    pub expression_type: String,
    pub field_dependencies: Vec<String>,
    pub evaluation_function: fn(&HashMap<String, Value>, &serde_json::Value) -> bool,
    pub config: serde_json::Value,
}

/// Result of evaluating conditional rules for a field
#[derive(Debug, Clone, serde::Serialize)]
pub struct ConditionalResult {
    pub field_id: String,
    pub is_visible: bool,
    pub is_enabled: bool,
    pub value_override: Option<Value>,
    pub options_override: Option<Vec<OptionItem>>,
    pub error_override: Option<String>,
    pub applied_rules: Vec<String>,
}

/// Context for evaluating conditional expressions
#[derive(Debug, Clone)]
pub struct EvaluationContext {
    pub form_data: HashMap<String, Value>,
    pub field_definitions: HashMap<String, FieldDefinition>,
    pub current_field_id: String,
}

impl ConditionalEngine {
    /// Create a new conditional engine
    pub fn new() -> Self {
        Self {
            expression_cache: HashMap::new(),
        }
    }

    /// Evaluate all conditional rules for a form and return field states
    pub fn evaluate_form_conditions(
        &mut self,
        schema: &ConfigurationSchema,
        form_data: &HashMap<String, Value>,
    ) -> HashMap<String, ConditionalResult> {
        let mut results = HashMap::new();
        
        // Create field definitions map for quick lookup
        let mut field_definitions = HashMap::new();
        for section in &schema.sections {
            for field in &section.fields {
                field_definitions.insert(field.id.clone(), field.clone());
            }
        }

        // Initialize all fields with default state
        for section in &schema.sections {
            for field in &section.fields {
                results.insert(field.id.clone(), ConditionalResult {
                    field_id: field.id.clone(),
                    is_visible: true,
                    is_enabled: !field.display.disabled,
                    value_override: None,
                    options_override: None,
                    error_override: None,
                    applied_rules: Vec::new(),
                });
            }
        }

        // Evaluate conditional rules
        for rule in &schema.conditional_logic {
            if let Some(result) = results.get_mut(&rule.target) {
                let context = EvaluationContext {
                    form_data: form_data.clone(),
                    field_definitions: field_definitions.clone(),
                    current_field_id: rule.target.clone(),
                };

                if self.evaluate_condition(&rule.condition, &context) {
                    self.apply_action(&rule.action, result);
                    result.applied_rules.push(rule.id.clone());
                }
            }
        }

        // Also evaluate field-level visibility conditions
        for section in &schema.sections {
            for field in &section.fields {
                if let Some(visibility_condition) = &field.visibility_conditions {
                    let context = EvaluationContext {
                        form_data: form_data.clone(),
                        field_definitions: field_definitions.clone(),
                        current_field_id: field.id.clone(),
                    };

                    if let Some(result) = results.get_mut(&field.id) {
                        if !self.evaluate_condition(visibility_condition, &context) {
                            result.is_visible = false;
                        }
                    }
                }
            }
        }

        results
    }

    /// Evaluate a single conditional expression
    pub fn evaluate_condition(
        &mut self,
        expression: &ConditionalExpression,
        context: &EvaluationContext,
    ) -> bool {
        match expression {
            ConditionalExpression::Equals { field, value } => {
                self.evaluate_equals_condition(field, value, context)
            },
            ConditionalExpression::NotEquals { field, value } => {
                !self.evaluate_equals_condition(field, value, context)
            },
            ConditionalExpression::GreaterThan { field, value } => {
                self.evaluate_comparison_condition(field, value, context, |a, b| a > b)
            },
            ConditionalExpression::LessThan { field, value } => {
                self.evaluate_comparison_condition(field, value, context, |a, b| a < b)
            },
            ConditionalExpression::Contains { field, value } => {
                self.evaluate_contains_condition(field, value, context)
            },
            ConditionalExpression::IsEmpty { field } => {
                self.evaluate_empty_condition(field, context)
            },
            ConditionalExpression::IsNotEmpty { field } => {
                !self.evaluate_empty_condition(field, context)
            },
            ConditionalExpression::Matches { field, pattern } => {
                self.evaluate_regex_condition(field, pattern, context)
            },
            ConditionalExpression::In { field, values } => {
                self.evaluate_in_list_condition(field, values, context)
            },
            ConditionalExpression::And { expressions } => {
                expressions.iter().all(|expr| self.evaluate_condition(expr, context))
            },
            ConditionalExpression::Or { expressions } => {
                expressions.iter().any(|expr| self.evaluate_condition(expr, context))
            },
            ConditionalExpression::Not { expression } => {
                !self.evaluate_condition(expression, context)
            },
            ConditionalExpression::Custom { expression } => {
                self.evaluate_custom_condition(expression, context)
            },
        }
    }

    /// Apply a conditional action to a field result
    fn apply_action(&self, action: &ConditionalAction, result: &mut ConditionalResult) {
        match action {
            ConditionalAction::Show => result.is_visible = true,
            ConditionalAction::Hide => result.is_visible = false,
            ConditionalAction::Enable => result.is_enabled = true,
            ConditionalAction::Disable => result.is_enabled = false,
            ConditionalAction::SetValue(value) => result.value_override = Some(value.clone()),
            ConditionalAction::ClearValue => result.value_override = Some(Value::Null),
            ConditionalAction::ShowError(message) => result.error_override = Some(message.clone()),
            ConditionalAction::SetOptions(options) => result.options_override = Some(options.clone()),
        }
    }

    // Condition evaluation methods
    fn evaluate_equals_condition(&self, field: &str, expected_value: &Value, context: &EvaluationContext) -> bool {
        if let Some(actual_value) = context.form_data.get(field) {
            return self.values_equal(actual_value, expected_value);
        }
        false
    }

    fn evaluate_comparison_condition<F>(&self, field: &str, expected_value: &Value, context: &EvaluationContext, comparator: F) -> bool
    where
        F: Fn(f64, f64) -> bool,
    {
        if let Some(actual_value) = context.form_data.get(field) {
            if let (Some(a), Some(b)) = (self.to_number(actual_value), self.to_number(expected_value)) {
                return comparator(a, b);
            }
        }
        false
    }

    fn evaluate_contains_condition(&self, field: &str, search_value: &Value, context: &EvaluationContext) -> bool {
        if let Some(actual_value) = context.form_data.get(field) {
            return self.value_contains(actual_value, search_value);
        }
        false
    }

    fn evaluate_regex_condition(&self, field: &str, pattern: &str, context: &EvaluationContext) -> bool {
        if let Some(actual_value) = context.form_data.get(field) {
            if let Some(text) = actual_value.as_str() {
                if let Ok(regex) = Regex::new(pattern) {
                    return regex.is_match(text);
                }
            }
        }
        false
    }

    fn evaluate_empty_condition(&self, field: &str, context: &EvaluationContext) -> bool {
        if let Some(actual_value) = context.form_data.get(field) {
            return self.is_empty_value(actual_value);
        }
        true // Field not in form data means it's empty
    }

    fn evaluate_in_list_condition(&self, field: &str, values: &[Value], context: &EvaluationContext) -> bool {
        if let Some(actual_value) = context.form_data.get(field) {
            return values.iter().any(|v| self.values_equal(actual_value, v));
        }
        false
    }

    fn evaluate_custom_condition(&self, _expression: &str, _context: &EvaluationContext) -> bool {
        // Custom conditions would be implemented based on specific business logic
        // This is a placeholder for extensibility
        false
    }

    // Helper methods
    fn values_equal(&self, a: &Value, b: &Value) -> bool {
        match (a, b) {
            (Value::String(s1), Value::String(s2)) => s1 == s2,
            (Value::Number(n1), Value::Number(n2)) => n1 == n2,
            (Value::Bool(b1), Value::Bool(b2)) => b1 == b2,
            (Value::Null, Value::Null) => true,
            // Type coercion for string-number comparison
            (Value::String(s), Value::Number(n)) | (Value::Number(n), Value::String(s)) => {
                s.parse::<f64>().map(|parsed| parsed == n.as_f64().unwrap_or(0.0)).unwrap_or(false)
            },
            // Array comparison
            (Value::Array(a1), Value::Array(a2)) => a1 == a2,
            _ => false,
        }
    }

    fn to_number(&self, value: &Value) -> Option<f64> {
        match value {
            Value::Number(n) => n.as_f64(),
            Value::String(s) => s.parse().ok(),
            _ => None,
        }
    }

    fn is_empty_value(&self, value: &Value) -> bool {
        match value {
            Value::Null => true,
            Value::String(s) => s.trim().is_empty(),
            Value::Array(arr) => arr.is_empty(),
            Value::Object(obj) => obj.is_empty(),
            _ => false,
        }
    }

    fn value_contains(&self, haystack: &Value, needle: &Value) -> bool {
        match (haystack, needle) {
            (Value::String(text), Value::String(search)) => {
                text.to_lowercase().contains(&search.to_lowercase())
            },
            (Value::Array(arr), needle) => {
                arr.iter().any(|item| self.values_equal(item, needle))
            },
            _ => false,
        }
    }

    /// Get all field dependencies for a conditional expression
    pub fn get_dependencies(&self, expression: &ConditionalExpression) -> Vec<String> {
        let mut dependencies = Vec::new();
        self.collect_dependencies(expression, &mut dependencies);
        dependencies.sort();
        dependencies.dedup();
        dependencies
    }

    fn collect_dependencies(&self, expression: &ConditionalExpression, dependencies: &mut Vec<String>) {
        match expression {
            ConditionalExpression::Equals { field, .. } |
            ConditionalExpression::NotEquals { field, .. } |
            ConditionalExpression::GreaterThan { field, .. } |
            ConditionalExpression::LessThan { field, .. } |
            ConditionalExpression::Contains { field, .. } |
            ConditionalExpression::IsEmpty { field } |
            ConditionalExpression::IsNotEmpty { field } |
            ConditionalExpression::Matches { field, .. } |
            ConditionalExpression::In { field, .. } => {
                dependencies.push(field.clone());
            },
            ConditionalExpression::And { expressions } |
            ConditionalExpression::Or { expressions } => {
                for expr in expressions {
                    self.collect_dependencies(expr, dependencies);
                }
            },
            ConditionalExpression::Not { expression } => {
                self.collect_dependencies(expression, dependencies);
            },
            ConditionalExpression::Custom { .. } => {
                // Custom expressions may have complex dependencies
                // For now, we don't extract dependencies from custom expressions
            },
        }
    }
}

impl Default for ConditionalEngine {
    fn default() -> Self {
        Self::new()
    }
}