import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

import {
  CallToolResultSchema,
  Client,
  ListToolsResultSchema,
  StreamableHTTPClientTransport
} from '@modelcontextprotocol/client';

const port = Number(process.env.SMOKE_PORT ?? 3211);
const serverUrl = new URL(`http://127.0.0.1:${port}/mcp`);

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep retrying while process boots.
    }
    await sleep(200);
  }

  throw new Error('Server did not become healthy in time.');
};

const child = spawn('node', ['dist/server.js', '--port', String(port)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1'
  }
});

const cleanup = () => {
  if (!child.killed) {
    child.kill('SIGTERM');
  }
};

process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

try {
  await waitForHealth();

  const client = new Client({ name: 'smoke-client', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(serverUrl);

  await client.connect(transport);

  const tools = await client.request(
    {
      method: 'tools/list',
      params: {}
    },
    ListToolsResultSchema
  );

  if (!tools.tools.some((tool) => tool.name === 'calculate')) {
    throw new Error('calculate tool not listed');
  }

  const result = await client.request(
    {
      method: 'tools/call',
      params: {
        name: 'calculate',
        arguments: {
          operation: 'add',
          left: 2,
          right: 3
        }
      }
    },
    CallToolResultSchema
  );

  const structured = result.structuredContent;
  const sum =
    typeof structured === 'object' && structured !== null && 'result' in structured
      ? structured.result
      : undefined;

  if (sum !== 5) {
    throw new Error(`Unexpected calculation result: ${JSON.stringify(result)}`);
  }

  await transport.terminateSession();
  await client.close();

  console.log('Smoke test passed.');
} finally {
  cleanup();
  await sleep(250);
}
