// Form validation engine for dynamic forms

import {
  ConfigurationSchema,
  FieldDefinition,
  ValidationRule,
  ConditionalExpression,
  ValidationResults,
  VALIDATION_TYPES,
} from '../../types/configuration';
import { CrossFieldValidator } from './CrossFieldValidator';

export class FormValidationEngine {
  private schema: ConfigurationSchema;
  private crossFieldValidator: CrossFieldValidator;

  constructor(schema: ConfigurationSchema) {
    this.schema = schema;
    this.crossFieldValidator = new CrossFieldValidator(schema);
  }

  // Validate a single field value
  async validateField(fieldId: string, formData: Record<string, any>): Promise<ValidationResults> {
    const field = this.findField(fieldId);
    if (!field) {
      return {
        is_valid: true,
        field_errors: {},
        global_errors: [],
        warnings: [],
      };
    }

    const value = formData[fieldId];
    const errors: string[] = [];

    // Required validation
    if (field.required && this.isEmpty(value)) {
      errors.push(`${field.label} is required`);
    }

    // Skip other validations if field is empty and not required
    if (this.isEmpty(value) && !field.required) {
      return {
        is_valid: true,
        field_errors: { [fieldId]: [] },
        global_errors: [],
        warnings: [],
      };
    }

    // Run field-specific validations
    for (const validation of field.validations) {
      const error = await this.validateRule(validation, value, field, formData);
      if (error) {
        errors.push(error);
      }
    }

    return {
      is_valid: errors.length === 0,
      field_errors: { [fieldId]: errors },
      global_errors: [],
      warnings: [],
    };
  }

  // Validate all fields in the form
  async validateAll(formData: Record<string, any>): Promise<ValidationResults> {
    const fieldErrors: Record<string, string[]> = {};
    const globalErrors: string[] = [];
    const warnings: string[] = [];

    // Validate each field
    for (const section of this.schema.sections) {
      for (const field of section.fields) {
        if (this.evaluateCondition(field.visibility_conditions, formData)) {
          const fieldResult = await this.validateField(field.id, formData);
          const fieldErrorsForField = fieldResult.field_errors[field.id];
          if (fieldErrorsForField && fieldErrorsForField.length > 0) {
            fieldErrors[field.id] = fieldErrorsForField;
          }
        }
      }
    }

    // Use enhanced cross-field validation
    const crossFieldResult = await this.crossFieldValidator.validateCrossField({
      formData,
      trigger: 'OnSubmit',
    });

    // Merge results
    Object.entries(crossFieldResult.field_errors).forEach(([fieldId, errors]) => {
      if (fieldErrors[fieldId]) {
        fieldErrors[fieldId].push(...errors);
      } else {
        fieldErrors[fieldId] = errors;
      }
    });

    globalErrors.push(...crossFieldResult.global_errors);
    warnings.push(...crossFieldResult.warnings);

    const hasFieldErrors = Object.keys(fieldErrors).length > 0;
    const hasGlobalErrors = globalErrors.length > 0;

    return {
      is_valid: !hasFieldErrors && !hasGlobalErrors,
      field_errors: fieldErrors,
      global_errors: globalErrors,
      warnings,
    };
  }

  // Validate field with cross-field dependencies
  async validateFieldWithDependencies(
    fieldId: string, 
    formData: Record<string, any>,
    trigger: 'OnChange' | 'OnBlur' | 'OnSubmit' = 'OnChange'
  ): Promise<ValidationResults> {
    // First validate the field itself
    const fieldResult = await this.validateField(fieldId, formData);

    // Then validate cross-field dependencies
    const crossFieldResult = await this.crossFieldValidator.validateCrossField({
      formData,
      changedField: fieldId,
      trigger,
    });

    // Merge results
    const mergedFieldErrors = { ...fieldResult.field_errors };
    Object.entries(crossFieldResult.field_errors).forEach(([fId, errors]) => {
      if (mergedFieldErrors[fId]) {
        mergedFieldErrors[fId].push(...errors);
      } else {
        mergedFieldErrors[fId] = errors;
      }
    });

    return {
      is_valid: fieldResult.is_valid && crossFieldResult.is_valid,
      field_errors: mergedFieldErrors,
      global_errors: [...(fieldResult.global_errors || []), ...crossFieldResult.global_errors],
      warnings: [...(fieldResult.warnings || []), ...crossFieldResult.warnings],
    };
  }

