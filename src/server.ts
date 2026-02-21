import process from 'node:process';

import { createMcpHttpServer } from './server/http-server.js';
import { SessionRegistry } from './server/session-registry.js';

const parsePort = (): number => {
  const envPort = process.env.PORT;
  if (envPort) {
    const parsed = Number.parseInt(envPort, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const portArgIndex = process.argv.findIndex((arg) => arg === '--port');
  if (portArgIndex >= 0) {
    const argPort = process.argv[portArgIndex + 1];
    if (argPort) {
      const parsed = Number.parseInt(argPort, 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return 3000;
};

const port = parsePort();
const host = process.env.HOST ?? '127.0.0.1';

const registry = new SessionRegistry();
const httpServer = createMcpHttpServer(registry);

httpServer.listen(port, host, () => {
  console.log(`MCP Streamable HTTP server listening at http://${host}:${port}/mcp`);
  console.log(`Health endpoint: http://${host}:${port}/health`);
});

const gracefulShutdown = async (signal: string): Promise<void> => {
  console.warn(`Received ${signal}, shutting down...`);

  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });

  await registry.closeAll();
  process.exit(0);
};

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
