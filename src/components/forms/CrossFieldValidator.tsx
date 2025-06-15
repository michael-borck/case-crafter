// Advanced cross-field validation system

import {
  ConfigurationSchema,
  CrossFieldValidation,
  ValidationResults,
  ValidationTrigger,
} from '../../types/configuration';

export interface DependencyGraph {
  [fieldId: string]: {
    dependsOn: Set<string>;
    affectedBy: Set<string>;
    validators: CrossFieldValidation[];
  };
}

export interface ValidationContext {
  formData: Record<string, any>;
  changedField?: string;
  trigger: ValidationTrigger;
  previousData?: Record<string, any>;
}

export class CrossFieldValidator {
  private schema: ConfigurationSchema;
  private dependencyGraph: DependencyGraph;
  private validationCache: Map<string, any>;

  constructor(schema: ConfigurationSchema) {
    this.schema = schema;
    this.dependencyGraph = this.buildDependencyGraph();
    this.validationCache = new Map();
  }

  // Build dependency graph for efficient validation
  private buildDependencyGraph(): DependencyGraph {
    const graph: DependencyGraph = {};

    // Initialize graph for all fields
    this.schema.sections.forEach(section => {
      section.fields.forEach(field => {
        graph[field.id] = {
          dependsOn: new Set(),
          affectedBy: new Set(),
          validators: [],
        };
      });
    });

    // Add explicit dependencies from field definitions
    this.schema.sections.forEach(section => {
      section.fields.forEach(field => {
        field.dependent_fields.forEach(dependentId => {
          const fieldGraph = graph[field.id];
          const dependentGraph = graph[dependentId];
          if (fieldGraph && dependentGraph) {
            fieldGraph.dependsOn.add(dependentId);
            dependentGraph.affectedBy.add(field.id);
          }
        });
      });
    });

    // Add dependencies from cross-field validations
    this.schema.global_validations.forEach(validation => {
      validation.fields.forEach(fieldId => {
        const fieldGraph = graph[fieldId];
        if (fieldGraph) {
          fieldGraph.validators.push(validation);
          
          // Create bidirectional dependencies between fields in the same validation
          validation.fields.forEach(otherFieldId => {
            if (fieldId !== otherFieldId) {
              const otherFieldGraph = graph[otherFieldId];
              if (otherFieldGraph) {
                fieldGraph.dependsOn.add(otherFieldId);
                otherFieldGraph.affectedBy.add(fieldId);
              }
            }
          });
        }
      });
    });

    return graph;
  }

  // Get fields that need revalidation when a specific field changes
  getAffectedFields(changedFieldId: string): string[] {
    const affected = new Set<string>();
    const toProcess = [changedFieldId];
    const processed = new Set<string>();

    while (toProcess.length > 0) {
      const fieldId = toProcess.pop()!;
      if (processed.has(fieldId)) continue;
      
      processed.add(fieldId);
      const fieldGraph = this.dependencyGraph[fieldId];
      
      if (fieldGraph) {
        fieldGraph.affectedBy.forEach(affectedId => {
          if (!processed.has(affectedId)) {
            affected.add(affectedId);
            toProcess.push(affectedId);
          }
        });
      }
    }

    return Array.from(affected);
  }

  // Validate cross-field dependencies for a specific context
  async validateCrossField(context: ValidationContext): Promise<ValidationResults> {
    const { formData, changedField, trigger } = context;
    const fieldErrors: Record<string, string[]> = {};
    const globalErrors: string[] = [];
    const warnings: string[] = [];

    // Get fields to validate based on what changed
    const fieldsToValidate = changedField 
      ? [changedField, ...this.getAffectedFields(changedField)]
      : Object.keys(this.dependencyGraph);

    // Validate each affected field's cross-field validations
    for (const fieldId of fieldsToValidate) {
      const fieldGraph = this.dependencyGraph[fieldId];
      if (!fieldGraph) continue;
      
      for (const validation of fieldGraph.validators) {
        // Check if validation should run for this trigger
        if (!this.shouldRunValidation(validation, trigger)) continue;

        // Check if all required fields for validation are present
        const missingFields = validation.fields.filter(fId => 
          formData[fId] === undefined || formData[fId] === null
        );
        
        if (missingFields.length > 0 && trigger !== 'OnSubmit') {
          continue; // Skip validation if required fields are missing (except on submit)
        }

        try {
          const isValid = await this.evaluateValidationExpression(
            validation.expression,
            formData,
            validation.fields
          );

          if (!isValid) {
            // Determine if this is a field-specific or global error
            if (validation.fields.length === 1) {
              const fieldId = validation.fields[0];
              if (fieldId) {
                if (!fieldErrors[fieldId]) fieldErrors[fieldId] = [];
                fieldErrors[fieldId].push(validation.message);
              }
            } else {
              globalErrors.push(`${validation.name}: ${validation.message}`);
            }
          }
        } catch (error) {
          console.warn(`Cross-field validation error for ${validation.name}:`, error);
          warnings.push(`Validation ${validation.name} failed to execute`);
        }
      }
    }

    return {
      is_valid: Object.keys(fieldErrors).length === 0 && globalErrors.length === 0,
      field_errors: fieldErrors,
      global_errors: globalErrors,
      warnings,
    };
  }

