import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { isInitializeRequest } from '@modelcontextprotocol/server';

import type { SessionRegistry } from './session-registry.js';

interface JsonRpcErrorBody {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
  };
  id: null;
}

const sendJson = (res: ServerResponse, statusCode: number, body: unknown): void => {
  if (res.headersSent) {
    return;
  }

  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

const sendJsonRpcError = (res: ServerResponse, statusCode: number, code: number, message: string): void => {
  const body: JsonRpcErrorBody = {
    jsonrpc: '2.0',
    error: { code, message },
    id: null
  };

  sendJson(res, statusCode, body);
};

const getSessionId = (req: IncomingMessage): string | undefined => {
  const raw = req.headers['mcp-session-id'];
  return Array.isArray(raw) ? raw[0] : raw;
};

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (text.length === 0) {
    return {};
  }

  return JSON.parse(text);
};

const handleMcpRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  registry: SessionRegistry
): Promise<void> => {
  const method = req.method ?? 'GET';

  if (method === 'POST') {
    let parsedBody: unknown;
    try {
      parsedBody = await readJsonBody(req);
    } catch {
      sendJsonRpcError(res, 400, -32_700, 'Invalid JSON body');
      return;
    }

    const sessionId = getSessionId(req);
    if (sessionId) {
      const state = registry.get(sessionId);
      if (!state) {
        sendJsonRpcError(res, 404, -32_000, `Session '${sessionId}' was not found.`);
        return;
      }

      await state.transport.handleRequest(req, res, parsedBody);
      return;
    }

    if (!isInitializeRequest(parsedBody)) {
      sendJsonRpcError(res, 400, -32_600, 'Initialization request requires no session ID.');
      return;
    }

    const transport = await registry.createSessionTransport();
    await transport.handleRequest(req, res, parsedBody);
    return;
  }

  if (method === 'GET' || method === 'DELETE') {
    const sessionId = getSessionId(req);
    if (!sessionId) {
      sendJsonRpcError(res, 400, -32_000, 'Missing mcp-session-id header.');
      return;
    }

    const state = registry.get(sessionId);
    if (!state) {
      sendJsonRpcError(res, 404, -32_000, `Session '${sessionId}' was not found.`);
      return;
    }

    await state.transport.handleRequest(req, res);
    return;
  }

  res.statusCode = 405;
  res.setHeader('allow', 'GET, POST, DELETE');
  res.end();
};

export const createMcpHttpServer = (registry: SessionRegistry) => {
  return createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1');

      if (requestUrl.pathname === '/health') {
        sendJson(res, 200, {
          ok: true,
          activeSessions: registry.count(),
          sessions: registry.list()
        });
        return;
      }

      if (requestUrl.pathname === '/') {
        sendJson(res, 200, {
          name: 'example-mcp-server-streamable-http-v2-starter',
          transport: 'Streamable HTTP with notification streaming',
          endpoint: '/mcp',
          health: '/health'
        });
        return;
      }

      if (requestUrl.pathname !== '/mcp') {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }

      await handleMcpRequest(req, res, registry);
    } catch (error) {
      console.error('[http] request failure:', error);
      sendJsonRpcError(res, 500, -32_603, 'Internal server error');
    }
  });
};