  // Validate a single validation rule
  private async validateRule(
    rule: ValidationRule,
    value: any,
    field: FieldDefinition,
    formData: Record<string, any>
  ): Promise<string | null> {
    switch (rule.type) {
      case VALIDATION_TYPES.REQUIRED:
        return this.isEmpty(value) ? `${field.label} is required` : null;

      case VALIDATION_TYPES.MIN_LENGTH:
        const minLength = rule.config?.length || 0;
        return typeof value === 'string' && value.length < minLength
          ? `${field.label} must be at least ${minLength} characters`
          : null;

      case VALIDATION_TYPES.MAX_LENGTH:
        const maxLength = rule.config?.length || Infinity;
        return typeof value === 'string' && value.length > maxLength
          ? `${field.label} must be no more than ${maxLength} characters`
          : null;

      case VALIDATION_TYPES.PATTERN:
        const pattern = new RegExp(rule.config?.pattern || '.*');
        return typeof value === 'string' && !pattern.test(value)
          ? rule.config?.message || `${field.label} format is invalid`
          : null;

      case VALIDATION_TYPES.MIN:
        const min = rule.config?.value || 0;
        return typeof value === 'number' && value < min
          ? `${field.label} must be at least ${min}`
          : null;

      case VALIDATION_TYPES.MAX:
        const max = rule.config?.value || Infinity;
        return typeof value === 'number' && value > max
          ? `${field.label} must be no more than ${max}`
          : null;

      case VALIDATION_TYPES.EMAIL:
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return typeof value === 'string' && !emailPattern.test(value)
          ? `${field.label} must be a valid email address`
          : null;

      case VALIDATION_TYPES.URL:
        try {
          new URL(value);
          return null;
        } catch {
          return `${field.label} must be a valid URL`;
        }

      case VALIDATION_TYPES.CUSTOM:
        return await this.validateCustomRule(rule, value, field, formData);

      default:
        return null;
    }
  }


  // Validate custom rule
  private async validateCustomRule(
    rule: ValidationRule,
    value: any,
    field: FieldDefinition,
    formData: Record<string, any>
  ): Promise<string | null> {
    try {
      // In production, implement custom validation logic
      const customFunction = rule.config?.function;
      if (typeof customFunction === 'function') {
        const isValid = await customFunction(value, formData, field);
        return isValid ? null : (rule.config?.message || 'Validation failed');
      }
      return null;
    } catch (error) {
      console.warn('Custom validation error:', error);
      return null;
    }
  }

  // Evaluate conditional expression
  evaluateCondition(condition: ConditionalExpression | undefined, formData: Record<string, any>): boolean {
    if (!condition) {
      return true;
    }

    try {
      switch (condition.type) {
        case 'field_equals':
          const fieldValue = formData[condition.config?.field];
          return fieldValue === condition.config?.value;

        case 'field_not_equals':
          const fieldValue2 = formData[condition.config?.field];
          return fieldValue2 !== condition.config?.value;

        case 'field_contains':
          const fieldValue3 = formData[condition.config?.field];
          const searchValue = condition.config?.value;
          return typeof fieldValue3 === 'string' && fieldValue3.includes(searchValue);

        case 'field_in':
          const fieldValue4 = formData[condition.config?.field];
          const possibleValues = condition.config?.values || [];
          return possibleValues.includes(fieldValue4);

        case 'and':
          const andConditions = condition.config?.conditions || [];
          return andConditions.every((cond: ConditionalExpression) => 
            this.evaluateCondition(cond, formData)
          );

        case 'or':
          const orConditions = condition.config?.conditions || [];
          return orConditions.some((cond: ConditionalExpression) => 
            this.evaluateCondition(cond, formData)
          );

        case 'not':
          const notCondition = condition.config?.condition;
          return !this.evaluateCondition(notCondition, formData);

        case 'expression':
          return this.evaluateExpression(condition.config?.expression || 'true', formData);

        default:
          return true;
      }
    } catch (error) {
      console.warn('Condition evaluation error:', error);
      return true;
    }
  }