  // Enhanced expression evaluation with better error handling
  private async evaluateValidationExpression(
    expression: string,
    formData: Record<string, any>,
    involvedFields: string[]
  ): Promise<boolean> {
    try {
      // Create safe evaluation context
      const context = this.createValidationContext(formData, involvedFields);
      
      // Cache key for this validation
      const cacheKey = `${expression}:${JSON.stringify(context)}`;
      
      if (this.validationCache.has(cacheKey)) {
        return this.validationCache.get(cacheKey);
      }

      // Perform the evaluation
      const result = this.safeEvaluateExpression(expression, context);
      
      // Cache the result
      this.validationCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Expression evaluation failed:', error);
      return false;
    }
  }

  // Create a safe context for expression evaluation
  private createValidationContext(formData: Record<string, any>, involvedFields: string[]): Record<string, any> {
    const context: Record<string, any> = {};

    // Add field values
    involvedFields.forEach(fieldId => {
      context[fieldId] = formData[fieldId];
    });

    // Add utility functions
    context.isEmpty = (value: any) => this.isEmpty(value);
    context.isNotEmpty = (value: any) => !this.isEmpty(value);
    context.length = (value: any) => {
      if (typeof value === 'string' || Array.isArray(value)) {
        return value.length;
      }
      return 0;
    };
    context.includes = (value: any, search: any) => {
      if (typeof value === 'string') {
        return value.includes(search);
      }
      if (Array.isArray(value)) {
        return value.includes(search);
      }
      return false;
    };
    context.sum = (values: number[]) => {
      return Array.isArray(values) ? values.reduce((a, b) => (a || 0) + (b || 0), 0) : 0;
    };
    context.min = (...values: number[]) => Math.min(...values.filter(v => typeof v === 'number'));
    context.max = (...values: number[]) => Math.max(...values.filter(v => typeof v === 'number'));
    context.count = (values: any[]) => Array.isArray(values) ? values.length : 0;
    context.unique = (values: any[]) => {
      return Array.isArray(values) ? [...new Set(values)] : [];
    };

    // Add comparison functions
    context.equals = (a: any, b: any) => a === b;
    context.notEquals = (a: any, b: any) => a !== b;
    context.greaterThan = (a: number, b: number) => a > b;
    context.lessThan = (a: number, b: number) => a < b;
    context.greaterThanOrEqual = (a: number, b: number) => a >= b;
    context.lessThanOrEqual = (a: number, b: number) => a <= b;

    return context;
  }

  // Safe expression evaluation with limited scope
  private safeEvaluateExpression(expression: string, context: Record<string, any>): boolean {
    // Replace field references with context references
    let processedExpression = expression;
    
    Object.keys(context).forEach(key => {
      if (key.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        processedExpression = processedExpression.replace(regex, `context.${key}`);
      }
    });

    try {
      // Use Function constructor for safer evaluation than eval
      const fn = new Function('context', `
        "use strict";
        try {
          return Boolean(${processedExpression});
        } catch (e) {
          console.warn("Expression evaluation error:", e.message);
          return false;
        }
      `);
      
      return fn(context);
    } catch (error) {
      console.error('Failed to create validation function:', error);
      return false;
    }
  }

  // Check if validation should run for the given trigger
  private shouldRunValidation(validation: CrossFieldValidation, trigger: ValidationTrigger): boolean {
    if (typeof validation.trigger === 'string') {
      return validation.trigger === trigger;
    } else if (validation.trigger && typeof validation.trigger === 'object') {
      // Handle custom trigger logic
      return trigger === 'OnSubmit'; // Default for custom triggers
    }
    return true; // Run by default
  }

  // Utility function to check if a value is empty
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  // Get validation dependencies for a field
  getFieldDependencies(fieldId: string): string[] {
    const fieldGraph = this.dependencyGraph[fieldId];
    return fieldGraph ? Array.from(fieldGraph.dependsOn) : [];
  }

  // Get all fields affected by a field
  getFieldAffected(fieldId: string): string[] {
    const fieldGraph = this.dependencyGraph[fieldId];
    return fieldGraph ? Array.from(fieldGraph.affectedBy) : [];
  }

  // Clear validation cache (useful when schema changes)
  clearCache(): void {
    this.validationCache.clear();
  }

  // Get dependency graph visualization data
  getDependencyVisualization(): { nodes: any[], edges: any[] } {
    const nodes = Object.keys(this.dependencyGraph).map(fieldId => {
      const fieldGraph = this.dependencyGraph[fieldId];
      return {
        id: fieldId,
        label: this.getFieldLabel(fieldId),
        dependencies: fieldGraph?.dependsOn.size || 0,
        affected: fieldGraph?.affectedBy.size || 0,
      };
    });

    const edges: any[] = [];
    Object.entries(this.dependencyGraph).forEach(([fieldId, graph]) => {
      graph.dependsOn.forEach(dependencyId => {
        edges.push({
          from: dependencyId,
          to: fieldId,
          type: 'dependency',
        });
      });
    });

    return { nodes, edges };
  }

  // Helper to get field label
  private getFieldLabel(fieldId: string): string {
    for (const section of this.schema.sections) {
      for (const field of section.fields) {
        if (field.id === fieldId) {
          return field.label;
        }
      }
    }
    return fieldId;
  }
}