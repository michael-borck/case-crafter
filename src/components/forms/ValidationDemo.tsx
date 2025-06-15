// Demo showcasing advanced cross-field validation capabilities

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Button,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { DynamicForm } from './DynamicForm';
import { ValidationRuleBuilder } from './ValidationRuleBuilder';
import {
  ConfigurationSchema,
  CrossFieldValidation,
  FIELD_TYPES,
  VALIDATION_TYPES,
} from '../../types/configuration';

// Complex schema with cross-field dependencies for loan application
const createLoanApplicationSchema = (): ConfigurationSchema => ({
  id: 'loan-application',
  name: 'Business Loan Application',
  description: 'Comprehensive loan application with cross-field validation',
  version: '1.0.0',
  framework: 'Financial Services',
  category: 'financial_application',
  sections: [
    {
      id: 'borrower-info',
      title: 'Borrower Information',
      description: 'Basic information about the loan applicant',
      order: 1,
      collapsible: false,
      collapsed_by_default: false,
      icon: '👤',
      fields: [
        {
          id: 'annual_income',
          label: 'Annual Income',
          field_type: { type: FIELD_TYPES.NUMBER },
          required: true,
          placeholder: 'Enter annual income in USD',
          help_text: 'Your total annual income before taxes',
          default_value: null,
          validations: [
            { type: VALIDATION_TYPES.REQUIRED },
            { type: VALIDATION_TYPES.MIN, config: { value: 0 } },
          ],
          options: { static_options: [], allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 6, md: 6, lg: 6 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: '100%',
          },
          dependent_fields: ['loan_amount', 'monthly_payment'],
        },
        {
          id: 'employment_years',
          label: 'Years of Employment',
          field_type: { type: FIELD_TYPES.NUMBER },
          required: true,
          placeholder: 'Years in current position',
          help_text: 'Number of years in your current job',
          default_value: null,
          validations: [
            { type: VALIDATION_TYPES.REQUIRED },
            { type: VALIDATION_TYPES.MIN, config: { value: 0 } },
            { type: VALIDATION_TYPES.MAX, config: { value: 50 } },
          ],
          options: { static_options: [], allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 6, md: 6, lg: 6 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: '100%',
          },
          dependent_fields: ['loan_amount'],
        },
        {
          id: 'credit_score',
          label: 'Credit Score',
          field_type: { type: FIELD_TYPES.SLIDER, config: { min: 300, max: 850, step: 10, marks: true } },
          required: true,
          help_text: 'Your FICO credit score (300-850)',
          default_value: 650,
          validations: [
            { type: VALIDATION_TYPES.REQUIRED },
            { type: VALIDATION_TYPES.MIN, config: { value: 300 } },
            { type: VALIDATION_TYPES.MAX, config: { value: 850 } },
          ],
          options: { static_options: [], allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 12, md: 12, lg: 12 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: '100%',
          },
          dependent_fields: ['interest_rate', 'loan_amount'],
        },
      ],
    },
    {
      id: 'loan-details',
      title: 'Loan Details',
      description: 'Information about the requested loan',
      order: 2,
      collapsible: false,
      collapsed_by_default: false,
      icon: '💰',
      fields: [
        {
          id: 'loan_amount',
          label: 'Loan Amount',
          field_type: { type: FIELD_TYPES.NUMBER },
          required: true,
          placeholder: 'Requested loan amount',
          help_text: 'Amount you wish to borrow',
          default_value: null,
          validations: [
            { type: VALIDATION_TYPES.REQUIRED },
            { type: VALIDATION_TYPES.MIN, config: { value: 1000 } },
            { type: VALIDATION_TYPES.MAX, config: { value: 1000000 } },
          ],
          options: { static_options: [], allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 6, md: 6, lg: 6 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: '100%',
          },
          dependent_fields: ['monthly_payment'],
        },
        {
          id: 'loan_term',
          label: 'Loan Term (months)',
          field_type: { type: FIELD_TYPES.SELECT },
          required: true,
          help_text: 'Duration of the loan in months',
          default_value: '',
          validations: [{ type: VALIDATION_TYPES.REQUIRED }],
          options: {
            static_options: [
              { value: 12, label: '12 months', description: '', disabled: false },
              { value: 24, label: '24 months', description: '', disabled: false },
              { value: 36, label: '36 months', description: '', disabled: false },
              { value: 48, label: '48 months', description: '', disabled: false },
              { value: 60, label: '60 months', description: '', disabled: false },
            ],
            allow_custom: false,
          },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 6, md: 6, lg: 6 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: '100%',
          },
          dependent_fields: ['monthly_payment'],
        },
        {
          id: 'interest_rate',
          label: 'Interest Rate (%)',
          field_type: { type: FIELD_TYPES.NUMBER },
          required: true,
          placeholder: 'Annual interest rate',
          help_text: 'Interest rate will be determined based on credit score',
          default_value: null,
          validations: [
            { type: VALIDATION_TYPES.REQUIRED },
            { type: VALIDATION_TYPES.MIN, config: { value: 0.1 } },
            { type: VALIDATION_TYPES.MAX, config: { value: 30 } },
          ],
          options: { static_options: [], allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 6, md: 6, lg: 6 },
            disabled: false,
            readonly: false,
            auto_focus: false,
            width: '100%',
          },
          dependent_fields: ['monthly_payment'],
        },
        {
          id: 'monthly_payment',
          label: 'Estimated Monthly Payment',
          field_type: { type: FIELD_TYPES.NUMBER },
          required: false,
          help_text: 'Calculated automatically based on loan details',
          default_value: null,
          validations: [],
          options: { static_options: [], allow_custom: false },
          display: {
            css_classes: [],
            styles: {},
            grid: { xs: 12, sm: 6, md: 6, lg: 6 },
            disabled: true,
            readonly: true,
            auto_focus: false,
            width: '100%',
          },
          dependent_fields: [],
        },
      ],
    },
  ],
  global_validations: [
    {
      id: 'debt_to_income_ratio',
      name: 'Debt-to-Income Ratio',
      fields: ['annual_income', 'monthly_payment'],
      expression: '(monthly_payment * 12) / annual_income <= 0.43',
      message: 'Monthly payment would exceed 43% of annual income (debt-to-income ratio too high)',
      trigger: 'OnSubmit',
    },
    {
      id: 'minimum_employment',
      name: 'Minimum Employment Period',
      fields: ['employment_years', 'loan_amount'],
      expression: 'employment_years >= 2 || loan_amount <= 50000',
      message: 'Loans over $50,000 require at least 2 years of employment history',
      trigger: 'OnSubmit',
    },
    {
      id: 'credit_score_loan_limit',
      name: 'Credit Score Loan Limit',
      fields: ['credit_score', 'loan_amount'],
      expression: '(credit_score >= 750 && loan_amount <= 500000) || (credit_score >= 650 && loan_amount <= 200000) || (credit_score >= 580 && loan_amount <= 50000)',
      message: 'Loan amount exceeds limit for your credit score range',
      trigger: 'OnSubmit',
    },
    {
      id: 'income_multiple_limit',
      name: 'Income Multiple Limit',
      fields: ['annual_income', 'loan_amount'],
      expression: 'loan_amount <= (annual_income * 5)',
      message: 'Loan amount cannot exceed 5 times your annual income',
      trigger: 'OnSubmit',
    },
  ],
  conditional_logic: [],
  defaults: {
    annual_income: null,
    employment_years: null,
    credit_score: 650,
    loan_amount: null,
    loan_term: '',
    interest_rate: null,
    monthly_payment: null,
  },
  metadata: {
    tags: ['loan', 'financial', 'validation'],
    target_audience: ['financial_advisors', 'loan_officers'],
    difficulty_level: 'Advanced',
    estimated_minutes: 20,
    is_template: false,
    is_active: true,
    locale: 'en',
    custom: {},
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'demo',
});

