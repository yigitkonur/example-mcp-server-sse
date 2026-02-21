import process from 'node:process';

import { createHttpServer } from './server/http-server.js';
import { SessionRegistry } from './server/session-registry.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '127.0.0.1';

const registry = new SessionRegistry();
const server = createHttpServer(registry);

server.listen(port, host, () => {
  console.log(`__PROJECT_NAME__ listening on http://${host}:${port}/mcp`);
});

const shutdown = async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await registry.closeAll();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
