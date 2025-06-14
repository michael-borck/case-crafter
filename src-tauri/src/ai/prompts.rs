// Prompt template system for AI generation

use crate::ai::errors::{AIError, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use handlebars::Handlebars;

/// Variable definition for prompt templates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVariable {
    pub name: String,
    pub description: String,
    pub variable_type: VariableType,
    pub required: bool,
    pub default_value: Option<String>,
    pub validation_pattern: Option<String>,
}

/// Types of template variables
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VariableType {
    String,
    Number,
    Boolean,
    Array,
    Object,
}

/// A prompt template for AI generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub system_prompt: Option<String>,
    pub user_prompt: String,
    pub variables: Vec<TemplateVariable>,
    pub example_values: HashMap<String, serde_json::Value>,
    pub tags: Vec<String>,
    pub version: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl PromptTemplate {
    /// Create a new prompt template
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        description: impl Into<String>,
        category: impl Into<String>,
        user_prompt: impl Into<String>,
    ) -> Self {
        let now = chrono::Utc::now();
        Self {
            id: id.into(),
            name: name.into(),
            description: description.into(),
            category: category.into(),
            system_prompt: None,
            user_prompt: user_prompt.into(),
            variables: Vec::new(),
            example_values: HashMap::new(),
            tags: Vec::new(),
            version: "1.0.0".to_string(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Add a system prompt
    pub fn with_system_prompt(mut self, system_prompt: impl Into<String>) -> Self {
        self.system_prompt = Some(system_prompt.into());
        self
    }

    /// Add a variable to the template
    pub fn with_variable(mut self, variable: TemplateVariable) -> Self {
        self.variables.push(variable);
        self
    }

    /// Add an example value for a variable
    pub fn with_example(mut self, name: impl Into<String>, value: serde_json::Value) -> Self {
        self.example_values.insert(name.into(), value);
        self
    }

    /// Add tags to the template
    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    /// Render the template with provided variables
    pub fn render(&self, variables: &HashMap<String, serde_json::Value>) -> Result<RenderedPrompt> {
        let handlebars = Handlebars::new();

        // Validate required variables
        for var in &self.variables {
            if var.required && !variables.contains_key(&var.name) {
                return Err(AIError::TemplateError(format!(
                    "Required variable '{}' is missing",
                    var.name
                )));
            }
        }

        // Merge provided variables with default values
        let mut render_context = HashMap::new();
        for var in &self.variables {
            if let Some(value) = variables.get(&var.name) {
                render_context.insert(var.name.clone(), value.clone());
            } else if let Some(default) = &var.default_value {
                render_context.insert(var.name.clone(), serde_json::json!(default));
            }
        }

        // Render system prompt if present
        let rendered_system = if let Some(system) = &self.system_prompt {
            Some(
                handlebars
                    .render_template(system, &render_context)
                    .map_err(|e| AIError::TemplateError(format!("Failed to render system prompt: {}", e)))?
            )
        } else {
            None
        };

        // Render user prompt
        let rendered_user = handlebars
            .render_template(&self.user_prompt, &render_context)
            .map_err(|e| AIError::TemplateError(format!("Failed to render user prompt: {}", e)))?;

        Ok(RenderedPrompt {
            template_id: self.id.clone(),
            system_prompt: rendered_system,
            user_prompt: rendered_user,
            variables_used: render_context,
        })
    }

    /// Validate a set of variables against this template
    pub fn validate_variables(&self, variables: &HashMap<String, serde_json::Value>) -> Result<()> {
        for var in &self.variables {
            if var.required && !variables.contains_key(&var.name) {
                return Err(AIError::TemplateError(format!(
                    "Required variable '{}' is missing",
                    var.name
                )));
            }

            if let Some(value) = variables.get(&var.name) {
                self.validate_variable_type(var, value)?;
                self.validate_variable_pattern(var, value)?;
            }
        }

        Ok(())
    }

    /// Validate a single variable's type
    fn validate_variable_type(&self, var: &TemplateVariable, value: &serde_json::Value) -> Result<()> {
        let is_valid = match var.variable_type {
            VariableType::String => value.is_string(),
            VariableType::Number => value.is_number(),
            VariableType::Boolean => value.is_boolean(),
            VariableType::Array => value.is_array(),
            VariableType::Object => value.is_object(),
        };

        if !is_valid {
            return Err(AIError::TemplateError(format!(
                "Variable '{}' must be of type {:?}, got {:?}",
                var.name, var.variable_type, value
            )));
        }

        Ok(())
    }

    /// Validate a variable against its pattern (if specified)
    fn validate_variable_pattern(&self, var: &TemplateVariable, value: &serde_json::Value) -> Result<()> {
        if let (Some(pattern), Some(string_value)) = (&var.validation_pattern, value.as_str()) {
            let regex = regex::Regex::new(pattern)
                .map_err(|e| AIError::TemplateError(format!("Invalid regex pattern for variable '{}': {}", var.name, e)))?;

            if !regex.is_match(string_value) {
                return Err(AIError::TemplateError(format!(
                    "Variable '{}' value '{}' does not match pattern '{}'",
                    var.name, string_value, pattern
                )));
            }
        }

        Ok(())
    }
}

/// A rendered prompt ready for AI generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderedPrompt {
    pub template_id: String,
    pub system_prompt: Option<String>,
    pub user_prompt: String,
    pub variables_used: HashMap<String, serde_json::Value>,
}

/// Prompt template manager
pub struct PromptManager {
    templates: HashMap<String, PromptTemplate>,
    handlebars: Handlebars<'static>,
}

impl PromptManager {
    /// Create a new prompt manager
    pub fn new() -> Self {
        Self {
            templates: HashMap::new(),
            handlebars: Handlebars::new(),
        }
    }

    /// Load default templates for case study generation
    pub fn load_default_templates(&mut self) {
        self.add_template(create_case_study_template());
        self.add_template(create_question_template());
        self.add_template(create_outline_template());
        self.add_template(create_background_template());
        self.add_template(create_analysis_framework_template());
        self.add_template(create_sample_solution_template());
    }

    /// Add a template to the manager
    pub fn add_template(&mut self, template: PromptTemplate) {
        self.templates.insert(template.id.clone(), template);
    }

    /// Get a template by ID
    pub fn get_template(&self, id: &str) -> Option<&PromptTemplate> {
        self.templates.get(id)
    }

    /// List all templates
    pub fn list_templates(&self) -> Vec<&PromptTemplate> {
        self.templates.values().collect()
    }

    /// List templates by category
    pub fn list_templates_by_category(&self, category: &str) -> Vec<&PromptTemplate> {
        self.templates
            .values()
            .filter(|t| t.category == category)
            .collect()
    }

    /// Search templates by tags
    pub fn search_templates_by_tags(&self, tags: &[String]) -> Vec<&PromptTemplate> {
        self.templates
            .values()
            .filter(|t| tags.iter().any(|tag| t.tags.contains(tag)))
            .collect()
    }

    /// Remove a template
    pub fn remove_template(&mut self, id: &str) -> Option<PromptTemplate> {
        self.templates.remove(id)
    }

    /// Render a template with variables
    pub fn render_template(
        &self,
        template_id: &str,
        variables: &HashMap<String, serde_json::Value>,
    ) -> Result<RenderedPrompt> {
        let template = self.get_template(template_id)
            .ok_or_else(|| AIError::TemplateError(format!("Template '{}' not found", template_id)))?;

        template.render(variables)
    }

    /// Get template categories
    pub fn get_categories(&self) -> Vec<String> {
        let mut categories: Vec<String> = self.templates
            .values()
            .map(|t| t.category.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        categories.sort();
        categories
    }

    /// Export templates to JSON
    pub fn export_templates(&self) -> Result<String> {
        serde_json::to_string_pretty(&self.templates.values().collect::<Vec<_>>())
            .map_err(|e| AIError::SerializationError(e))
    }

    /// Import templates from JSON
    pub fn import_templates(&mut self, json: &str) -> Result<usize> {
        let templates: Vec<PromptTemplate> = serde_json::from_str(json)
            .map_err(|e| AIError::SerializationError(e))?;

        let count = templates.len();
        for template in templates {
            self.add_template(template);
        }

        Ok(count)
    }
}

/// Helper functions to create default templates

fn create_case_study_template() -> PromptTemplate {
    PromptTemplate::new(
        "case_study_generation",
        "Case Study Generation",
        "Generate a comprehensive business case study",
        "generation",
        r#"Create a detailed business case study with the following requirements:

**Industry/Domain**: {{industry}}
**Difficulty Level**: {{difficulty_level}}
**Estimated Duration**: {{duration_minutes}} minutes
**Learning Objectives**: {{learning_objectives}}

**Case Study Requirements:**
1. **Title**: Create an engaging, specific title
2. **Company Background**: Describe a realistic company ({{company_size}} size)
3. **The Challenge**: Present a clear business problem or opportunity
4. **Context & Background**: Provide relevant industry context
5. **Key Stakeholders**: Identify important decision-makers and affected parties
6. **Available Data**: Include relevant financial, market, or operational data
7. **Constraints**: Mention budget, time, or other limitations

**Content Guidelines:**
- Make the scenario realistic and relatable
- Include enough detail for thorough analysis
- Avoid obvious solutions - create genuine decision complexity
- Include data that supports multiple valid approaches
- Consider international/cultural factors if relevant

**Tone**: Professional, engaging, case-study appropriate
**Length**: Approximately {{target_length}} words

Please create a complete case study following this structure."#
    )
    .with_system_prompt("You are an expert business case study author with 15+ years of experience creating educational content for top business schools. You excel at crafting realistic, engaging scenarios that challenge students to apply business frameworks and critical thinking.")
    .with_variable(TemplateVariable {
        name: "industry".to_string(),
        description: "The industry or business domain for the case study".to_string(),
        variable_type: VariableType::String,
        required: true,
        default_value: None,
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "difficulty_level".to_string(),
        description: "Difficulty level: beginner, intermediate, or advanced".to_string(),
        variable_type: VariableType::String,
        required: true,
        default_value: Some("intermediate".to_string()),
        validation_pattern: Some("^(beginner|intermediate|advanced)$".to_string()),
    })
    .with_variable(TemplateVariable {
        name: "duration_minutes".to_string(),
        description: "Estimated time to complete the case study in minutes".to_string(),
        variable_type: VariableType::Number,
        required: false,
        default_value: Some("60".to_string()),
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "learning_objectives".to_string(),
        description: "Comma-separated list of learning objectives".to_string(),
        variable_type: VariableType::String,
        required: false,
        default_value: Some("Strategic analysis, Decision making, Problem solving".to_string()),
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "company_size".to_string(),
        description: "Company size: startup, small, medium, large, or enterprise".to_string(),
        variable_type: VariableType::String,
        required: false,
        default_value: Some("medium".to_string()),
        validation_pattern: Some("^(startup|small|medium|large|enterprise)$".to_string()),
    })
    .with_variable(TemplateVariable {
        name: "target_length".to_string(),
        description: "Target word count for the case study".to_string(),
        variable_type: VariableType::Number,
        required: false,
        default_value: Some("800".to_string()),
        validation_pattern: None,
    })
    .with_tags(vec!["case-study".to_string(), "generation".to_string(), "business".to_string()])
}

fn create_question_template() -> PromptTemplate {
    PromptTemplate::new(
        "assessment_questions",
        "Assessment Questions Generation",
        "Generate assessment questions for a case study",
        "generation",
        r#"Create {{num_questions}} assessment questions for the following case study:

**Case Study Title**: {{case_study_title}}
**Case Study Summary**: {{case_study_summary}}
**Learning Objectives**: {{learning_objectives}}
**Difficulty Level**: {{difficulty_level}}

**Question Requirements:**
For each question, provide:
1. **Question Text**: Clear, specific question
2. **Question Type**: {{question_types}}
3. **Points**: Suggested scoring (out of {{max_points}} total)
4. **Sample Answer**: Example response or key points
5. **Rubric**: Evaluation criteria

**Question Guidelines:**
- Align with learning objectives
- Test different cognitive levels (knowledge, analysis, evaluation)
- Include both factual and analytical questions
- Ensure questions build on the case study content
- Vary question types for engagement

**Format**: Provide each question as a structured block with all required elements."#
    )
    .with_system_prompt("You are an educational assessment expert specializing in business case study evaluation. You create fair, comprehensive questions that effectively measure student understanding and analytical skills.")
    .with_variable(TemplateVariable {
        name: "case_study_title".to_string(),
        description: "Title of the case study".to_string(),
        variable_type: VariableType::String,
        required: true,
        default_value: None,
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "case_study_summary".to_string(),
        description: "Brief summary of the case study content".to_string(),
        variable_type: VariableType::String,
        required: true,
        default_value: None,
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "num_questions".to_string(),
        description: "Number of questions to generate".to_string(),
        variable_type: VariableType::Number,
        required: false,
        default_value: Some("3".to_string()),
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "difficulty_level".to_string(),
        description: "Difficulty level: beginner, intermediate, or advanced".to_string(),
        variable_type: VariableType::String,
        required: false,
        default_value: Some("intermediate".to_string()),
        validation_pattern: Some("^(beginner|intermediate|advanced)$".to_string()),
    })
    .with_variable(TemplateVariable {
        name: "question_types".to_string(),
        description: "Preferred question types (multiple_choice, short_answer, essay, analysis)".to_string(),
        variable_type: VariableType::String,
        required: false,
        default_value: Some("mix of multiple_choice, short_answer, and essay".to_string()),
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "learning_objectives".to_string(),
        description: "Learning objectives to assess".to_string(),
        variable_type: VariableType::String,
        required: false,
        default_value: Some("Critical thinking, Problem solving, Decision making".to_string()),
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "max_points".to_string(),
        description: "Maximum points per question".to_string(),
        variable_type: VariableType::Number,
        required: false,
        default_value: Some("10".to_string()),
        validation_pattern: None,
    })
    .with_tags(vec!["questions".to_string(), "assessment".to_string(), "evaluation".to_string()])
}

fn create_outline_template() -> PromptTemplate {
    PromptTemplate::new(
        "case_outline",
        "Case Study Outline",
        "Create a structured outline for a case study",
        "planning",
        r#"Create a detailed outline for a {{industry}} case study with the following specifications:

**Topic/Focus**: {{topic}}
**Target Audience**: {{target_audience}}
**Duration**: {{duration_minutes}} minutes
**Difficulty**: {{difficulty_level}}

**Outline Requirements:**
1. **Executive Summary** (key points overview)
2. **Learning Objectives** (3-5 specific objectives)
3. **Main Sections** with subsections:
   - Background & Context
   - The Challenge/Problem
   - Available Information/Data
   - Key Decisions Required
   - Constraints & Considerations
4. **Supporting Materials** needed
5. **Assessment Approach** recommendations
6. **Expected Outcomes**

**Additional Elements:**
- Suggested discussion points
- Recommended frameworks for analysis
- Prerequisites or background knowledge needed
- Extensions or follow-up activities

Please provide a comprehensive, well-structured outline that guides case study development."#
    )
    .with_system_prompt("You are a curriculum designer with expertise in business education and case-based learning. You excel at creating structured, pedagogically sound outlines that ensure comprehensive coverage of learning objectives.")
    .with_variable(TemplateVariable {
        name: "industry".to_string(),
        description: "Industry or domain focus".to_string(),
        variable_type: VariableType::String,
        required: true,
        default_value: None,
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "topic".to_string(),
        description: "Specific topic or theme for the case study".to_string(),
        variable_type: VariableType::String,
        required: true,
        default_value: None,
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "target_audience".to_string(),
        description: "Target audience (e.g., undergraduate, MBA, executive education)".to_string(),
        variable_type: VariableType::String,
        required: false,
        default_value: Some("undergraduate business students".to_string()),
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "duration_minutes".to_string(),
        description: "Expected completion time in minutes".to_string(),
        variable_type: VariableType::Number,
        required: false,
        default_value: Some("90".to_string()),
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "difficulty_level".to_string(),
        description: "Difficulty level: beginner, intermediate, or advanced".to_string(),
        variable_type: VariableType::String,
        required: false,
        default_value: Some("intermediate".to_string()),
        validation_pattern: Some("^(beginner|intermediate|advanced)$".to_string()),
    })
    .with_tags(vec!["outline".to_string(), "planning".to_string(), "structure".to_string()])
}

fn create_background_template() -> PromptTemplate {
    PromptTemplate::new(
        "background_info",
        "Background Information",
        "Generate comprehensive background information for a case study",
        "content",
        r#"Create detailed background information for a case study about {{company_name}} in the {{industry}} industry:

**Company Profile:**
- Company overview and history
- Size and scope of operations  
- Key products/services
- Market position and competitive landscape
- Financial performance overview
- Organizational structure and key personnel

**Industry Context:**
- Industry overview and trends
- Key market drivers and challenges
- Regulatory environment
- Major competitors and market dynamics
- Technology impacts and disruptions
- Future outlook and opportunities

**Relevant Background:**
- Economic conditions affecting the industry
- Cultural/social factors (if applicable)
- Recent events or changes impacting the sector
- Historical context that shapes current situation

**Data and Metrics:**
Include relevant quantitative information such as:
- Market size and growth rates
- Company financial highlights
- Industry benchmarks
- Performance indicators

Keep the background informative but concise, focusing on information that will be relevant to the case study analysis and decision-making process."#
    )
    .with_system_prompt("You are a business research analyst with deep expertise across multiple industries. You excel at synthesizing complex market and company information into clear, relevant background context that supports case study analysis.")
    .with_variable(TemplateVariable {
        name: "company_name".to_string(),
        description: "Name of the company featured in the case study".to_string(),
        variable_type: VariableType::String,
        required: true,
        default_value: None,
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "industry".to_string(),
        description: "Industry or sector".to_string(),
        variable_type: VariableType::String,
        required: true,
        default_value: None,
        validation_pattern: None,
    })
    .with_tags(vec!["background".to_string(), "research".to_string(), "context".to_string()])
}

fn create_analysis_framework_template() -> PromptTemplate {
    PromptTemplate::new(
        "analysis_framework",
        "Analysis Framework",
        "Provide analysis framework guidance for case study",
        "guidance",
        r#"Provide a comprehensive analysis framework for students working on the {{case_title}} case study:

**Recommended Analysis Frameworks:**
Suggest 2-3 relevant business frameworks that would be most appropriate for this case, such as:
- Strategic frameworks (Porter's Five Forces, SWOT, Value Chain, etc.)
- Financial analysis tools (Ratio analysis, DCF, NPV, etc.)
- Operational frameworks (Lean, Six Sigma, Process mapping, etc.)
- Marketing frameworks (4Ps, STP, Customer journey, etc.)

**Step-by-Step Analysis Approach:**
1. **Problem Definition**: How to clearly articulate the central issue
2. **Data Collection & Organization**: What information to gather and prioritize
3. **Framework Application**: How to systematically apply chosen frameworks
4. **Alternative Generation**: Process for developing multiple solution options
5. **Evaluation Criteria**: How to assess and compare alternatives
6. **Recommendation Development**: Structure for final recommendations

**Key Questions to Consider:**
Provide 5-7 strategic questions that should guide the analysis process.

**Common Pitfalls to Avoid:**
List potential mistakes or oversights students should watch for.

**Success Criteria:**
Describe what constitutes a strong analysis and recommendation.

Focus on {{focus_area}} aspects while maintaining a holistic view of the business situation."#
    )
    .with_system_prompt("You are a strategy consultant and business school professor who specializes in teaching analytical thinking and framework application. You excel at guiding students through structured problem-solving approaches.")
    .with_variable(TemplateVariable {
        name: "case_title".to_string(),
        description: "Title of the case study".to_string(),
        variable_type: VariableType::String,
        required: true,
        default_value: None,
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "focus_area".to_string(),
        description: "Primary focus area (strategy, finance, marketing, operations, etc.)".to_string(),
        variable_type: VariableType::String,
        required: false,
        default_value: Some("strategy".to_string()),
        validation_pattern: None,
    })
    .with_tags(vec!["framework".to_string(), "analysis".to_string(), "methodology".to_string()])
}

fn create_sample_solution_template() -> PromptTemplate {
    PromptTemplate::new(
        "sample_solution",
        "Sample Solution",
        "Generate a sample solution for case study analysis",
        "solution",
        r#"Provide a comprehensive sample solution for the {{case_title}} case study:

**Executive Summary:**
Provide a clear, concise summary of the key findings and recommendations.

**Problem Analysis:**
- Clear problem statement
- Root cause analysis
- Key stakeholder impacts
- Urgency and importance assessment

**Framework Application:**
Demonstrate how to apply relevant business frameworks:
{{frameworks_used}}

**Alternative Solutions:**
Present 2-3 viable alternatives with:
- Description of each option
- Pros and cons analysis
- Resource requirements
- Risk assessment
- Expected outcomes

**Recommended Solution:**
- Detailed recommendation with clear rationale
- Implementation plan with timeline
- Resource allocation requirements
- Success metrics and KPIs
- Risk mitigation strategies

**Financial Analysis:**
Include relevant financial considerations:
- Cost-benefit analysis
- ROI projections
- Budget requirements
- Financial risks and assumptions

**Implementation Considerations:**
- Change management requirements
- Organizational capabilities needed
- Timeline and milestones
- Communication strategy
- Monitoring and adjustment mechanisms

**Conclusion:**
Summarize why this solution best addresses the case study challenges and aligns with organizational objectives.

Note: This is one possible approach - encourage students to consider alternative perspectives and solutions."#
    )
    .with_system_prompt("You are a senior business consultant with 20+ years of experience solving complex business problems. You provide thorough, well-reasoned solutions while acknowledging that multiple valid approaches may exist.")
    .with_variable(TemplateVariable {
        name: "case_title".to_string(),
        description: "Title of the case study".to_string(),
        variable_type: VariableType::String,
        required: true,
        default_value: None,
        validation_pattern: None,
    })
    .with_variable(TemplateVariable {
        name: "frameworks_used".to_string(),
        description: "Business frameworks that should be applied in the solution".to_string(),
        variable_type: VariableType::String,
        required: false,
        default_value: Some("SWOT Analysis, Porter's Five Forces, Financial Analysis".to_string()),
        validation_pattern: None,
    })
    .with_tags(vec!["solution".to_string(), "example".to_string(), "analysis".to_string()])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_template_creation() {
        let template = PromptTemplate::new(
            "test",
            "Test Template",
            "A test template",
            "test",
            "Hello {{name}}!"
        );

        assert_eq!(template.id, "test");
        assert_eq!(template.name, "Test Template");
        assert_eq!(template.user_prompt, "Hello {{name}}!");
    }

    #[test]
    fn test_template_rendering() {
        let mut template = PromptTemplate::new(
            "test",
            "Test Template", 
            "A test template",
            "test",
            "Hello {{name}}!"
        );

        template = template.with_variable(TemplateVariable {
            name: "name".to_string(),
            description: "Name to greet".to_string(),
            variable_type: VariableType::String,
            required: true,
            default_value: None,
            validation_pattern: None,
        });

        let mut variables = HashMap::new();
        variables.insert("name".to_string(), serde_json::json!("World"));

        let rendered = template.render(&variables).unwrap();
        assert_eq!(rendered.user_prompt, "Hello World!");
    }

    #[test]
    fn test_variable_validation() {
        let template = PromptTemplate::new(
            "test",
            "Test Template",
            "A test template", 
            "test",
            "Hello {{name}}!"
        ).with_variable(TemplateVariable {
            name: "name".to_string(),
            description: "Name to greet".to_string(),
            variable_type: VariableType::String,
            required: true,
            default_value: None,
            validation_pattern: Some("^[A-Za-z]+$".to_string()),
        });

        let mut variables = HashMap::new();
        variables.insert("name".to_string(), serde_json::json!("ValidName"));
        assert!(template.validate_variables(&variables).is_ok());

        variables.insert("name".to_string(), serde_json::json!("Invalid123"));
        assert!(template.validate_variables(&variables).is_err());
    }

    #[test]
    fn test_prompt_manager() {
        let mut manager = PromptManager::new();
        
        let template = PromptTemplate::new(
            "test",
            "Test Template",
            "A test template",
            "test",
            "Hello {{name}}!"
        );

        manager.add_template(template);
        assert!(manager.get_template("test").is_some());
        assert_eq!(manager.list_templates().len(), 1);
    }

    #[test]
    fn test_default_templates() {
        let mut manager = PromptManager::new();
        manager.load_default_templates();
        
        assert!(manager.get_template("case_study_generation").is_some());
        assert!(manager.get_template("assessment_questions").is_some());
        assert!(manager.get_template("case_outline").is_some());
        assert!(manager.list_templates().len() >= 6);
    }
}