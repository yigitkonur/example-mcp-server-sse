import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import {
  CallToolResultSchema,
  Client,
  ListToolsResultSchema,
  StreamableHTTPClientTransport
} from '@modelcontextprotocol/client';

const port = Number(process.env.SMOKE_PORT ?? 3213);
const url = new URL(`http://127.0.0.1:${port}/mcp`);

const child = spawn('node', ['dist/index.js'], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
  stdio: 'inherit'
});

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await sleep(200);
  }
  throw new Error('Server did not become healthy');
};

try {
  await waitForHealth();

  const client = new Client({ name: 'template-smoke-client', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(url);
  await client.connect(transport);

  const tools = await client.request({ method: 'tools/list', params: {} }, ListToolsResultSchema);
  if (!tools.tools.some((tool) => tool.name === 'echo')) {
    throw new Error('echo tool not found');
  }

  const result = await client.request(
    {
      method: 'tools/call',
      params: {
        name: 'echo',
        arguments: { text: 'hello' }
      }
    },
    CallToolResultSchema
  );

  const echoed =
    typeof result.structuredContent === 'object' &&
    result.structuredContent !== null &&
    'echoed' in result.structuredContent
      ? result.structuredContent.echoed
      : undefined;

  if (echoed !== 'hello') {
    throw new Error(`Unexpected echo result: ${JSON.stringify(result)}`);
  }

  await transport.terminateSession();
  await client.close();
  console.log('Template smoke test passed.');
} finally {
  child.kill('SIGTERM');
  await sleep(250);
}
