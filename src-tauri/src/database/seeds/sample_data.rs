// Sample data templates for database seeding

use crate::database::models::*;
use chrono::{DateTime, Utc};

/// Generate sample users
pub fn get_sample_users(max_users: usize) -> Vec<NewUser> {
    let users = vec![
        NewUser {
            username: "admin".to_string(),
            email: Some("admin@casecrafter.dev".to_string()),
            full_name: Some("System Administrator".to_string()),
            password_hash: Some("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4vYA5K8r0m".to_string()), // "admin123"
            role: Some("admin".to_string()),
            preferences: Some(r#"{"theme": "dark", "notifications": true, "language": "en"}"#.to_string()),
        },
        NewUser {
            username: "instructor_jones".to_string(),
            email: Some("sarah.jones@university.edu".to_string()),
            full_name: Some("Dr. Sarah Jones".to_string()),
            password_hash: Some("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4vYA5K8r0m".to_string()),
            role: Some("instructor".to_string()),
            preferences: Some(r#"{"theme": "light", "notifications": true, "email_digest": "weekly"}"#.to_string()),
        },
        NewUser {
            username: "instructor_smith".to_string(),
            email: Some("michael.smith@business.edu".to_string()),
            full_name: Some("Prof. Michael Smith".to_string()),
            password_hash: Some("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4vYA5K8r0m".to_string()),
            role: Some("instructor".to_string()),
            preferences: Some(r#"{"theme": "light", "notifications": false, "auto_save": true}"#.to_string()),
        },
        NewUser {
            username: "student_alice".to_string(),
            email: Some("alice.cooper@student.edu".to_string()),
            full_name: Some("Alice Cooper".to_string()),
            password_hash: Some("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4vYA5K8r0m".to_string()),
            role: Some("user".to_string()),
            preferences: Some(r#"{"theme": "dark", "notifications": true, "study_reminders": true}"#.to_string()),
        },
        NewUser {
            username: "student_bob".to_string(),
            email: Some("bob.wilson@student.edu".to_string()),
            full_name: Some("Bob Wilson".to_string()),
            password_hash: Some("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4vYA5K8r0m".to_string()),
            role: Some("user".to_string()),
            preferences: Some(r#"{"theme": "light", "notifications": true, "difficulty_preference": "intermediate"}"#.to_string()),
        },
        NewUser {
            username: "student_carol".to_string(),
            email: Some("carol.davis@student.edu".to_string()),
            full_name: Some("Carol Davis".to_string()),
            password_hash: Some("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4vYA5K8r0m".to_string()),
            role: Some("user".to_string()),
            preferences: Some(r#"{"theme": "dark", "notifications": false, "progress_tracking": true}"#.to_string()),
        },
        NewUser {
            username: "demo_user".to_string(),
            email: Some("demo@casecrafter.dev".to_string()),
            full_name: Some("Demo User".to_string()),
            password_hash: Some("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4vYA5K8r0m".to_string()),
            role: Some("user".to_string()),
            preferences: Some(r#"{"theme": "light", "notifications": true, "tutorial_completed": false}"#.to_string()),
        },
        NewUser {
            username: "researcher_kim".to_string(),
            email: Some("dr.kim@research.org".to_string()),
            full_name: Some("Dr. Jennifer Kim".to_string()),
            password_hash: Some("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4vYA5K8r0m".to_string()),
            role: Some("instructor".to_string()),
            preferences: Some(r#"{"theme": "dark", "notifications": true, "research_mode": true}"#.to_string()),
        },
        NewUser {
            username: "guest_user".to_string(),
            email: None,
            full_name: Some("Guest User".to_string()),
            password_hash: None,
            role: Some("user".to_string()),
            preferences: Some(r#"{"theme": "light", "notifications": false, "guest_mode": true}"#.to_string()),
        },
        NewUser {
            username: "test_instructor".to_string(),
            email: Some("test@casecrafter.dev".to_string()),
            full_name: Some("Test Instructor".to_string()),
            password_hash: Some("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4vYA5K8r0m".to_string()),
            role: Some("instructor".to_string()),
            preferences: Some(r#"{"theme": "light", "notifications": true, "testing_mode": true}"#.to_string()),
        },
    ];

    users.into_iter().take(max_users).collect()
}

/// Generate sample domains
pub fn get_sample_domains() -> Vec<NewDomain> {
    vec![
        NewDomain {
            name: "Business Strategy".to_string(),
            description: Some("Strategic planning, competitive analysis, and business model development".to_string()),
            color: Some("#1976d2".to_string()), // Blue
            icon: Some("strategy".to_string()),
        },
        NewDomain {
            name: "Marketing".to_string(),
            description: Some("Digital marketing, brand management, customer acquisition, and market research".to_string()),
            color: Some("#388e3c".to_string()), // Green
            icon: Some("marketing".to_string()),
        },
        NewDomain {
            name: "Finance".to_string(),
            description: Some("Financial analysis, investment decisions, budgeting, and risk management".to_string()),
            color: Some("#f57c00".to_string()), // Orange
            icon: Some("finance".to_string()),
        },
        NewDomain {
            name: "Operations".to_string(),
            description: Some("Supply chain management, process optimization, and operational efficiency".to_string()),
            color: Some("#7b1fa2".to_string()), // Purple
            icon: Some("operations".to_string()),
        },
        NewDomain {
            name: "Human Resources".to_string(),
            description: Some("Talent management, organizational behavior, and workplace culture".to_string()),
            color: Some("#c62828".to_string()), // Red
            icon: Some("hr".to_string()),
        },
        NewDomain {
            name: "Technology".to_string(),
            description: Some("Digital transformation, IT strategy, and technology implementation".to_string()),
            color: Some("#00796b".to_string()), // Teal
            icon: Some("technology".to_string()),
        },
        NewDomain {
            name: "Healthcare".to_string(),
            description: Some("Healthcare management, patient care, and medical administration".to_string()),
            color: Some("#455a64".to_string()), // Blue Grey
            icon: Some("healthcare".to_string()),
        },
    ]
}

/// Generate sample case study templates
pub fn get_sample_case_studies() -> Vec<NewCaseStudy> {
    vec![
        NewCaseStudy {
            title: "Market Entry Strategy Challenge".to_string(),
            description: Some("A comprehensive case study examining market entry strategies for a growing technology company".to_string()),
            domain_id: 1, // Will be replaced with actual domain_id
            template_id: None,
            difficulty_level: Some("intermediate".to_string()),
            estimated_duration: Some(90),
            learning_objectives: Some(r#"["Analyze market opportunities", "Develop entry strategies", "Assess competitive landscape", "Create implementation timeline"]"#.to_string()),
            tags: Some(r#"["strategy", "market-entry", "competition", "planning"]"#.to_string()),
            content: "# Market Entry Strategy Challenge\n\n## Background\n\nTechFlow Solutions is a mid-size software company that has successfully operated in the domestic market for the past 5 years. The company specializes in workflow automation tools for small to medium-sized businesses and has achieved steady growth with annual revenues of $50 million.\n\n## The Challenge\n\nWith increasing competition in the domestic market and growing international demand for their products, TechFlow's leadership team is considering expanding into international markets. However, they face several challenges:\n\n1. **Limited International Experience**: The management team has no prior experience with international expansion\n2. **Resource Constraints**: The company has limited financial resources for a major expansion\n3. **Market Uncertainty**: Unknown customer preferences and competitive landscape in target markets\n4. **Regulatory Complexities**: Different legal and regulatory requirements across potential markets\n\n## Market Analysis\n\nInitial research has identified three potential markets:\n\n### Option A: European Union\n- Large, mature market with high purchasing power\n- Strict data protection regulations (GDPR)\n- Established competitors with strong market presence\n- High customer expectations for localization\n\n### Option B: Southeast Asia\n- Rapidly growing economies with increasing digitization\n- Lower regulatory barriers\n- Price-sensitive customers\n- Diverse markets requiring different approaches\n\n### Option C: Latin America\n- Emerging market with significant growth potential\n- Language barriers (Spanish/Portuguese)\n- Economic volatility in some regions\n- Growing demand for business automation\n\n## Financial Considerations\n\nTechFlow has allocated $5 million for international expansion over the next two years. This budget must cover:\n- Market research and validation\n- Product localization and adaptation\n- Marketing and customer acquisition\n- Legal and regulatory compliance\n- Operational setup (offices, staff, partnerships)\n\n## Your Task\n\nAs a strategic consultant hired by TechFlow Solutions, you need to:\n\n1. **Evaluate each market option** using appropriate strategic frameworks\n2. **Recommend the most suitable market** for initial expansion\n3. **Develop a detailed entry strategy** including timeline and resource allocation\n4. **Identify key risks and mitigation strategies**\n5. **Create success metrics** to measure the expansion's progress\n\n## Available Resources\n\n- Market research reports (provided separately)\n- Financial projections and budget details\n- Product specifications and technical requirements\n- Competitive analysis of major players in each market\n- Customer interviews from preliminary market research".to_string(),
            background_info: Some("TechFlow Solutions was founded in 2018 by two software engineers who identified a gap in the workflow automation market for SMBs. The company has grown organically without external funding, maintaining a lean operation with 150 employees across development, sales, and support teams.".to_string()),
            problem_statement: Some("How should TechFlow Solutions approach international expansion to maximize growth while minimizing risk, given their limited resources and lack of international experience?".to_string()),
            analysis_framework: Some("Students should apply Porter's Five Forces, SWOT analysis, and market entry mode frameworks. Consider using the CAGE framework (Cultural, Administrative, Geographic, Economic) to evaluate market attractiveness.".to_string()),
            sample_solution: Some("Recommended approach: Start with Southeast Asia (specifically Singapore and Malaysia) due to lower barriers to entry, English language proficiency, and strong demand for business automation. Use a phased approach with digital-first market entry, followed by local partnerships.".to_string()),
            metadata: Some(r#"{"industry": "Technology", "company_size": "Medium", "case_type": "Strategic Decision", "data_sources": ["interviews", "market_research", "financial_data"]}"#.to_string()),
            status: Some("published".to_string()),
            created_by: 1, // Will be replaced with actual user_id
        },
        NewCaseStudy {
            title: "Customer Retention Crisis".to_string(),
            description: Some("A retail company faces declining customer loyalty and needs to develop effective retention strategies".to_string()),
            domain_id: 2, // Marketing domain
            template_id: None,
            difficulty_level: Some("beginner".to_string()),
            estimated_duration: Some(60),
            learning_objectives: Some(r#"["Identify customer retention drivers", "Analyze customer behavior data", "Design retention programs", "Measure program effectiveness"]"#.to_string()),
            tags: Some(r#"["retention", "customer-loyalty", "marketing", "analytics"]"#.to_string()),
            content: "# Customer Retention Crisis at RetailCorp\n\n## Company Overview\n\nRetailCorp is a mid-sized fashion retailer with 50 stores across the United States and a growing e-commerce presence. Founded 15 years ago, the company has built a reputation for trendy, affordable clothing targeting millennials and Gen Z consumers.\n\n## The Problem\n\nOver the past 18 months, RetailCorp has experienced a significant decline in customer retention:\n\n- Customer repeat purchase rate dropped from 65% to 45%\n- Average customer lifetime value decreased by 30%\n- Customer acquisition costs increased by 25%\n- Net Promoter Score (NPS) fell from 8.2 to 6.1\n\n## Current Situation\n\n### Customer Segmentation Analysis\nRecent data analysis revealed three main customer segments:\n\n1. **Loyal Advocates (20%)**: High-value customers who shop frequently and recommend the brand\n2. **Occasional Shoppers (50%)**: Customers who shop 2-3 times per year, often during sales\n3. **One-time Buyers (30%)**: Customers who made only one purchase and never returned\n\n### Competitive Landscape\nNew competitors have entered the market with:\n- More personalized shopping experiences\n- Better loyalty programs\n- Superior customer service\n- Stronger social media presence\n\n### Customer Feedback\nRecent surveys and reviews indicate:\n- Dissatisfaction with product quality consistency\n- Frustration with customer service response times\n- Lack of personalized recommendations\n- Limited engagement between purchases\n\n## Available Data\n\n- 2-year customer transaction history\n- Customer service interaction logs\n- Social media engagement metrics\n- Competitor loyalty program analysis\n- Market research on customer preferences\n\n## Your Challenge\n\nAs the newly hired Customer Experience Manager, you must:\n\n1. **Analyze the root causes** of declining customer retention\n2. **Develop a comprehensive retention strategy** targeting each customer segment\n3. **Design specific retention programs** with clear objectives and tactics\n4. **Create an implementation timeline** with resource requirements\n5. **Establish KPIs** to measure program success\n\n## Constraints\n\n- Limited budget of $500,000 for retention initiatives\n- Must show measurable results within 6 months\n- Cannot significantly change product lines or pricing\n- Must work within existing technology infrastructure".to_string(),
            background_info: Some("RetailCorp has traditionally focused on customer acquisition rather than retention, with most marketing budget allocated to social media advertising and influencer partnerships. The company has basic CRM capabilities but limited customer analytics.".to_string()),
            problem_statement: Some("How can RetailCorp reverse the declining customer retention trend and build a sustainable competitive advantage through improved customer loyalty?".to_string()),
            analysis_framework: Some("Apply customer lifecycle analysis, RFM (Recency, Frequency, Monetary) segmentation, and design thinking principles. Consider using the customer retention funnel and Net Promoter Score framework for measurement.".to_string()),
            sample_solution: Some("Implement a tiered loyalty program with personalized rewards, improve customer service training, launch targeted re-engagement campaigns for each segment, and establish a customer feedback loop for continuous improvement.".to_string()),
            metadata: Some(r#"{"industry": "Retail", "company_size": "Medium", "case_type": "Marketing Strategy", "data_sources": ["transaction_data", "surveys", "competitor_analysis"]}"#.to_string()),
            status: Some("published".to_string()),
            created_by: 1,
        },
        NewCaseStudy {
            title: "Financial Restructuring Decision".to_string(),
            description: Some("A manufacturing company must decide how to restructure its debt and optimize its capital structure during financial distress".to_string()),
            domain_id: 3, // Finance domain
            template_id: None,
            difficulty_level: Some("advanced".to_string()),
            estimated_duration: Some(120),
            learning_objectives: Some(r#"["Analyze financial statements", "Evaluate debt restructuring options", "Assess impact on stakeholders", "Recommend optimal capital structure"]"#.to_string()),
            tags: Some(r#"["finance", "restructuring", "debt", "capital-structure"]"#.to_string()),
            content: "# Financial Restructuring at ManuTech Industries\n\n## Company Background\n\nManuTech Industries is a 25-year-old manufacturing company specializing in automotive components. The company employs 800 people across three facilities and has annual revenues of $200 million. Historically profitable, ManuTech has faced significant challenges due to:\n\n- Declining automotive industry demand\n- Increased competition from low-cost international suppliers\n- High debt burden from recent facility expansion\n- Rising raw material costs\n\n## Financial Crisis\n\nManuTech is experiencing severe financial distress:\n\n### Current Financial Position\n- Total debt: $150 million\n- Cash on hand: $8 million\n- Monthly cash burn: $3 million\n- Credit line: $10 million (nearly exhausted)\n- Debt service payments: $18 million annually\n\n### Recent Performance\n- Revenue declined 30% over past two years\n- Operating margins dropped from 12% to -5%\n- Working capital requirements increased due to slower collections\n- Bond covenant violations imminent\n\n## Stakeholder Positions\n\n### Banks and Lenders\n- Concerned about loan repayment ability\n- Demanding additional collateral and restrictions\n- Considering calling in loans\n\n### Bondholders\n- Hold $100 million in corporate bonds\n- Seeking assurance of continued interest payments\n- Considering legal action for covenant violations\n\n### Employees and Union\n- Worried about job security\n- Demanding pension and healthcare protection\n- Threatening strike action\n\n### Customers\n- Concerned about supply chain reliability\n- Some considering alternative suppliers\n- Requiring service level guarantees\n\n### Shareholders\n- Facing potential total loss of investment\n- Divided on restructuring vs. liquidation\n- Family ownership complicates decision-making\n\n## Restructuring Options\n\n### Option 1: Out-of-Court Restructuring\n- Negotiate debt reduction with creditors\n- Extend payment terms\n- Asset sales to raise cash\n- Cost reduction program\n\n### Option 2: Chapter 11 Bankruptcy\n- Court-supervised reorganization\n- Automatic stay on debt payments\n- Ability to reject unfavorable contracts\n- Potential for significant debt reduction\n\n### Option 3: Asset Sale/Merger\n- Sell company or major assets\n- Merge with industry competitor\n- Private equity acquisition\n- Liquidation of non-core assets\n\n## Financial Projections\n\nManagement has developed three scenarios:\n\n### Base Case\n- Revenue stabilizes at current levels\n- Margins improve to 5% through cost cuts\n- Requires $25 million in additional funding\n\n### Optimistic Case\n- Revenue recovers to 90% of peak levels\n- Margins reach 8% through operational improvements\n- Generates positive cash flow within 18 months\n\n### Pessimistic Case\n- Revenue continues declining 10% annually\n- Margins remain negative\n- Liquidation becomes necessary\n\n## Your Assignment\n\nAs the financial advisor hired by ManuTech's board of directors:\n\n1. **Analyze the financial statements** and assess the company's current position\n2. **Evaluate each restructuring option** considering costs, benefits, and stakeholder impacts\n3. **Develop detailed financial projections** for your recommended scenario\n4. **Create an implementation plan** with specific timelines and milestones\n5. **Address stakeholder concerns** and develop communication strategy\n6. **Identify key risks** and develop contingency plans\n\n## Available Resources\n\n- 5 years of audited financial statements\n- Industry analysis and benchmarking data\n- Legal and regulatory requirements\n- Stakeholder agreements and contracts\n- Market valuation estimates".to_string(),
            background_info: Some("ManuTech was founded by the Johnson family and grew rapidly during the automotive boom of the 2000s. The company took on significant debt in 2019 to expand facilities, just before the market downturn began.".to_string()),
            problem_statement: Some("What is the optimal restructuring strategy for ManuTech Industries that maximizes stakeholder value while ensuring business continuity?".to_string()),
            analysis_framework: Some("Use financial ratio analysis, discounted cash flow modeling, and stakeholder analysis. Apply bankruptcy prediction models (Altman Z-score) and consider agency theory in evaluating options.".to_string()),
            sample_solution: Some("Recommend out-of-court restructuring with debt-for-equity swap, combined with asset sales and operational improvements. This preserves jobs while providing creditors with upside participation in recovery.".to_string()),
            metadata: Some(r#"{"industry": "Manufacturing", "company_size": "Large", "case_type": "Financial Analysis", "complexity": "High"}"#.to_string()),
            status: Some("published".to_string()),
            created_by: 1,
        },
    ]
}

/// Customize case study for specific domain
pub fn customize_case_study_for_domain(template: &NewCaseStudy, domain_index: usize, case_index: usize) -> NewCaseStudy {
    let domain_suffixes = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta"];
    let case_suffixes = ["A", "B", "C", "D", "E"];
    
    let suffix = format!(" - {}{}", 
        domain_suffixes.get(domain_index).unwrap_or(&"X"),
        case_suffixes.get(case_index).unwrap_or(&"1")
    );

    NewCaseStudy {
        title: format!("{}{}", template.title, suffix),
        description: template.description.clone(),
        domain_id: template.domain_id, // Will be set by caller
        template_id: template.template_id,
        difficulty_level: template.difficulty_level.clone(),
        estimated_duration: template.estimated_duration,
        learning_objectives: template.learning_objectives.clone(),
        tags: template.tags.clone(),
        content: template.content.clone(),
        background_info: template.background_info.clone(),
        problem_statement: template.problem_statement.clone(),
        analysis_framework: template.analysis_framework.clone(),
        sample_solution: template.sample_solution.clone(),
        metadata: template.metadata.clone(),
        status: template.status.clone(),
        created_by: template.created_by,
    }
}

/// Generate sample assessment questions
pub fn get_sample_assessment_questions() -> Vec<NewAssessmentQuestion> {
    vec![
        NewAssessmentQuestion {
            case_study_id: 1, // Will be replaced
            question_text: "What are the key factors that should influence the market entry decision?".to_string(),
            question_type: "essay".to_string(),
            options: None,
            correct_answer: None,
            sample_answer: Some("Key factors include market size and growth potential, competitive landscape, regulatory environment, cultural fit, resource requirements, and strategic alignment with company capabilities.".to_string()),
            rubric: Some(r#"{"criteria": [{"name": "Analysis Depth", "points": 4}, {"name": "Use of Frameworks", "points": 3}, {"name": "Practical Recommendations", "points": 3}]}"#.to_string()),
            points: Some(10),
            order_index: Some(1),
            is_required: Some(true),
        },
        NewAssessmentQuestion {
            case_study_id: 1,
            question_text: "Which market entry mode would be most appropriate for this situation?".to_string(),
            question_type: "multiple_choice".to_string(),
            options: Some(r#"["Direct Export", "Joint Venture", "Licensing", "Wholly Owned Subsidiary", "Franchising"]"#.to_string()),
            correct_answer: Some("Joint Venture".to_string()),
            sample_answer: Some("Joint venture provides the best balance of control, risk sharing, and local market knowledge for a company with limited international experience.".to_string()),
            rubric: Some(r#"{"criteria": [{"name": "Correct Answer", "points": 5}, {"name": "Justification", "points": 5}]}"#.to_string()),
            points: Some(10),
            order_index: Some(2),
            is_required: Some(true),
        },
        NewAssessmentQuestion {
            case_study_id: 1,
            question_text: "Analyze the potential risks and mitigation strategies for your recommended approach.".to_string(),
            question_type: "analysis".to_string(),
            options: None,
            correct_answer: None,
            sample_answer: Some("Primary risks include currency fluctuation, regulatory changes, cultural misunderstanding, and competitive response. Mitigation strategies should include hedging, legal compliance monitoring, cultural training, and competitive intelligence.".to_string()),
            rubric: Some(r#"{"criteria": [{"name": "Risk Identification", "points": 5}, {"name": "Mitigation Strategies", "points": 5}, {"name": "Implementation Feasibility", "points": 5}]}"#.to_string()),
            points: Some(15),
            order_index: Some(3),
            is_required: Some(false),
        },
    ]
}

/// Customize question for specific case study
pub fn customize_question_for_case_study(template: &NewAssessmentQuestion, case_study_id: i64, question_index: usize) -> NewAssessmentQuestion {
    NewAssessmentQuestion {
        case_study_id,
        question_text: template.question_text.clone(),
        question_type: template.question_type.clone(),
        options: template.options.clone(),
        correct_answer: template.correct_answer.clone(),
        sample_answer: template.sample_answer.clone(),
        rubric: template.rubric.clone(),
        points: template.points,
        order_index: Some(question_index as i64 + 1),
        is_required: template.is_required,
    }
}

/// Generate sample app settings
pub fn get_sample_app_settings() -> Vec<NewAppSetting> {
    vec![
        NewAppSetting {
            key: "app.default_language".to_string(),
            value: "en".to_string(),
            data_type: Some("string".to_string()),
            description: Some("Default application language".to_string()),
            is_user_configurable: Some(true),
        },
        NewAppSetting {
            key: "app.theme.default".to_string(),
            value: "light".to_string(),
            data_type: Some("string".to_string()),
            description: Some("Default application theme".to_string()),
            is_user_configurable: Some(true),
        },
        NewAppSetting {
            key: "backup.auto_enabled".to_string(),
            value: "true".to_string(),
            data_type: Some("boolean".to_string()),
            description: Some("Enable automatic backups".to_string()),
            is_user_configurable: Some(false),
        },
        NewAppSetting {
            key: "backup.interval_hours".to_string(),
            value: "24".to_string(),
            data_type: Some("number".to_string()),
            description: Some("Backup interval in hours".to_string()),
            is_user_configurable: Some(false),
        },
        NewAppSetting {
            key: "ai.default_provider".to_string(),
            value: "ollama".to_string(),
            data_type: Some("string".to_string()),
            description: Some("Default AI provider for content generation".to_string()),
            is_user_configurable: Some(true),
        },
        NewAppSetting {
            key: "content.max_case_studies".to_string(),
            value: "1000".to_string(),
            data_type: Some("number".to_string()),
            description: Some("Maximum number of case studies per user".to_string()),
            is_user_configurable: Some(false),
        },
        NewAppSetting {
            key: "ui.compact_mode".to_string(),
            value: "false".to_string(),
            data_type: Some("boolean".to_string()),
            description: Some("Enable compact UI mode".to_string()),
            is_user_configurable: Some(true),
        },
        NewAppSetting {
            key: "notifications.email_enabled".to_string(),
            value: "true".to_string(),
            data_type: Some("boolean".to_string()),
            description: Some("Enable email notifications".to_string()),
            is_user_configurable: Some(true),
        },
        NewAppSetting {
            key: "analytics.collect_usage".to_string(),
            value: "false".to_string(),
            data_type: Some("boolean".to_string()),
            description: Some("Collect anonymous usage analytics".to_string()),
            is_user_configurable: Some(true),
        },
        NewAppSetting {
            key: "security.session_timeout".to_string(),
            value: "3600".to_string(),
            data_type: Some("number".to_string()),
            description: Some("Session timeout in seconds".to_string()),
            is_user_configurable: Some(false),
        },
    ]
}

/// Generate user progress data
pub fn generate_user_progress(user_id: i64, case_study_id: i64, index: usize) -> NewUserProgress {
    let statuses = ["not_started", "in_progress", "completed", "reviewed"];
    let status = statuses[index % statuses.len()];
    
    let (time_spent, score, completed_at) = match status {
        "not_started" => (Some(0), None, None),
        "in_progress" => (Some(1800 + (index * 600) as i64), None, None), // 30-90 minutes
        "completed" => (Some(3600 + (index * 300) as i64), Some(75.0 + (index as f64 * 5.0) % 25.0), Some("2024-01-15T10:30:00Z".parse::<DateTime<Utc>>().ok())),
        "reviewed" => (Some(4200 + (index * 450) as i64), Some(80.0 + (index as f64 * 3.0) % 20.0), Some("2024-01-10T14:20:00Z".parse::<DateTime<Utc>>().ok())),
        _ => (Some(0), None, None),
    };

    let answers = if status == "completed" || status == "reviewed" {
        Some(format!(r#"{{"q1": "Market analysis shows strong potential in Southeast Asia...", "q2": "Joint venture approach recommended", "q3": "Risk mitigation through local partnerships"}}"#))
    } else {
        None
    };

    let notes = if index % 3 == 0 {
        Some("Student showed good analytical thinking but needs to improve framework application.".to_string())
    } else {
        None
    };

    NewUserProgress {
        user_id,
        case_study_id,
        status: Some(status.to_string()),
        time_spent,
        answers,
        score,
        feedback: None,
        notes,
        started_at: "2024-01-01T09:00:00Z".parse::<DateTime<Utc>>().ok(),
    }
}

/// Generate sample collections
pub fn get_sample_collections() -> Vec<NewCollection> {
    vec![
        NewCollection {
            name: "Strategic Management Fundamentals".to_string(),
            description: Some("A curated collection of case studies covering core strategic management concepts".to_string()),
            is_public: Some(true),
            created_by: 1, // Will be replaced
        },
        NewCollection {
            name: "Marketing Analytics in Practice".to_string(),
            description: Some("Real-world marketing cases focusing on data-driven decision making".to_string()),
            is_public: Some(true),
            created_by: 1,
        },
        NewCollection {
            name: "Financial Crisis Management".to_string(),
            description: Some("Advanced cases dealing with financial distress and restructuring".to_string()),
            is_public: Some(false),
            created_by: 1,
        },
        NewCollection {
            name: "Technology Disruption Cases".to_string(),
            description: Some("Cases examining how technology transforms industries and business models".to_string()),
            is_public: Some(true),
            created_by: 1,
        },
        NewCollection {
            name: "Beginner's Business Cases".to_string(),
            description: Some("Introductory case studies perfect for students new to business analysis".to_string()),
            is_public: Some(true),
            created_by: 1,
        },
    ]
}