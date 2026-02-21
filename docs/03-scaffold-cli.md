# scaffold cli

generate, run, and extend new MCP Streamable HTTP projects from the built-in template.

## cli command reference

the scaffold CLI has two equivalent entry points:

- `create-mcp-streamable-starter` (primary)
- `create-mcp-sse-starter` (compatibility alias)

both resolve to `src/cli/create-mcp-streamable-starter.ts` (or `dist/cli/create-mcp-streamable-starter.js` after build).

### via npm script (recommended during development)

```bash
npm run create -- --name my-server --target ./my-server
```

### via npx (after `npm run build`)

```bash
npx create-mcp-streamable-starter --name my-server --target ./my-server
```

### options

| option          | positional | default                        | description                              |
|-----------------|------------|--------------------------------|------------------------------------------|
| `--name`        | first arg  | `mcp-streamable-starter`       | project name (kebab-cased automatically) |
| `--target`      | --         | same as name                   | output directory path                    |
| `--description` | --         | auto-generated from name       | package.json description                 |

the name is normalized: lowercased, non-alphanumeric characters replaced with hyphens, duplicates collapsed.

the target directory must either not exist or be completely empty. the CLI will error if the directory contains any files.

## generated project structure

```
my-server/
  src/
    index.ts                           entry point (equivalent to root src/server.ts)
    server/
      create-mcp-server.ts             MCP primitive registrations (echo tool)
      session-registry.ts              session/transport lifecycle
      http-server.ts                   HTTP routing
      in-memory-event-store.ts         event replay store
  scripts/
    smoke.mjs                          smoke test for the generated project
  docs/
    README.md                          generated project docs hub
    LEARNING_PATH.md                   learning guide
  vendor/
    modelcontextprotocol-server-2.0.0-alpha.0.tgz
    modelcontextprotocol-client-2.0.0-alpha.0.tgz
    modelcontextprotocol-node-2.0.0-alpha.0.tgz
  package.json
  tsconfig.json
  README.md
  .gitignore
```

the generated project starts with an `echo` tool instead of the root project's `calculate` tool. this is intentional -- it provides a simpler starting point for building your own tools.

## run the generated project

```bash
cd my-server
npm install
npm run dev
```

the server starts at `http://127.0.0.1:3000/mcp` by default.

## validate the generated project

```bash
npm run build
npm run typecheck
npm run smoke
```

the smoke test (`scripts/smoke.mjs`) boots the compiled server, connects a client, calls the `echo` tool, verifies the result, and terminates the session.

## extension workflow

to build your own MCP server on top of the generated project:

### 1. add tools

edit `src/server/create-mcp-server.ts`. use `server.registerTool()` with Zod v4 schemas:

```typescript
import * as z from 'zod/v4';

server.registerTool(
  'my-tool',
  {
    description: 'does something useful',
    inputSchema: z.object({
      input: z.string()
    })
  },
  async ({ input }): Promise<CallToolResult> => {
    return {
      content: [{ type: 'text', text: `processed: ${input}` }]
    };
  }
);
```

### 2. add resources

use `server.registerResource()` for static URIs or `ResourceTemplate` for parameterized URIs:

```typescript
import { ResourceTemplate } from '@modelcontextprotocol/server';

server.registerResource(
  'my-resource',
  new ResourceTemplate('myapp://items/{id}', {
    list: async () => ({
      resources: items.map(item => ({
        uri: `myapp://items/${item.id}`,
        name: item.name,
        mimeType: 'application/json'
      }))
    })
  }),
  { description: 'a single item by ID', mimeType: 'application/json' },
  async (uri, { id }): Promise<ReadResourceResult> => {
    // resolve and return
  }
);
```

### 3. add prompts

use `server.registerPrompt()` with Zod v4 argument schemas:

```typescript
server.registerPrompt(
  'my-prompt',
  {
    description: 'generates a helpful prompt',
    argsSchema: z.object({ topic: z.string() })
  },
  async ({ topic }): Promise<GetPromptResult> => {
    return {
      messages: [{
        role: 'user',
        content: { type: 'text', text: `explain ${topic} simply` }
      }]
    };
  }
);
```

### 4. keep boundaries clean

- all domain logic (tools, resources, prompts) stays in `create-mcp-server.ts`
- session and transport lifecycle stays in `session-registry.ts`
- HTTP routing stays in `http-server.ts`
- replace `InMemoryEventStore` with a persistent implementation for production

## next steps

- [04-sdk-v2-notes.md](04-sdk-v2-notes.md) -- understand the v2 SDK packages and migration patterns
- [02-architecture.md](02-architecture.md) -- deeper look at how these modules fit together
- [05-validation.md](05-validation.md) -- full validation workflows