  // Simple expression evaluator (replace with safe evaluator in production)
  private evaluateExpression(expression: string, formData: Record<string, any>): boolean {
    try {
      // Create a safe context for evaluation
      const context = {
        ...formData,
        // Add helper functions
        isEmpty: (value: any) => this.isEmpty(value),
        isNotEmpty: (value: any) => !this.isEmpty(value),
        length: (value: any) => typeof value === 'string' ? value.length : 0,
        includes: (value: any, search: any) => 
          typeof value === 'string' ? value.includes(search) : false,
      };

      // Replace field references in expression
      let processedExpression = expression;
      Object.keys(formData).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        processedExpression = processedExpression.replace(regex, `context.${key}`);
      });

      // Evaluate in restricted context (simplified - use a proper safe evaluator in production)
      return new Function('context', `return ${processedExpression}`)(context);
    } catch (error) {
      console.warn('Expression evaluation error:', error);
      return false;
    }
  }

  // Find field by ID
  private findField(fieldId: string): FieldDefinition | null {
    for (const section of this.schema.sections) {
      const field = section.fields.find(f => f.id === fieldId);
      if (field) {
        return field;
      }
    }
    return null;
  }

  // Check if value is empty
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length === 0;
    }
    return false;
  }

  // Get validation summary
  getValidationSummary(results: ValidationResults): string {
    const fieldErrorCount = Object.keys(results.field_errors).length;
    const globalErrorCount = results.global_errors.length;
    const totalErrors = fieldErrorCount + globalErrorCount;

    if (totalErrors === 0) {
      return 'Form is valid';
    }

    const parts = [];
    if (fieldErrorCount > 0) {
      parts.push(`${fieldErrorCount} field error${fieldErrorCount > 1 ? 's' : ''}`);
    }
    if (globalErrorCount > 0) {
      parts.push(`${globalErrorCount} validation error${globalErrorCount > 1 ? 's' : ''}`);
    }

    return parts.join(' and ');
  }

  // Get field dependencies
  getFieldDependencies(fieldId: string): string[] {
    return this.crossFieldValidator.getFieldDependencies(fieldId);
  }

  // Get fields affected by a field change
  getAffectedFields(fieldId: string): string[] {
    return this.crossFieldValidator.getAffectedFields(fieldId);
  }

  // Get dependency visualization data
  getDependencyVisualization() {
    return this.crossFieldValidator.getDependencyVisualization();
  }

  // Update schema (useful for dynamic schema changes)
  updateSchema(newSchema: ConfigurationSchema): void {
    this.schema = newSchema;
    this.crossFieldValidator = new CrossFieldValidator(newSchema);
  }

  // Clear validation cache
  clearValidationCache(): void {
    this.crossFieldValidator.clearCache();
  }

  // Check if a field has dependencies
  hasFieldDependencies(fieldId: string): boolean {
    return this.getFieldDependencies(fieldId).length > 0;
  }

  // Check if a field affects other fields
  affectsOtherFields(fieldId: string): boolean {
    return this.getAffectedFields(fieldId).length > 0;
  }

  // Get cross-field validator instance (for advanced usage)
  getCrossFieldValidator(): CrossFieldValidator {
    return this.crossFieldValidator;
  }
}