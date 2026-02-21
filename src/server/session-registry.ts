import { randomUUID } from 'node:crypto';

import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';

import { createExampleMcpServer } from './create-mcp-server.js';
import { InMemoryEventStore } from './in-memory-event-store.js';

export interface SessionMetadata {
  sessionId: string;
  createdAt: string;
  historyLength: number;
}

interface SessionState {
  sessionId: string;
  createdAt: string;
  transport: NodeStreamableHTTPServerTransport;
  closeServer: () => Promise<void>;
  getHistoryLength: () => number;
}

export class SessionRegistry {
  private readonly sessions = new Map<string, SessionState>();

  get(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  list(): SessionMetadata[] {
    return [...this.sessions.values()].map((state) => ({
      sessionId: state.sessionId,
      createdAt: state.createdAt,
      historyLength: state.getHistoryLength()
    }));
  }

  count(): number {
    return this.sessions.size;
  }

  async createSessionTransport(): Promise<NodeStreamableHTTPServerTransport> {
    const eventStore = new InMemoryEventStore();
    const { server, getHistory } = createExampleMcpServer();

    let transport: NodeStreamableHTTPServerTransport;

    transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      eventStore,
      onsessioninitialized: (sessionId) => {
        this.sessions.set(sessionId, {
          sessionId,
          createdAt: new Date().toISOString(),
          transport,
          closeServer: async () => server.close(),
          getHistoryLength: () => getHistory().length
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

    transport.onerror = (error) => {
      console.error('[transport] error:', error);
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
