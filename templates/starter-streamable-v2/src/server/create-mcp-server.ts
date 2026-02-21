import type { CallToolResult } from '@modelcontextprotocol/server';
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

export const createMcpServer = (): McpServer => {
  const server = new McpServer(
    {
      name: '__PROJECT_NAME__',
      version: '0.1.0'
    },
    {
      capabilities: { logging: {} }
    }
  );

  server.registerTool(
    'echo',
    {
      description: 'Echo text back to the caller.',
      inputSchema: z.object({
        text: z.string()
      }),
      outputSchema: z.object({
        echoed: z.string()
      })
    },
    async ({ text }, ctx): Promise<CallToolResult> => {
      await ctx.mcpReq.log('info', `Echoed: ${text}`);
      return {
        content: [{ type: 'text', text }],
        structuredContent: { echoed: text }
      };
    }
  );

  return server;
};