export const ValidationDemo: React.FC = () => {
  const [schema, setSchema] = useState<ConfigurationSchema>(createLoanApplicationSchema());
  const [formData] = useState<Record<string, any>>({});
  const [validationResults, setValidationResults] = useState<any>(null);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);

  // Calculate monthly payment when loan details change (placeholder for future use)
  /*
  const calculateMonthlyPayment = (data: Record<string, any>): number => {
    const { loan_amount, loan_term, interest_rate } = data;
    
    if (!loan_amount || !loan_term || !interest_rate) {
      return 0;
    }

    const principal = parseFloat(loan_amount);
    const monthlyRate = parseFloat(interest_rate) / 100 / 12;
    const numberOfPayments = parseInt(loan_term);

    if (monthlyRate === 0) {
      return principal / numberOfPayments;
    }

    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    return Math.round(monthlyPayment * 100) / 100;
  };
  */

  const handleValidationChange = (results: any) => {
    setValidationResults(results);
  };

  const handleSubmit = async (data: Record<string, any>) => {
    console.log('Loan application submitted:', data);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleRulesChange = (rules: CrossFieldValidation[]) => {
    const updatedSchema = {
      ...schema,
      global_validations: rules,
    };
    setSchema(updatedSchema);
  };

  // Get risk assessment based on form data
  const getRiskAssessment = (): { level: string; color: string; factors: string[] } => {
    const { credit_score, employment_years, annual_income, loan_amount } = formData;
    
    const factors: string[] = [];
    let riskScore = 0;

    if (credit_score < 650) {
      riskScore += 3;
      factors.push('Low credit score');
    } else if (credit_score < 750) {
      riskScore += 1;
      factors.push('Fair credit score');
    }

    if (employment_years < 2) {
      riskScore += 2;
      factors.push('Limited employment history');
    }

    if (annual_income && loan_amount) {
      const incomeRatio = loan_amount / annual_income;
      if (incomeRatio > 3) {
        riskScore += 2;
        factors.push('High loan-to-income ratio');
      }
    }

    if (riskScore === 0) {
      return { level: 'Low Risk', color: 'success', factors: ['Strong financial profile'] };
    } else if (riskScore <= 2) {
      return { level: 'Medium Risk', color: 'warning', factors };
    } else {
      return { level: 'High Risk', color: 'error', factors };
    }
  };

  const riskAssessment = getRiskAssessment();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Cross-Field Validation Engine Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          This advanced demo showcases complex cross-field validation with dependency tracking,
          real-time calculation, and business rule enforcement for a loan application.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Main Form */}
        <Grid item xs={12} lg={8}>
          <DynamicForm
            schema={schema}
            initialData={schema.defaults}
            onSubmit={handleSubmit}
            onValidationChange={handleValidationChange}
            showProgress={true}
            mode="create"
          />
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Risk Assessment */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Assessment
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip 
                    label={riskAssessment.level} 
                    color={riskAssessment.color as any}
                    icon={<WarningIcon />}
                  />
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Risk Factors:
                </Typography>
                <Stack spacing={1}>
                  {riskAssessment.factors.map((factor, index) => (
                    <Typography key={index} variant="body2" color="text.secondary">
                      • {factor}
                    </Typography>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Loan Summary */}
            {formData.loan_amount && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Loan Summary
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Loan Amount</TableCell>
                          <TableCell align="right">
                            ${formData.loan_amount?.toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Term</TableCell>
                          <TableCell align="right">
                            {formData.loan_term} months
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Interest Rate</TableCell>
                          <TableCell align="right">
                            {formData.interest_rate}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Monthly Payment</strong></TableCell>
                          <TableCell align="right">
                            <strong>${formData.monthly_payment?.toLocaleString()}</strong>
                          </TableCell>
                        </TableRow>
                        {formData.annual_income && (
                          <TableRow>
                            <TableCell>Debt-to-Income</TableCell>
                            <TableCell align="right">
                              {((formData.monthly_payment * 12 / formData.annual_income) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Validation Status */}
            {validationResults && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Validation Status
                  </Typography>
                  
                  {validationResults.is_valid ? (
                    <Alert severity="success">
                      All validations passed! Application is ready for submission.
                    </Alert>
                  ) : (
                    <Alert severity="error">
                      Please correct the errors below
                    </Alert>
                  )}

                  {validationResults.global_errors?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="error">
                        Business Rules Violations:
                      </Typography>
                      {validationResults.global_errors.map((error: string, index: number) => (
                        <Typography key={index} variant="body2" color="error.main">
                          • {error}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Controls */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Validation Rules
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  This form uses {schema.global_validations.length} cross-field validation rules
                  to ensure business logic compliance.
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setShowRuleBuilder(!showRuleBuilder)}
                >
                  {showRuleBuilder ? 'Hide' : 'Show'} Rule Builder
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Rule Builder */}
      {showRuleBuilder && (
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 3 }}>
            <ValidationRuleBuilder
              schema={schema}
              existingRules={schema.global_validations}
              onRulesChange={handleRulesChange}
              testData={formData}
            />
          </Paper>
        </Box>
      )}
    </Container>
  );
};