import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import {
  CalculationHistoryEntry,
  MATH_CONSTANTS,
} from '../types/calculator.js';

export function createCalculatorServer(): McpServer {
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
    }
  );

  // In-memory storage for calculation history
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
      })
    );
  }

  // TOOL: Calculator
  server.tool(
    'calculate',
    'Performs arithmetic operations with calculation history tracking',
    {
      op: z.enum(['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt']).describe('Arithmetic operation to perform'),
      a: z.number().describe('First operand for the calculation'),
      b: z.number().optional().describe('Second operand (not required for sqrt operation)'),
      precision: z.number().optional().default(2).describe('Number of decimal places for result (default: 2)'),
    },
    async ({ op, a, b, precision: _precision }) => {
      const operation = op;
      const input_1 = a;
      const input_2 = b;
      let result: number;
      let expression: string;

      // Perform calculation based on operation
      switch (operation) {
        case 'add':
          result = input_1 + (input_2 ?? 0);
          expression = `${input_1} + ${input_2} = ${result}`;
          break;
        case 'subtract':
          result = input_1 - (input_2 ?? 0);
          expression = `${input_1} - ${input_2} = ${result}`;
          break;
        case 'multiply':
          result = input_1 * (input_2 ?? 1);
          expression = `${input_1} × ${input_2} = ${result}`;
          break;
        case 'divide':
          if (input_2 === 0) {
            throw new Error('Division by zero is not allowed');
          }
          result = input_1 / (input_2 ?? 1);
          expression = `${input_1} ÷ ${input_2} = ${result}`;
          break;
        case 'power':
          result = Math.pow(input_1, input_2 ?? 2);
          expression = `${input_1}^${input_2 ?? 2} = ${result}`;
          break;
        case 'sqrt':
          if (input_1 < 0) {
            throw new Error('Cannot calculate square root of negative number');
          }
          result = Math.sqrt(input_1);
          expression = `√${input_1} = ${result}`;
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Check for invalid results
      if (!isFinite(result)) {
        throw new Error('Result is not a finite number');
      }

      // Store in history
      const inputs = input_2 !== undefined ? [input_1, input_2] : [input_1];
      const historyEntry: CalculationHistoryEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        operation,
        inputs,
        result,
        expression,
      };
      calculationHistory.push(historyEntry);

      // Format the result
      // const formatted = result.toFixed(precision ?? 2);

      return {
        content: [
          {
            type: 'text',
            text: expression,
          },
        ],
      };
    }
  );

  // RESOURCE: Mathematical Constants (Static)
  server.registerResource(
    'calculator-constants',
    'calculator://constants',
    {
      title: 'Mathematical Constants',
      description: 'Common mathematical constants for calculations',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'calculator://constants',
          mimeType: 'application/json',
          text: JSON.stringify(MATH_CONSTANTS, null, 2),
        },
      ],
    })
  );

  // RESOURCE: Calculation History (Dynamic)
  server.registerResource(
    'calculation-history',
    new ResourceTemplate(
      'calculator://history/{limit}',
      {
        list: async () => ({
          resources: [
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
          ],
        }),
      }
    ),
    {
      title: 'Calculation History',
      description: 'View recent calculation history',
      mimeType: 'application/json',
    },
    async (uri, params) => {
      const limitParam = params?.['limit'] as string;
      let limit: number | undefined;

      if (limitParam === 'all') {
        limit = undefined;
      } else {
        limit = parseInt(limitParam) || 10;
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
              2
            ),
          },
        ],
      };
    }
  );

  // RESOURCE: Calculator Statistics
  server.registerResource(
    'calculator-stats',
    'calculator://stats',
    {
      title: 'Calculator Statistics',
      description: 'Usage statistics for the current session',
      mimeType: 'application/json',
    },
    async () => {
      const operationCounts = calculationHistory.reduce((acc, entry) => {
        acc[entry.operation] = (acc[entry.operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate average calculations per minute
      let averageCalculationsPerMinute = 0;
      if (calculationHistory.length > 0) {
        const firstEntry = calculationHistory[0];
        const lastEntry = calculationHistory[calculationHistory.length - 1];
        if (firstEntry && lastEntry) {
          const firstTimestamp = new Date(firstEntry.timestamp);
          const lastTimestamp = new Date(lastEntry.timestamp);
          const durationMinutes = (lastTimestamp.getTime() - firstTimestamp.getTime()) / (1000 * 60);
          averageCalculationsPerMinute = durationMinutes > 0 ? calculationHistory.length / durationMinutes : calculationHistory.length;
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
            uri: 'calculator://stats',
            mimeType: 'application/json',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }
  );

  // PROMPT: Explain Calculation
  server.prompt(
    'explain-calculation',
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
    }
  );

  // PROMPT: Generate Practice Problems
  server.prompt(
    'generate-problems',
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
    }
  );

  // PROMPT: Calculator Tutorial
  server.prompt(
    'calculator-tutorial',
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
    })
  );

  // TOOL: Demo Progress (Extended) - Demonstrates SSE progress events
  server.tool(
    'demo_progress',
    'Demonstrates progress notifications via SSE stream',
    {
      task: z.string().optional().describe('Task name for the progress demo'),
    },
    async ({ task = 'Processing' }) => {
      // Return immediately with 202 Accepted
      // Progress events will be sent via SSE stream
      const taskId = randomUUID();
      
      // Schedule progress events to be sent via SSE
      setTimeout(async () => {
        // Note: In a real implementation, you would access the transport
        // through the server's connection context
        // For demo purposes, we'll just log the progress
        for (let i = 20; i <= 100; i += 20) {
          console.log(`Demo progress task ${taskId}: ${task} - ${i}%`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log(`Demo progress task ${taskId}: ${task} - Completed`);
      }, 100);

      return {
        content: [
          {
            type: 'text',
            text: `Progress demo started (taskId: ${taskId}). Watch for progress events in the SSE stream.`,
          },
        ],
      };
    }
  );

  // TOOL: Solve Math Problem (Extended) - Limited support in SSE demo
  server.tool(
    'solve_math_problem',
    'Solve complex math problems (limited support in SSE demo)',
    {
      problem: z.string().describe('Mathematical problem to solve'),
    },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: 'solve_math_problem: Limited support in SSE demo. For full functionality, use Streamable HTTP transport.',
          },
        ],
      };
    }
  );

  // TOOL: Explain Formula (Extended) - Limited support in SSE demo
  server.tool(
    'explain_formula',
    'Explain mathematical formulas (limited support in SSE demo)',
    {
      formula: z.string().describe('Mathematical formula to explain'),
    },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: 'explain_formula: Limited support in SSE demo. For full functionality, use Streamable HTTP transport.',
          },
        ],
      };
    }
  );

  // TOOL: Calculator Assistant (Extended) - Limited support in SSE demo
  server.tool(
    'calculator_assistant',
    'Interactive calculator assistant (limited support in SSE demo)',
    {
      query: z.string().describe('Query for the calculator assistant'),
    },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: 'calculator_assistant: Limited support in SSE demo. For full functionality, use Streamable HTTP transport.',
          },
        ],
      };
    }
  );

  // TOOL: Batch Calculate - Not supported in SSE
  server.tool(
    'batch_calculate',
    'Batch calculation operations (not supported in SSE)',
    {
      operations: z.array(z.any()).describe('Array of operations'),
    },
    async () => {
      throw {
        code: -32601,
        message: 'Method not found: batch_calculate is not supported in SSE transport',
      };
    }
  );

  // TOOL: Advanced Calculate - Not supported in SSE
  server.tool(
    'advanced_calculate',
    'Advanced calculation operations (not supported in SSE)',
    {
      expression: z.string().describe('Mathematical expression'),
    },
    async () => {
      throw {
        code: -32601,
        message: 'Method not found: advanced_calculate is not supported in SSE transport',
      };
    }
  );

  // Update history resource to use calculationId pattern
  server.registerResource(
    'calculation-history-by-id',
    new ResourceTemplate(
      'calculator://history/{calculationId}',
      {
        list: async () => ({
          resources: calculationHistory.slice(-10).map(entry => ({
            uri: `calculator://history/${entry.id}`,
            name: `Calculation: ${entry.expression}`,
            description: `Performed at ${entry.timestamp}`,
            mimeType: 'application/json',
          })),
        }),
      }
    ),
    {
      title: 'Calculation by ID',
      description: 'Retrieve a specific calculation by its ID',
      mimeType: 'application/json',
    },
    async (uri, params) => {
      const calculationId = params?.['calculationId'] as string;
      const calculation = calculationHistory.find(entry => entry.id === calculationId);
      
      if (!calculation) {
        throw new Error(`Calculation not found: ${calculationId}`);
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
    }
  );

  return server;
}