#!/usr/bin/env node
/**
 * @file server.ts
 * @summary Educational Reference Implementation for a Stateful, Singleton MCP Server.
 * @description This server demonstrates the "Singleton Server Pattern" for MCP. A single,
 * shared `McpServer` instance holds all business logic and state, making it highly
 * memory-efficient for single-node deployments. Each connecting client receives a
 * lightweight, session-specific `StreamableHTTPServerTransport`.
 *
 * @architecture
 * 1. **Singleton `McpServer`**: One instance created at startup holds all capabilities.
 * 2. **Per-Session Transports**: A new `StreamableHTTPServerTransport` is created for each client session.
 * 3. **In-Memory State**: Active transports are stored in a simple `{[sessionId]: transport}` map.
 * 4. **Decoupled Logic**: Business logic (`createCalculatorServer`) is separate from the web server transport layer.
 *
 * @error_handling
 * This server prioritizes protocol compliance and clear error communication.
 * - **Invalid user input** within a tool (e.g., division by zero) throws a specific
 *   `McpError` with `ErrorCode.InvalidParams`. This informs the client that the
 *   user's request was flawed, not the server.
 * - **Unexpected internal failures** are caught and wrapped in a generic
 *   `McpError` with `ErrorCode.InternalError` to prevent leaking implementation details.
 * - **Invalid session requests** at the transport layer return HTTP 400/404 with a
 *   JSON-RPC error object, clearly distinguishing session issues from tool errors.
 *
 * @philosophy
 * This code prioritizes clarity, correctness, and adherence to the MCP specification.
 * It serves as a robust foundation for building real-world, production-ready services.
 * We trust the SDK to handle the low-level wire protocol and focus on clean application logic.
 */

// --- Core Node.js and Express Dependencies ---
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import type http from 'http'; // Explicitly import for type safety on httpServer

