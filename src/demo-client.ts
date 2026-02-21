import {
  CallToolResultSchema,
  Client,
  ListToolsResultSchema,
  StreamableHTTPClientTransport
} from '@modelcontextprotocol/client';

const serverUrl = process.argv[2] ?? 'http://127.0.0.1:3000/mcp';

const run = async (): Promise<void> => {
  const client = new Client({ name: 'starter-demo-client', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));

  await client.connect(transport);

  const tools = await client.request(
    {
      method: 'tools/list',
      params: {}
    },
    ListToolsResultSchema
  );

  console.log('Tools:', tools.tools.map((tool) => tool.name).join(', '));

  const callResult = await client.request(
    {
      method: 'tools/call',
      params: {
        name: 'calculate',
        arguments: {
          operation: 'multiply',
          left: 7,
          right: 6
        }
      }
    },
    CallToolResultSchema
  );

  console.log('Tool response:', JSON.stringify(callResult.structuredContent ?? callResult.content, null, 2));

  await transport.terminateSession();
  await client.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
