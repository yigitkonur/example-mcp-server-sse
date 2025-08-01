/**
 * Shared test utilities for MCP server testing
 * Provides common test helpers and fixtures
 */

/// <reference types="jest" />
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { CallToolResult, GetPromptResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Standard test timeout for async operations
 */
export const TEST_TIMEOUT = 10000;

/**
 * Common test data for calculator operations
 */
export const CALCULATOR_TEST_DATA = {
  basicOperations: [
    { operation: 'add', input_1: 10, input_2: 5, expected: 15, description: 'addition' },
    { operation: 'subtract', input_1: 20, input_2: 8, expected: 12, description: 'subtraction' },
    { operation: 'multiply', input_1: 7, input_2: 6, expected: 42, description: 'multiplication' },
    { operation: 'divide', input_1: 20, input_2: 4, expected: 5, description: 'division' },
  ],
  
  edgeCases: [
    { operation: 'divide', input_1: 10, input_2: 0, expectError: true, errorMessage: 'Division by zero' },
    { operation: 'sqrt', input_1: -4, expectError: true, errorMessage: 'Cannot calculate square root of negative number' },
    { operation: 'percentage', input_1: 50, input_2: 0, expectError: true, errorMessage: 'Cannot calculate percentage of zero' },
  ],
  
  precisionTests: [
    { operation: 'divide', input_1: 10, input_2: 3, precision: 2, expectedPattern: /3\.33(?!3)/ },
    { operation: 'divide', input_1: 10, input_2: 3, precision: 5, expectedPattern: /3\.33333/ },
    { operation: 'divide', input_1: 10, input_2: 3, precision: 0, expectedPattern: /3(?!\.)/ },
  ],
  
  largeNumbers: [
    { operation: 'multiply', input_1: 1e308, input_2: 2, expectedPattern: /Infinity|2e\+308/i },
    { operation: 'divide', input_1: 1, input_2: 1e308, expectedPattern: /1e-308/ },
  ],
};

/**
 * Common prompt test data
 */
export const PROMPT_TEST_DATA = {
  explainCalculation: [
    { expression: '2 + 3 * 4', level: 'beginner', includeSteps: 'true', expectedKeywords: ['order of operations', 'step-by-step'] },
    { expression: '(10^2 + 5) / 3', level: 'intermediate', includeSteps: 'true', expectedKeywords: ['intermediate'] },
    { expression: '5 + 5', level: 'beginner', includeSteps: 'false', unexpectedKeywords: ['step-by-step'] },
  ],
  
  practiceProblems: [
    { topic: 'arithmetic', difficulty: 'easy', count: '5' },
    { topic: 'algebra', difficulty: 'medium', count: '3' },
    { topic: 'geometry', difficulty: 'hard', count: '2' },
  ],
  
  tutorials: [
    { focusArea: 'basic', expectedKeywords: ['basic operations', 'add, subtract, multiply, divide'] },
    { focusArea: 'advanced', expectedKeywords: ['advanced features', 'power', 'sqrt', 'percentage'] },
    { focusArea: 'tips', expectedKeywords: ['tips and tricks', 'precision'] },
  ],
};

/**
 * Helper to extract text from tool call results
 */
export function extractTextFromResult(result: CallToolResult): string {
  if (result.content.length === 0) return '';
  const firstContent = result.content[0];
  if (firstContent && 'text' in firstContent) {
    return firstContent.text as string;
  }
  return '';
}

/**
 * Helper to extract text from prompt results
 */
export function extractTextFromPrompt(result: GetPromptResult): string {
  if (result.messages.length === 0) return '';
  const firstMessage = result.messages[0];
  if (firstMessage && firstMessage.content.type === 'text' && 'text' in firstMessage.content) {
    return firstMessage.content.text;
  }
  return '';
}

/**
 * Helper to parse JSON from resource content
 */
export function parseResourceJson(result: ReadResourceResult): any {
  if (result.contents.length === 0) return null;
  try {
    const firstContent = result.contents[0];
    if (firstContent && firstContent.text) {
      return JSON.parse(firstContent.text as string);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Test helper to verify all required tools are present
 */
export async function verifyRequiredTools(client: Client, requiredTools: string[]): Promise<void> {
  const tools = await client.listTools();
  const toolNames = tools.tools.map(t => t.name);
  
  requiredTools.forEach(toolName => {
    expect(toolNames).toContain(toolName);
  });
}

/**
 * Test helper to verify all required resources are present
 */
export async function verifyRequiredResources(client: Client, requiredUris: string[]): Promise<void> {
  const resources = await client.listResources();
  const resourceUris = resources.resources.map(r => r.uri);
  
  requiredUris.forEach(uri => {
    expect(resourceUris).toContain(uri);
  });
}

/**
 * Test helper to verify all required prompts are present
 */
export async function verifyRequiredPrompts(client: Client, requiredPrompts: string[]): Promise<void> {
  const prompts = await client.listPrompts();
  const promptNames = prompts.prompts.map(p => p.name);
  
  requiredPrompts.forEach(promptName => {
    expect(promptNames).toContain(promptName);
  });
}

/**
 * Test helper for performance testing
 */
export async function measureExecutionTime<T>(
  operation: () => Promise<T>,
  maxDuration: number = 5000
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(maxDuration);
  
  return { result, duration };
}

/**
 * Test helper for concurrent operations
 */
export async function testConcurrentOperations<T>(
  operations: Array<() => Promise<T>>,
  validateResult: (result: T, index: number) => void
): Promise<void> {
  const results = await Promise.all(operations.map(op => op()));
  results.forEach((result, index) => validateResult(result, index));
}

/**
 * Standard error test cases for invalid inputs
 */
export const STANDARD_ERROR_TESTS = {
  invalidToolName: { name: 'non-existent-tool', arguments: {} },
  invalidResourceUri: { uri: 'invalid://resource' },
  invalidPromptName: { name: 'non-existent-prompt', arguments: {} },
};

/**
 * Helper to create a standard test suite structure
 */
export function createStandardTestSuite(
  suiteName: string,
  setupFn: () => Promise<{ client: Client; cleanup: () => Promise<void> }>
) {
  // This function would be used within a test file that imports jest globals
  // The describe, beforeEach, and afterEach will be available in the test context
  return {
    suiteName,
    setupFn,
  };
}

/**
 * Mathematical constants for validation
 */
export const MATH_CONSTANTS = {
  PI: Math.PI,
  E: Math.E,
  SQRT2: Math.SQRT2,
  LN2: Math.LN2,
  LN10: Math.LN10,
  LOG2E: Math.LOG2E,
  LOG10E: Math.LOG10E,
  PHI: 1.618033988749895,
  EULER_GAMMA: 0.5772156649015329,
};

/**
 * Helper to validate mathematical constants
 */
export function validateMathConstants(constants: Record<string, number>): void {
  Object.entries(MATH_CONSTANTS).forEach(([key, expectedValue]) => {
    expect(constants).toHaveProperty(key);
    expect(constants[key]).toBeCloseTo(expectedValue, 10);
  });
}

/**
 * Helper to generate random test data
 */
export function generateRandomCalculations(count: number = 10): Array<{
  operation: string;
  input_1: number;
  input_2: number;
}> {
  const operations = ['add', 'subtract', 'multiply', 'divide'];
  return Array.from({ length: count }, () => {
    const operationIndex = Math.floor(Math.random() * operations.length);
    return {
      operation: operations[operationIndex] || 'add',
      input_1: Math.floor(Math.random() * 100),
      input_2: Math.floor(Math.random() * 100) + 1, // Avoid division by zero
    };
  });
}

/**
 * Helper to validate calculation result format
 */
export function validateCalculationResult(
  result: CallToolResult,
  expectedValue?: number,
  expectError: boolean = false
): void {
  expect(result.isError).toBe(expectError);
  expect(result.content).toHaveLength(1);
  const firstContent = result.content[0];
  expect(firstContent).toBeDefined();
  expect(firstContent?.type).toBe('text');
  
  if (expectedValue !== undefined && !expectError) {
    const text = extractTextFromResult(result);
    expect(text).toContain(expectedValue.toString());
  }
}

/**
 * Standard test timeouts
 */
export const TIMEOUTS = {
  short: 1000,
  medium: 5000,
  long: 10000,
  veryLong: 30000,
};

/**
 * Helper for retry logic in flaky tests
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}