// --- Model Context Protocol (MCP) SDK Dependencies ---
// The core server class that holds all capabilities.
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
// The modern, single-endpoint transport for handling HTTP connections.
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
// A type guard to safely identify the 'initialize' request.
import { isInitializeRequest, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// --- Application-Specific Dependencies ---
// Zod is used for robust, type-safe schema validation.
import { z } from 'zod';
// Local type definitions and constants.
import { type CalculationHistoryEntry, MATH_CONSTANTS } from './types.js';

// --- Global Server Configuration ---
// These settings are configured via environment variables or command-line arguments.
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const portArg = portIndex !== -1 ? args[portIndex + 1] : undefined;

const PORT = (portArg ? parseInt(portArg, 10) : undefined) || Number(process.env['PORT']) || 1923;
const HOST = process.env['HOST'] || 'localhost';
// WARNING: In a real production environment, CORS_ORIGIN should be a specific domain.
const CORS_ORIGIN = process.env['CORS_ORIGIN'] || '*';

// --- Global State Management ---
// A simple in-memory map to store active client transports, keyed by session ID.
// This is the core of our session management for this singleton architecture.
// Key: Mcp-Session-Id (string)
// Value: The transport instance for that session.
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// ===================================================================================
// === BUSINESS LOGIC CORE (The Calculator Factory)
// ===================================================================================
/**
 * Creates and configures a new `McpServer` instance with all calculator-related
 * capabilities. This function is the single source of truth for what our server can do.
 * It is completely decoupled from the transport layer (Express, HTTP).
 *
 * @returns A fully configured McpServer instance.
 */
export function createCalculatorServer(): McpServer {
  // Tool and resource name constants to prevent typos and enable refactoring
  const TOOL_NAMES = {
    CALCULATE: 'calculate',
    DEMO_PROGRESS: 'demo_progress',
    SOLVE_MATH_PROBLEM: 'solve_math_problem',
    EXPLAIN_FORMULA: 'explain_formula',
    CALCULATOR_ASSISTANT: 'calculator_assistant',
    BATCH_CALCULATE: 'batch_calculate',
    ADVANCED_CALCULATE: 'advanced_calculate',
  } as const;

  const RESOURCE_NAMES = {
    CONSTANTS: 'calculator://constants',
    STATS: 'calculator://stats',
    HISTORY: 'calculator://history/{id}',
  } as const;

  const PROMPT_NAMES = {
    EXPLAIN_CALCULATION: 'explain-calculation',
    GENERATE_PROBLEMS: 'generate-problems',
    CALCULATOR_TUTORIAL: 'calculator-tutorial',
  } as const;

  const server = new McpServer(
    {
      name: 'calculator-sse-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {},
      },
    },
  );

  // In-memory state for this server instance. In a singleton pattern, this
  // array is shared across ALL connected clients.
  const calculationHistory: CalculationHistoryEntry[] = [];

  // TOOL: Educational Echo (Only if SAMPLE_TOOL_NAME env var is set)
  if (process.env['SAMPLE_TOOL_NAME']) {
    const sampleToolName = process.env['SAMPLE_TOOL_NAME'];
    server.tool(
      sampleToolName,
      `Educational echo tool for learning MCP concepts`,
      {
        message: z.string().describe('Message to echo back'),
      },
      async ({ message }) => ({
        content: [
          {
            type: 'text',
            text: `Sample tool "${sampleToolName}" received: ${message}`,
          },
        ],
      }),
    );
  }

  // --- TOOL: calculate ---
  // The primary tool for performing arithmetic. Demonstrates:
  // 1. Direct Zod schema usage for input validation.
  // 2. Simple state mutation (pushing to shared history).
  // 3. Protocol-compliant error handling (e.g., for division by zero).
  server.tool(
    TOOL_NAMES.CALCULATE,
    'Performs arithmetic operations with calculation history tracking',
    {
      op: z
        .enum(['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt'])
        .describe('Arithmetic operation to perform'),
      a: z.number().describe('First operand for the calculation'),
      b: z.number().optional().describe('Second operand (not required for sqrt operation)'),
      precision: z
        .number()
        .optional()
        .default(2)
        .describe('Number of decimal places for result (default: 2)'),
    },
    async ({ op, a, b, precision = 2 }) => {
      const operation = op;
      const input_1 = a;
      const input_2 = b;
      let result: number;
      let expression: string;

      // Perform calculation based on operation
      switch (operation) {
        case 'add':
          result = input_1 + (input_2 ?? 0);
          break;
        case 'subtract':
          result = input_1 - (input_2 ?? 0);
          break;
        case 'multiply':
          result = input_1 * (input_2 ?? 1);
          break;
        case 'divide':
          if (input_2 === 0) {
            // CAVEAT: Throwing a specific McpError is critical. A generic `Error`
            // would result in a vague "Internal Server Error" for the client.
            // By using `ErrorCode.InvalidParams`, we clearly signal that the
            // user's input was the source of the failure, not a server bug.
            throw new McpError(ErrorCode.InvalidParams, 'Division by zero is not allowed');
          }
          result = input_1 / (input_2 ?? 1);
          break;
        case 'power':
          result = Math.pow(input_1, input_2 ?? 2);
          break;
        case 'sqrt':
          if (input_1 < 0) {
            // ERROR HANDLING PATTERN: InvalidParams for user input validation
            // This error tells the client "your input is mathematically invalid"
            // rather than "the server failed". This distinction is crucial for
            // proper client-side error handling and user experience.
            throw new McpError(
              ErrorCode.InvalidParams,
              'Cannot calculate square root of negative number',
            );
          }
          result = Math.sqrt(input_1);
          break;
        default:
          // DEFENSIVE PROGRAMMING: This should never happen due to Zod validation,
          // but we handle it gracefully anyway. InvalidParams is appropriate here
          // because an unknown operation is fundamentally a client input problem.
          throw new McpError(ErrorCode.InvalidParams, `Unknown operation: ${operation}`);
      }

      // Check for invalid results
      if (!isFinite(result)) {
        // INTERNAL ERROR PATTERN: This represents a computational failure
        // that shouldn't happen with valid inputs. We use InternalError
        // because this indicates a problem with our calculation logic,
        // not the user's input (which was already validated above).
        throw new McpError(ErrorCode.InternalError, 'Result is not a finite number');
      }

      // Format result to specified precision
      const formattedResult = Number(result.toFixed(precision));

      // Build expression with formatted result
      switch (operation) {
        case 'add':
          expression = `${input_1} + ${input_2} = ${formattedResult}`;
          break;
        case 'subtract':
          expression = `${input_1} - ${input_2} = ${formattedResult}`;
          break;
        case 'multiply':
          expression = `${input_1} × ${input_2} = ${formattedResult}`;
          break;
        case 'divide':
          expression = `${input_1} ÷ ${input_2} = ${formattedResult}`;
          break;
        case 'power':
          expression = `${input_1}^${input_2 ?? 2} = ${formattedResult}`;
          break;
        case 'sqrt':
          expression = `√${input_1} = ${formattedResult}`;
          break;
      }

      // Store in history with formatted result
      const inputs = input_2 !== undefined ? [input_1, input_2] : [input_1];
      const historyEntry: CalculationHistoryEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        operation,
        inputs,
        result: formattedResult,
        expression,
      };
      calculationHistory.push(historyEntry);

      return {
        content: [
          {
            type: 'text',
            text: expression,
          },
        ],
      };
    },
  );

  // RESOURCE: Mathematical Constants (Static)
  server.registerResource(
    'calculator-constants',
    RESOURCE_NAMES.CONSTANTS,
    {
      title: 'Mathematical Constants',
      description: 'Common mathematical constants for calculations',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: RESOURCE_NAMES.CONSTANTS,
          mimeType: 'application/json',
          text: JSON.stringify(MATH_CONSTANTS, null, 2),
        },
      ],
    }),
  );

  // --- RESOURCE: calculation-history ---
  // Demonstrates a dynamic resource using a ResourceTemplate. It can serve:
  // 1. A list of available sub-resources (e.g., 'last 10').
  // 2. Content for a specific URI based on a parameter (ID or limit queries).
  server.registerResource(
    'calculation-history',
    new ResourceTemplate(RESOURCE_NAMES.HISTORY, {
      list: async () => ({
        resources: [
          // Predefined limit-based resources
          {
            uri: 'calculator://history/10',
            name: 'Recent Calculations (Last 10)',
            description: 'View the last 10 calculations',
            mimeType: 'application/json',
          },
          {
            uri: 'calculator://history/50',
            name: 'Extended History (Last 50)',
            description: 'View the last 50 calculations',
            mimeType: 'application/json',
          },
          {
            uri: 'calculator://history/all',
            name: 'Complete History',
            description: 'View all calculations from this session',
            mimeType: 'application/json',
          },
          // Dynamic ID-based resources for recent calculations
          ...calculationHistory.slice(-5).map((entry) => ({
            uri: `calculator://history/${entry.id}`,
            name: `Calculation: ${entry.expression}`,
            description: `Performed at ${entry.timestamp}`,
            mimeType: 'application/json',
          })),
        ],
      }),
    }),
    {
      title: 'Calculation History',
      description: 'Access calculation history by limit or specific ID',
      mimeType: 'application/json',
    },
    async (uri, params) => {
      const param = params?.['param'] as string;

      // Check if param is a UUID (calculation ID)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);

      if (isUuid) {
        // Handle ID-based query
        const calculation = calculationHistory.find((entry) => entry.id === param);
        if (!calculation) {
          throw new McpError(ErrorCode.InvalidParams, `Calculation not found: ${param}`);
        }
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(calculation, null, 2),
            },
          ],
        };
      } else {
        // Handle limit-based query
        let limit: number | undefined;
        if (param === 'all') {
          limit = undefined;
        } else {
          limit = parseInt(param) || 10;
        }

        const recent = limit ? calculationHistory.slice(-limit) : calculationHistory;

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  count: recent.length,
                  totalCount: calculationHistory.length,
                  calculations: recent,
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  );

  // RESOURCE: Calculator Statistics
  server.registerResource(
    'calculator-stats',
    RESOURCE_NAMES.STATS,
    {
      title: 'Calculator Statistics',
      description: 'Usage statistics for the current session',
      mimeType: 'application/json',
    },
    async () => {
      const operationCounts = calculationHistory.reduce(
        (acc, entry) => {
          acc[entry.operation] = (acc[entry.operation] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Calculate average calculations per minute
      let averageCalculationsPerMinute = 0;
      if (calculationHistory.length > 0) {
        const firstEntry = calculationHistory[0];
        const lastEntry = calculationHistory[calculationHistory.length - 1];
        if (firstEntry && lastEntry) {
          const firstTimestamp = new Date(firstEntry.timestamp);
          const lastTimestamp = new Date(lastEntry.timestamp);
          const durationMinutes =
            (lastTimestamp.getTime() - firstTimestamp.getTime()) / (1000 * 60);
          averageCalculationsPerMinute =
            durationMinutes > 0
              ? calculationHistory.length / durationMinutes
              : calculationHistory.length;
        }
      }

      const stats = {
        totalCalculations: calculationHistory.length,
        operationCounts,
        sessionStarted: calculationHistory[0]?.timestamp || new Date().toISOString(),
        lastCalculation: calculationHistory[calculationHistory.length - 1]?.timestamp || null,
        averageCalculationsPerMinute,
      };

      return {
        contents: [
          {
            uri: RESOURCE_NAMES.STATS,
            mimeType: 'application/json',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    },
  );

  // PROMPT: Explain Calculation
  server.prompt(
    PROMPT_NAMES.EXPLAIN_CALCULATION,
    'Get a detailed explanation of a mathematical operation',
    {
      expression: z.string().describe('Mathematical expression to explain'),
      level: z.string().optional().describe('Level: elementary, intermediate, or advanced'),
      includeSteps: z.string().optional().describe('Include steps: true or false'),
    },
    ({ expression, level = 'intermediate', includeSteps = 'true' }) => {
      const includeStepsBool = includeSteps === 'true';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please explain this mathematical expression: "${expression}"

Target audience: ${level} level
${includeStepsBool ? 'Include step-by-step solution.' : 'Provide a concise explanation.'}

Focus on:
- What the expression means
- How to solve it${includeStepsBool ? ' step by step' : ''}
- Common mistakes to avoid
- Real-world applications where this type of calculation is used`,
            },
          },
        ],
      };
    },
  );

  // PROMPT: Generate Practice Problems
  server.prompt(
    PROMPT_NAMES.GENERATE_PROBLEMS,
    'Create practice problems based on recent calculations',
    {
      topic: z.string().describe('Type of problems: arithmetic, algebra, geometry, or mixed'),
      difficulty: z.string().optional().describe('Difficulty: easy, medium, or hard'),
      count: z.string().optional().describe('Number of problems (1-10)'),
    },
    ({ topic, difficulty = 'medium', count = '5' }) => {
      const countNum = parseInt(count) || 5;
      // Analyze recent calculations to inform problem generation
      const recentOperations = calculationHistory
        .slice(-10)
        .map((h) => h.operation)
        .filter((op, index, self) => self.indexOf(op) === index);

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate ${countNum} ${difficulty} ${topic} practice problems.

${recentOperations.length > 0 ? `Recent operations used: ${recentOperations.join(', ')}` : ''}

Requirements:
- Include clear problem statements
- Provide answer keys at the end
- Make problems progressively challenging
- Include word problems where appropriate
- Format for easy reading
- If possible, relate to the types of calculations recently performed`,
            },
          },
        ],
      };
    },
  );

  // PROMPT: Calculator Tutorial
  server.prompt(
    PROMPT_NAMES.CALCULATOR_TUTORIAL,
    'Generate a tutorial for using this calculator effectively',
    {
      focusArea: z
        .enum(['basic', 'advanced', 'tips'])
        .optional()
        .describe('Area to focus the tutorial on'),
    },
    ({ focusArea = 'basic' }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a tutorial for using this calculator MCP server.

Focus area: ${focusArea}

Available operations: add, subtract, multiply, divide, power, sqrt

Please cover:
${
  focusArea === 'basic'
    ? '- How to perform basic calculations\n- Understanding the operation types\n- Reading calculation results'
    : focusArea === 'advanced'
      ? '- Using power and square root operations\n- Precision control\n- Accessing calculation history and statistics'
      : '- Best practices for accuracy\n- Common calculation patterns\n- How to use the explain-calculation feature'
}

Make it practical with examples.`,
          },
        },
      ],
    }),
  );

  // --- TOOL: demo_progress ---
  // Demonstrates the correct way to handle progress notifications.
  // KEY INSIGHT: The `progressToken` MUST come from the client via `_meta.progressToken`.
  // The server should not generate its own token.
  server.tool(
    TOOL_NAMES.DEMO_PROGRESS,
    'Demonstrates progress notifications via SSE stream',
    {
      task: z.string().optional().describe('Task name for the progress demo'),
    },
    async ({ task = 'Processing' }, { sendNotification, _meta }) => {
      const progressToken = _meta?.progressToken;

      if (!progressToken) {
        // Client didn't request progress updates
        return {
          content: [
            {
              type: 'text',
              text: 'Progress notifications not requested by client. Use _meta.progressToken to enable progress updates.',
            },
          ],
        };
      }

      // Send progress notifications asynchronously
      void (async () => {
        try {
          await sendNotification({
            method: 'notifications/message',
            params: {
              level: 'info',
              data: `Starting progress demo: ${task} (progressToken: ${progressToken})`,
            },
          });

          // Send progress updates
          for (let i = 20; i <= 100; i += 20) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            await sendNotification({
              method: 'notifications/progress',
              params: {
                progressToken,
                progress: i,
                total: 100,
                message: `${task} - ${i}% complete`,
              },
            });
          }

          // Send completion notification
          await sendNotification({
            method: 'notifications/progress',
            params: {
              progressToken,
              progress: 100,
              total: 100,
              message: `${task} - Completed`,
            },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Failed to send progress notifications:', errorMessage, {
            originalError: error,
          });
          // Send error notification
          try {
            await sendNotification({
              method: 'notifications/message',
              params: {
                level: 'error',
                data: `Progress demo failed: ${errorMessage}`,
              },
            });
          } catch (notifyError: unknown) {
            const notifyErrorMessage =
              notifyError instanceof Error ? notifyError.message : String(notifyError);
            console.error('Failed to send error notification:', notifyErrorMessage);
          }
        }
      })();

      return {
        content: [
          {
            type: 'text',
            text: `Task started. Progress updates will be sent to token: ${progressToken}`,
          },
        ],
      };
    },
  );

  // TOOL: Solve Math Problem (Extended)
  server.tool(
    TOOL_NAMES.SOLVE_MATH_PROBLEM,
    'Solve complex math problems step by step',
    {
      problem: z.string().describe('Mathematical problem to solve'),
      showSteps: z.boolean().optional().default(true).describe('Show step-by-step solution'),
    },
    async ({ problem, showSteps = true }) => {
      // Simple problem solver for demonstration
      // In production, integrate with a proper math solving engine
      const steps = [];
      let solution = '';

      try {
        // Parse common word problems
        if (problem.toLowerCase().includes('solve for')) {
          // Simple linear equation solver
          const match = problem.match(/solve for (\w+).*?([\w\s+\-*/=0-9]+)/i);
          if (match && match[1] && match[2]) {
            const variable = match[1];
            const equation = match[2];
            steps.push(`Given equation: ${equation}`);
            steps.push(`Solving for variable: ${variable}`);

            // Very basic solver for ax + b = c format
            const simpleMatch = equation.match(/(\d*)\s*\*?\s*(\w+)\s*([+-])\s*(\d+)\s*=\s*(\d+)/);
            if (simpleMatch && simpleMatch[3] && simpleMatch[4] && simpleMatch[5]) {
              const coeff = simpleMatch[1] || '1';
              const op = simpleMatch[3];
              const constant = parseFloat(simpleMatch[4]);
              const result = parseFloat(simpleMatch[5]);

              if (op === '+') {
                const value = (result - constant) / parseFloat(coeff);
                solution = `${variable} = ${value}`;
                steps.push(`Subtract ${constant} from both sides`);
                steps.push(`${result} - ${constant} = ${result - constant}`);
                steps.push(`Divide by ${coeff}`);
                steps.push(solution);
              } else {
                const value = (result + constant) / parseFloat(coeff);
                solution = `${variable} = ${value}`;
                steps.push(`Add ${constant} to both sides`);
                steps.push(`${result} + ${constant} = ${result + constant}`);
                steps.push(`Divide by ${coeff}`);
                steps.push(solution);
              }
            }
          }
        } else if (problem.toLowerCase().includes('what is')) {
          // Simple arithmetic evaluation
          const match = problem.match(/what is ([\d\s+\-*/().]+)/i);
          if (match) {
            const expression = match[1];
            steps.push(`Evaluating: ${expression}`);
            const result = Function('"use strict"; return (' + expression + ')')();
            solution = `${expression} = ${result}`;
            steps.push(solution);
          }
        }

        if (!solution) {
          // Fallback for unrecognized problems
          steps.push('This problem requires advanced mathematical analysis.');
          steps.push('Breaking down the problem...');
          solution = 'Please provide a more specific mathematical expression or equation.';
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  problem,
                  solution,
                  steps: showSteps ? steps : undefined,
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Failed to solve problem: ${errorMessage}`,
                  problem,
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  );

  // TOOL: Explain Formula (Extended)
  server.tool(
    TOOL_NAMES.EXPLAIN_FORMULA,
    'Explain mathematical formulas and their applications',
    {
      formula: z.string().describe('Mathematical formula to explain'),
      context: z.string().optional().describe('Context or field of application'),
    },
    async ({ formula, context }) => {
      // Formula explanation database
      interface FormulaExplanation {
        name: string;
        description: string;
        variables?: Record<string, string>;
        applications?: string[];
        example?: string;
        analysis?: string;
        elements?: string[];
        operators?: string[];
        suggestion?: string;
      }

      const formulaExplanations: Record<string, FormulaExplanation> = {
        'a^2 + b^2 = c^2': {
          name: 'Pythagorean Theorem',
          description: 'Relates the lengths of sides in a right triangle',
          variables: {
            a: 'Length of one leg',
            b: 'Length of other leg',
            c: 'Length of hypotenuse',
          },
          applications: ['Construction', 'Navigation', 'Computer graphics'],
          example: 'If a=3 and b=4, then c=5 (since 9+16=25)',
        },
        'E = mc^2': {
          name: 'Mass-Energy Equivalence',
          description: "Einstein's equation showing the relationship between mass and energy",
          variables: {
            E: 'Energy (joules)',
            m: 'Mass (kg)',
            c: 'Speed of light (m/s)',
          },
          applications: ['Nuclear physics', 'Particle physics', 'Cosmology'],
          example: '1 kg of matter contains 9×10^16 joules of energy',
        },
        'F = ma': {
          name: "Newton's Second Law",
          description: 'The fundamental equation of classical mechanics',
          variables: {
            F: 'Force (Newtons)',
            m: 'Mass (kg)',
            a: 'Acceleration (m/s²)',
          },
          applications: ['Engineering', 'Physics', 'Rocket science'],
          example: 'A 10kg object accelerating at 2m/s² experiences 20N of force',
        },
        'A = πr²': {
          name: 'Area of a Circle',
          description: 'Calculates the area enclosed by a circle',
          variables: {
            A: 'Area',
            π: 'Pi (approximately 3.14159)',
            r: 'Radius of the circle',
          },
          applications: ['Geometry', 'Engineering', 'Architecture'],
          example: 'A circle with radius 5 has area 25π ≈ 78.54 square units',
        },
      };

      // Try to match the formula
      const normalizedFormula = formula.replace(/\s+/g, '').toLowerCase();
      let explanation = null;

      for (const [key, value] of Object.entries(formulaExplanations)) {
        if (key.replace(/\s+/g, '').toLowerCase() === normalizedFormula) {
          explanation = value;
          break;
        }
      }

      if (!explanation) {
        // Provide generic explanation for unrecognized formulas
        explanation = {
          name: 'Custom Formula',
          description: 'This appears to be a mathematical relationship between variables',
          analysis: `The formula "${formula}" contains the following elements:`,
          elements: formula.match(/[a-zA-Z]+/g) || [],
          operators: formula.match(/[+\-*/^=]/g) || [],
          suggestion:
            'Consider breaking down each variable and operation to understand the relationship',
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                formula,
                context,
                explanation,
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // TOOL: Calculator Assistant (Extended)
  server.tool(
    TOOL_NAMES.CALCULATOR_ASSISTANT,
    'Interactive calculator assistant for mathematical queries',
    {
      query: z.string().describe('Natural language query about calculations or math'),
      includeHistory: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include calculation history in context'),
    },
    async ({ query, includeHistory = false }) => {
      interface AssistantResponse {
        query: string;
        timestamp: string;
        type?: string;
        message?: string;
        capabilities?: string[];
        examples?: string[];
        history?: CalculationHistoryEntry[];
        totalCalculations?: number;
        operation?: { a: number; b: number; op: string };
        result?: number;
        expression?: string;
        recentHistory?: CalculationHistoryEntry[];
      }

      const response: AssistantResponse = {
        query,
        timestamp: new Date().toISOString(),
      };

      // Parse the query for intent
      const lowerQuery = query.toLowerCase();

      if (lowerQuery.includes('help') || lowerQuery.includes('what can')) {
        response.type = 'help';
        response.message = 'I can help you with:';
        response.capabilities = [
          'Basic arithmetic (add, subtract, multiply, divide)',
          'Advanced operations (power, square root)',
          'Solving simple equations',
          'Explaining mathematical formulas',
          'Batch calculations',
          'Calculation history and statistics',
        ];
        response.examples = [
          'Calculate 25 * 4',
          'What is the square root of 144?',
          'Solve for x: 2x + 5 = 15',
          'Explain the Pythagorean theorem',
          'Show my calculation history',
        ];
      } else if (lowerQuery.includes('history')) {
        response.type = 'history';
        response.history = calculationHistory.slice(-5);
        response.totalCalculations = calculationHistory.length;
        response.message = `You have performed ${calculationHistory.length} calculations in this session.`;
      } else if (lowerQuery.includes('calculate') || lowerQuery.includes('what is')) {
        // Extract numbers and operations from the query
        const numbers = query.match(/-?\d+(\.\d+)?/g);
        const operations = query.match(
          /\b(add|subtract|multiply|divide|plus|minus|times|divided by)\b/gi,
        );

        if (numbers && numbers.length >= 2 && operations && operations.length > 0) {
          const a = parseFloat(numbers[0]!);
          const b = parseFloat(numbers[1]!);
          let op = operations[0].toLowerCase();

          // Map word operations to symbols
          const opMap: Record<string, string> = {
            add: 'add',
            plus: 'add',
            subtract: 'subtract',
            minus: 'subtract',
            multiply: 'multiply',
            times: 'multiply',
            divide: 'divide',
            'divided by': 'divide',
          };

          op = opMap[op] || op;

          // Perform calculation
          let result: number;
          switch (op) {
            case 'add':
              result = a + b;
              break;
            case 'subtract':
              result = a - b;
              break;
            case 'multiply':
              result = a * b;
              break;
            case 'divide':
              result = a / b;
              break;
            default:
              result = 0;
          }

          response.type = 'calculation';
          response.operation = { a, b, op };
          response.result = Math.round(result * 10000) / 10000;
          response.expression = `${a} ${op} ${b} = ${response.result}`;
          response.message = `The result is ${response.result}`;
        } else {
          response.type = 'clarification';
          response.message =
            'I need more information to perform this calculation. Please provide two numbers and an operation.';
        }
      } else {
        response.type = 'general';
        response.message =
          'I\'m ready to help with mathematical calculations. Try asking me to calculate something or type "help" for more options.';
      }

      if (includeHistory && calculationHistory.length > 0) {
        response.recentHistory = calculationHistory.slice(-3);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    },
  );

  // TOOL: Batch Calculate
  server.tool(
    TOOL_NAMES.BATCH_CALCULATE,
    'Perform multiple calculations in a single request',
    {
      operations: z
        .array(
          z.object({
            op: z.enum(['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt']),
            a: z.number(),
            b: z.number().optional(),
            precision: z.number().optional().default(4),
          }),
        )
        .describe('Array of calculation operations'),
    },
    async ({ operations }) => {
      const results = [];
      for (const operation of operations) {
        try {
          let result: number;
          const { op, a, b = 0, precision = 4 } = operation;

          switch (op) {
            case 'add':
              result = a + b;
              break;
            case 'subtract':
              result = a - b;
              break;
            case 'multiply':
              result = a * b;
              break;
            case 'divide':
              if (b === 0) {
                results.push({
                  error: 'Division by zero',
                  operation,
                });
                continue;
              }
              result = a / b;
              break;
            case 'power':
              result = Math.pow(a, b);
              break;
            case 'sqrt':
              if (a < 0) {
                results.push({
                  error: 'Cannot calculate square root of negative number',
                  operation,
                });
                continue;
              }
              result = Math.sqrt(a);
              break;
          }

          // Round to specified precision
          result = Math.round(result * Math.pow(10, precision)) / Math.pow(10, precision);

          const expression = op === 'sqrt' ? `sqrt(${a})` : `${a} ${op} ${b}`;
          results.push({
            expression,
            result,
            operation,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.push({
            error: `Failed to calculate: ${errorMessage}`,
            operation,
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalOperations: operations.length,
                successful: results.filter((r) => !r.error).length,
                failed: results.filter((r) => r.error).length,
                results,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // TOOL: Advanced Calculate (SECURITY WARNING - DEMONSTRATION ONLY)
  server.tool(
    TOOL_NAMES.ADVANCED_CALCULATE,
    'SECURITY WARNING: This tool demonstrates unsafe expression evaluation and should NOT be used in production',
    {
      expression: z.string().describe('Mathematical expression to evaluate'),
      variables: z
        .record(z.number())
        .optional()
        .describe('Variables to substitute in the expression'),
    },
    async ({ expression, variables = {} }) => {
      // !!! CRITICAL SECURITY WARNING !!!
      // The use of `new Function()` is functionally equivalent to `eval()` and is
      // EXTREMELY DANGEROUS when used with untrusted user input, as it allows for
      // Remote Code Execution (RCE) on the server.
      //
      // This tool is included for DEMONSTRATION PURPOSES ONLY to show complex
      // input parsing.
      //
      // In a REAL PRODUCTION ENVIRONMENT, you MUST replace this with a safe,
      // sandboxed math expression parser library like `mathjs` or a similar
      // vetted tool. NEVER use `eval` or `new Function` on user input.
      // !!! END CRITICAL SECURITY WARNING !!!

      console.warn(
        '⚠️  SECURITY WARNING: advanced_calculate tool is executing potentially unsafe code evaluation',
      );

      try {
        // Simple expression evaluator (UNSAFE - DO NOT USE IN PRODUCTION)
        let evalExpression = expression;

        // Replace variables
        for (const [varName, value] of Object.entries(variables)) {
          evalExpression = evalExpression.replace(
            new RegExp(`\\b${varName}\\b`, 'g'),
            value.toString(),
          );
        }

        // Basic validation - only allow numbers, operators, and math functions
        if (!/^[0-9+\-*/().\s\w]+$/.test(evalExpression)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid expression: contains unsupported characters',
          );
        }

        // Replace math functions with Math.* equivalents
        evalExpression = evalExpression
          .replace(/\bsqrt\(/g, 'Math.sqrt(')
          .replace(/\bpow\(/g, 'Math.pow(')
          .replace(/\bsin\(/g, 'Math.sin(')
          .replace(/\bcos\(/g, 'Math.cos(')
          .replace(/\btan\(/g, 'Math.tan(')
          .replace(/\babs\(/g, 'Math.abs(')
          .replace(/\bfloor\(/g, 'Math.floor(')
          .replace(/\bceil\(/g, 'Math.ceil(')
          .replace(/\bround\(/g, 'Math.round(')
          .replace(/\bPI\b/g, 'Math.PI')
          .replace(/\bE\b/g, 'Math.E');

        // UNSAFE EVALUATION - DO NOT USE IN PRODUCTION
        // This is a demonstration of what NOT to do for security reasons
        const result = Function('"use strict"; return (' + evalExpression + ')')();

        if (typeof result !== 'number' || !isFinite(result)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Expression did not evaluate to a finite number',
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  securityWarning:
                    'This tool uses unsafe code evaluation and should not be used in production',
                  expression,
                  variables,
                  evaluatedExpression: evalExpression,
                  result: Math.round(result * 10000) / 10000, // Round to 4 decimal places
                  recommendation:
                    'Use a safe math expression parser like mathjs in production environments',
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Failed to evaluate expression: ${errorMessage}`,
                  expression,
                  variables,
                  securityNote:
                    'This failure demonstrates why safe expression parsers should be used',
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  );

  return server;
}

// ===================================================================================
// === SINGLETON PATTERN INSTANTIATION
// ===================================================================================
// We create ONE single instance of our McpServer. This instance is shared across
// all incoming connections, making it highly memory efficient. All shared state
// (like `calculationHistory`) lives inside this single object.
const sharedMcpServer: McpServer = createCalculatorServer();
console.warn('[Server] Shared Calculator MCP Server instance created.');

// ===================================================================================
// === WEB SERVER SETUP (Express.js)
// ===================================================================================
const app = express();

// --- Middleware Configuration ---

// 1. CORS (Cross-Origin Resource Sharing)
// This is critical for browser-based clients to be able to connect to the server.
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
    // IMPORTANT: This header MUST be exposed. It allows the browser client's
    // JavaScript code to read the session ID from the response headers.
    exposedHeaders: ['Mcp-Session-Id'],
  }),
);

// 2. JSON Body Parser
// This middleware automatically parses incoming JSON request bodies.
app.use(express.json());

// 3. Request Logger
// A simple middleware to log every incoming request for debugging purposes.
app.use((_req: Request, _res: Response, next: express.NextFunction) => {
  // Simple request logging middleware
  next();
});

// ===================================================================================
// === CORE MCP ENDPOINT (SINGLE ENDPOINT PATTERN)
// ===================================================================================
// This single `app.all('/sse', ...)` handler manages the ENTIRE MCP lifecycle,
// including initialization, command execution, and SSE streaming. This is the
// modern, recommended best practice.
app.all('/sse', (req: Request, res: Response) => {
  void (async () => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      // --- Session and Transport Routing Logic ---

      // CASE 1: Existing Session.
      // The client sent a valid session ID that we have in our in-memory store.
      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      }
      // CASE 2: New Session Initialization.
      // The request has NO session ID, is a POST, and is a valid `initialize` request.
      else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
        console.warn('[MCP] New initialization request. Creating session...');

        // Create a new, lightweight transport just for this session.
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          // This callback is fired by the SDK once the session ID is created.
          // We use it to store the new transport in our global map.
          onsessioninitialized: (newSessionId) => {
            console.warn(`[MCP] Session initialized with ID: ${newSessionId}`);
            transports[newSessionId] = transport;
          },
        });

        // CRITICAL: Set up cleanup logic. When the transport closes (e.g., client
        // disconnects or DELETE is called), remove it from our map to prevent memory leaks.
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.warn(`[MCP] Transport closed for session ${sid}. Cleaning up.`);
            delete transports[sid];
          }
        };

        // Connect this new transport to our one-and-only shared server instance.
        await sharedMcpServer.connect(transport);
      }
      // CASE 3: Invalid Request.
      // The request is not an initialization and lacks a valid, active session ID.
      else {
        const errorCode = sessionId ? 404 : 400; // Not Found vs. Bad Request
        const message = sessionId
          ? 'MCP Session not found or has expired.'
          : 'Bad Request: All non-initialize MCP requests must include a valid Mcp-Session-Id header.';

        console.error(`[MCP] Invalid request: ${message} (ID: ${sessionId || 'none'})`);
        res.status(errorCode).json({
          jsonrpc: '2.0',
          error: { code: errorCode === 404 ? -32001 : -32600, message },
          id: req.body?.id ?? null,
        });
        return;
      }

      // --- Delegate to SDK ---
      // At this point, we have found or created a valid transport. We now hand over
      // control to the SDK's transport to handle the raw request and response.
      // The SDK will correctly handle GET (for SSE stream), POST (for commands),
      // and DELETE (for session termination).
      await transport.handleRequest(req, res, req.body);
    } catch (error: unknown) {
      // A top-level catch-all for unexpected errors in the transport layer.
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('[MCP] Unhandled error in transport layer:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: `Internal Server Error: ${errorMessage}` },
          id: req.body?.id ?? null,
        });
      }
    }
  })().catch((err: unknown) => {
    console.error('[MCP] Unhandled async error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal Server Error' },
        id: null,
      });
    }
  });
});

// Health check endpoint (remains the same)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    activeSessions: Object.keys(transports).length,
    transport: 'streamableHttp', // Updated transport name
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Calculator StreamableHTTP MCP Server',
    version: '1.0.0',
    transport: 'streamableHttp', // Updated transport name
    endpoints: {
      sse: '/sse', // Updated endpoint
      health: '/health',
    },
    instructions: 'Communicate with the /sse endpoint using the Streamable HTTP transport.',
  });
});

// ===================================================================================
// === SERVER STARTUP
// ===================================================================================
const httpServer: http.Server = app.listen(PORT, () => {
  console.warn(`
╔═══════════════════════════════════════════════════════════╗
║     Calculator StreamableHTTP MCP Server Started (Modern) ║
╠═══════════════════════════════════════════════════════════╣
║  Transport: StreamableHTTP (Best Practice)                ║
║  Port: ${PORT}                                              ║
║  SSE Endpoint: http://${HOST}:${PORT}/sse                     ║
║  Health: http://${HOST}:${PORT}/health                       ║
║                                                           ║
║  This server uses the modern, single-endpoint transport,  ║
║  providing a more robust and efficient foundation.        ║
╚═══════════════════════════════════════════════════════════╝

To test with MCP Inspector:
npx @modelcontextprotocol/inspector --cli http://localhost:${PORT}/sse
  `);
});

// ===================================================================================
// === GRACEFUL SHUTDOWN
// ===================================================================================
/**
 * Handles graceful shutdown of the server. This is essential for production to
 * ensure no requests are dropped and all connections are closed cleanly.
 */
const shutdown = () => {
  console.warn('\n[Server] Shutting down gracefully...');

  // 1. Proactively close all active client transports. This sends a signal
  //    to connected clients that the server is going down.
  console.warn(`[Server] Closing ${Object.keys(transports).length} active sessions...`);
  for (const sessionId in transports) {
    try {
      const transport = transports[sessionId];
      if (transport) {
        const closeResult = transport.close();
        if (closeResult instanceof Promise) {
          void closeResult.catch((error: unknown) => {
            console.error(`Failed to close session ${sessionId}:`, error);
          });
        }
      }
    } catch (error: unknown) {
      console.error(`Failed to close session ${sessionId}:`, error);
    }
  }

  // 2. Stop the HTTP server from accepting any new incoming connections.
  httpServer.close(() => {
    console.warn('[Server] HTTP server closed. Exiting.');
    process.exit(0); // Success
  });

  // 3. Set a force-exit timer. If the server hangs during shutdown for any
  //    reason, this ensures the process will still exit after a timeout.
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out. Forcing exit.');
    process.exit(1); // Error
  }, 5000); // 5-second timeout
};

// Listen for termination signals from the operating system or container orchestrator.
process.on('SIGINT', shutdown); // Sent by Ctrl+C
process.on('SIGTERM', shutdown); // Sent by `kill` or Docker/Kubernetes
