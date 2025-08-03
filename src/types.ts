import { z } from 'zod';

// Calculator operation types
export const OperationSchema = z.enum(['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt']);
export type Operation = z.infer<typeof OperationSchema>;

// Input schemas for calculator tool
export const CalculatorInputSchema = z.object({
  operation: OperationSchema,
  input_1: z.number().describe('First operand'),
  input_2: z.number().optional().describe('Second operand (not needed for sqrt)'),
  precision: z.number().optional().default(2).describe('Decimal precision'),
});

export type CalculatorInput = z.infer<typeof CalculatorInputSchema>;

// Output schema for calculator tool
export const CalculatorOutputSchema = z.object({
  result: z.number(),
  expression: z.string(),
  formatted: z.string(),
});

export type CalculatorOutput = z.infer<typeof CalculatorOutputSchema>;

// Calculation history entry
export interface CalculationHistoryEntry {
  id: string;
  timestamp: string;
  operation: Operation;
  inputs: number[];
  result: number;
  expression: string;
}

// Mathematical constants
export const MATH_CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
  phi: (1 + Math.sqrt(5)) / 2, // Golden ratio
  sqrt2: Math.SQRT2,
  ln2: Math.LN2,
  ln10: Math.LN10,
} as const;

// Prompt argument schemas
export const ExplainCalculationArgsSchema = z.object({
  expression: z.string().describe('Mathematical expression to explain'),
  level: z.enum(['elementary', 'intermediate', 'advanced']).default('intermediate'),
  includeSteps: z.boolean().default(true),
});

export type ExplainCalculationArgs = z.infer<typeof ExplainCalculationArgsSchema>;

export const GeneratePracticeProblemsArgsSchema = z.object({
  topic: z.enum(['arithmetic', 'algebra', 'geometry', 'mixed']).describe('Type of problems'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  count: z.number().min(1).max(10).default(5),
});

export type GeneratePracticeProblemsArgs = z.infer<typeof GeneratePracticeProblemsArgsSchema>;
