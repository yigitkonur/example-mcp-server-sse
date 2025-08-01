#!/usr/bin/env node
import express, { Request, Response } from 'express';
import cors from 'cors';
import { SSEServerTransport, SSEServerTransportOptions } from '@modelcontextprotocol/sdk/server/sse.js';
import { createCalculatorServer } from './calculator-server.js';

// Session management - critical for SSE transport
const transports: Record<string, SSEServerTransport> = {};

// Parse command line arguments
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const portArg = portIndex !== -1 ? args[portIndex + 1] : undefined;
const cliPort = portArg ? parseInt(portArg, 10) : undefined;

// Server configuration
const PORT = cliPort || process.env['PORT'] || 1923;
const HOST = process.env['HOST'] || 'localhost';
const CORS_ORIGIN = process.env['CORS_ORIGIN'] || '*';

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

// Only parse JSON for non-SSE endpoints
app.use((req: Request, res: Response, next: express.NextFunction) => {
  if (req.path === '/messages') {
    // Skip JSON parsing for SSE message endpoint
    return next();
  }
  return express.json()(req, res, next);
});

// Logging middleware
app.use((req: Request, _res: Response, next: express.NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// SSE endpoint - classic two-endpoint pattern
app.get('/connect', async (_req: Request, res: Response) => {
  console.log('[SSE] New connection request');
  
  try {
    // Security options from SDK best practices
    const transportOptions: SSEServerTransportOptions = {
      enableDnsRebindingProtection: process.env['NODE_ENV'] === 'production',
    };
    
    if (process.env['NODE_ENV'] === 'production') {
      transportOptions.allowedHosts = [`${HOST}:${PORT}`];
      transportOptions.allowedOrigins = [CORS_ORIGIN];
    }

    // Create SSE transport with endpoint configuration
    const transport = new SSEServerTransport('/messages', res, transportOptions);
    
    // Get the session ID from transport
    const sessionId = transport.sessionId;
    console.log(`[SSE] Session created: ${sessionId}`);
    
    // Store transport in global map
    transports[sessionId] = transport;

    // Critical: Set up cleanup handler
    transport.onclose = () => {
      console.log(`[SSE] Session closed: ${sessionId}`);
      delete transports[sessionId];
    };

    // Handle errors
    transport.onerror = (error) => {
      console.error(`[SSE] Transport error for session ${sessionId}:`, error);
    };

    // Create new server instance per connection (isolation)
    const server = createCalculatorServer();
    await server.connect(transport);
    
    console.log(`[SSE] Calculator server connected for session: ${sessionId}`);

  } catch (error) {
    console.error('[SSE] Error establishing SSE stream:', error);
    if (!res.headersSent) {
      res.status(500).send('Error establishing SSE stream');
    }
  }
});

// Message handling endpoint - follows SDK pattern
app.post('/messages', async (req: Request, res: Response): Promise<any> => {
  const sessionId = req.query['sessionId'] as string;
  
  console.log(`[Messages] Received POST for session: ${sessionId}`);

  if (!sessionId) {
    console.error('[Messages] Missing sessionId parameter');
    return res.status(400).send('Missing sessionId parameter');
  }

  const transport = transports[sessionId];
  if (!transport) {
    console.error(`[Messages] Session not found: ${sessionId}`);
    return res.status(404).send('Session not found');
  }

  try {
    // SDK's handlePostMessage handles all the complexity
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error(`[Messages] Error handling request for session ${sessionId}:`, error);
    if (!res.headersSent) {
      return res.status(500).send('Error handling request');
    }
    return;
  }
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const sessionCount = Object.keys(transports).length;
  res.json({
    status: 'healthy',
    activeSessions: sessionCount,
    transport: 'sse',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Calculator SSE MCP Server',
    version: '1.0.0',
    transport: 'sse',
    endpoints: {
      connect: '/connect',
      messages: '/messages',
      health: '/health',
    },
    instructions: 'Connect to /connect endpoint to establish SSE connection',
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Calculator SSE MCP Server Started               ║
╠═══════════════════════════════════════════════════════════╣
║  Transport: SSE (Server-Sent Events)                      ║
║  Port: ${PORT}                                              ║
║  SSE Endpoint: http://${HOST}:${PORT}/connect                ║
║  Health: http://${HOST}:${PORT}/health                       ║
║                                                           ║
║  Features:                                                ║
║  - Universal calculator tool with 6 operations            ║
║  - Mathematical constants resource                        ║
║  - Calculation history with dynamic limits                ║
║  - Usage statistics resource                              ║
║  - Explain calculation prompt                             ║
║  - Practice problem generator                             ║
║  - Interactive tutorial prompt                            ║
╚═══════════════════════════════════════════════════════════╝

To test with MCP Inspector:
npx @modelcontextprotocol/inspector --cli http://localhost:${PORT}/connect --transport sse

Or use the SDK client:
npm run client
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  
  // Close all active transports
  const sessionIds = Object.keys(transports);
  console.log(`[Server] Closing ${sessionIds.length} active sessions...`);
  
  for (const sessionId of sessionIds) {
    try {
      console.log(`[Server] Closing session ${sessionId}`);
      const transport = transports[sessionId];
      if (transport) {
        await transport.close();
        delete transports[sessionId];
      }
    } catch (error) {
      console.error(`[Server] Error closing session ${sessionId}:`, error);
    }
  }
  
  // Close HTTP server
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
});