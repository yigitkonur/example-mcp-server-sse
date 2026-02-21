import { randomUUID } from 'node:crypto';

import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';

import { createMcpServer } from './create-mcp-server.js';
import { InMemoryEventStore } from './in-memory-event-store.js';

interface SessionState {
  transport: NodeStreamableHTTPServerTransport;
  closeServer: () => Promise<void>;
}

export class SessionRegistry {
  private readonly sessions = new Map<string, SessionState>();

  get(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  count(): number {
    return this.sessions.size;
  }

  async createTransport(): Promise<NodeStreamableHTTPServerTransport> {
    const server = createMcpServer();

    let transport: NodeStreamableHTTPServerTransport;
    transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      eventStore: new InMemoryEventStore(),
      onsessioninitialized: (sessionId) => {
        this.sessions.set(sessionId, {
          transport,
          closeServer: async () => server.close()
        });
      },
      onsessionclosed: async (sessionId) => {
        await this.closeSession(sessionId);
      }
    });

    transport.onclose = () => {
      const sessionId = transport.sessionId;
      if (sessionId) {
        void this.closeSession(sessionId);
      }
    };

    await server.connect(transport);
    return transport;
  }

  async closeSession(sessionId: string): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state) {
      return;
    }

    this.sessions.delete(sessionId);
    await Promise.allSettled([state.transport.close(), state.closeServer()]);
  }

  async closeAll(): Promise<void> {
    await Promise.allSettled([...this.sessions.keys()].map((sessionId) => this.closeSession(sessionId)));
  }
}
