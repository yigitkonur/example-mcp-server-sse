import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { isInitializeRequest } from '@modelcontextprotocol/server';

import type { SessionRegistry } from './session-registry.js';

const sessionIdFromRequest = (req: IncomingMessage): string | undefined => {
  const raw = req.headers['mcp-session-id'];
  return Array.isArray(raw) ? raw[0] : raw;
};

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  return text.length === 0 ? {} : JSON.parse(text);
};

const sendJson = (res: ServerResponse, statusCode: number, body: unknown): void => {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

const sendError = (res: ServerResponse, statusCode: number, message: string): void => {
  sendJson(res, statusCode, {
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message
    },
    id: null
  });
};

export const createHttpServer = (registry: SessionRegistry) => {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');

      if (url.pathname === '/health') {
        sendJson(res, 200, { ok: true, activeSessions: registry.count() });
        return;
      }

      if (url.pathname !== '/mcp') {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }

      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const sessionId = sessionIdFromRequest(req);

        if (sessionId) {
          const state = registry.get(sessionId);
          if (!state) {
            sendError(res, 404, `Session '${sessionId}' not found.`);
            return;
          }
          await state.transport.handleRequest(req, res, body);
          return;
        }

        if (!isInitializeRequest(body)) {
          sendError(res, 400, 'Expected initialize request for new session.');
          return;
        }

        const transport = await registry.createTransport();
        await transport.handleRequest(req, res, body);
        return;
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        const sessionId = sessionIdFromRequest(req);
        if (!sessionId) {
          sendError(res, 400, 'Missing mcp-session-id header.');
          return;
        }

        const state = registry.get(sessionId);
        if (!state) {
          sendError(res, 404, `Session '${sessionId}' not found.`);
          return;
        }

        await state.transport.handleRequest(req, res);
        return;
      }

      res.statusCode = 405;
      res.setHeader('allow', 'GET,POST,DELETE');
      res.end();
    } catch (error) {
      console.error(error);
      sendError(res, 500, 'Internal server error');
    }
  });
};
