import type { CallToolResult, GetPromptResult, ReadResourceResult } from '@modelcontextprotocol/server';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

const OperationSchema = z.enum(['add', 'subtract', 'multiply', 'divide']);

type Operation = z.infer<typeof OperationSchema>;

export interface CalculationRecord {
  id: string;
  operation: Operation;
  left: number;
  right: number;
  result: number;
  createdAt: string;
}

const toFormula = (record: CalculationRecord): string => {
  const symbolByOperation: Record<Operation, string> = {
    add: '+',
    subtract: '-',
    multiply: '*',
    divide: '/'
  };

  const symbol = symbolByOperation[record.operation];
  return `${record.left} ${symbol} ${record.right} = ${record.result}`;
};

const evaluate = (left: number, right: number, operation: Operation): number => {
  switch (operation) {
    case 'add':
      return left + right;
    case 'subtract':
      return left - right;
    case 'multiply':
      return left * right;
    case 'divide':
      if (right === 0) {
        throw new Error('Division by zero is not allowed.');
      }
      return left / right;
    default:
      throw new Error(`Unsupported operation: ${operation satisfies never}`);
  }
};

export interface ExampleMcpServer {
  server: McpServer;
  getHistory: () => CalculationRecord[];
}

export const createExampleMcpServer = (): ExampleMcpServer => {
  const history: CalculationRecord[] = [];

  const server = new McpServer(
    {
      name: 'example-mcp-sse',
      version: '2.0.0-alpha.0'
    },
    {
      capabilities: { logging: {} }
    }
  );

  server.registerTool(
    'calculate',
    {
      title: 'Calculator',
      description: 'Perform a basic arithmetic calculation and persist it in session history.',
      inputSchema: z.object({
        operation: OperationSchema.describe('One of add, subtract, multiply, divide.'),
        left: z.number().describe('Left-hand value.'),
        right: z.number().describe('Right-hand value.')
      }),
      outputSchema: z.object({
        id: z.string(),
        result: z.number(),
        formula: z.string()
      })
    },
    async ({ operation, left, right }, ctx): Promise<CallToolResult> => {
      const result = evaluate(left, right, operation);
      const record: CalculationRecord = {
        id: `calc_${history.length + 1}`,
        operation,
        left,
        right,
        result,
        createdAt: new Date().toISOString()
      };

      history.push(record);
      await ctx.mcpReq.log('info', `Calculated ${toFormula(record)}`);

      const output = {
        id: record.id,
        result: record.result,
        formula: toFormula(record)
      };

      return {
        content: [{ type: 'text', text: output.formula }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'history-summary',
    {
      description: 'Return a compact summary of the latest calculations in this session.',
      inputSchema: z.object({
        limit: z.number().int().positive().max(25).default(5)
      })
    },
    async ({ limit }): Promise<CallToolResult> => {
      const latest = history.slice(-limit);
      const text = latest.length === 0 ? 'No calculations yet.' : latest.map(toFormula).join('\n');

      return {
        content: [{ type: 'text', text }],
        structuredContent: {
          count: latest.length,
          items: latest
        }
      };
    }
  );

  server.registerResource(
    'calculation-history',
    'calc://history',
    {
      title: 'Session Calculation History',
      description: 'All calculations performed in the current MCP session.',
      mimeType: 'application/json'
    },
    async (): Promise<ReadResourceResult> => {
      return {
        contents: [
          {
            uri: 'calc://history',
            mimeType: 'application/json',
            text: JSON.stringify(history, null, 2)
          }
        ]
      };
    }
  );

  server.registerResource(
    'calculation-by-id',
    new ResourceTemplate('calc://history/{id}', {
      list: async () => ({
        resources: history.map((record) => ({
          uri: `calc://history/${record.id}`,
          name: record.id,
          mimeType: 'application/json',
          description: toFormula(record)
        }))
      })
    }),
    {
      title: 'Single Calculation',
      description: 'Resolve one calculation from session history by ID.',
      mimeType: 'application/json'
    },
    async (uri, { id }): Promise<ReadResourceResult> => {
      const record = history.find((item) => item.id === id);
      if (!record) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: `Calculation '${id}' not found.` }, null, 2)
            }
          ]
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(record, null, 2)
          }
        ]
      };
    }
  );

  server.registerPrompt(
    'explain-calculation',
    {
      description: 'Generate a friendly explanation prompt for a specific formula.',
      argsSchema: z.object({
        formula: z.string().describe('For example: 8 * 4 = 32')
      })
    },
    async ({ formula }): Promise<GetPromptResult> => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Explain this calculation for a beginner and give one related practice question: ${formula}`
            }
          }
        ]
      };
    }
  );

  return {
    server,
    getHistory: () => [...history]
  };
};
