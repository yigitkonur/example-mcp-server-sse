import type { EventStore, JSONRPCMessage } from '@modelcontextprotocol/server';

interface StoredEvent {
  streamId: string;
  message: JSONRPCMessage;
  createdAtMs: number;
}

export class InMemoryEventStore implements EventStore {
  private readonly events = new Map<string, StoredEvent>();

  async storeEvent(streamId: string, message: JSONRPCMessage): Promise<string> {
    const eventId = `${streamId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    this.events.set(eventId, {
      streamId,
      message,
      createdAtMs: Date.now()
    });
    return eventId;
  }

  async replayEventsAfter(
    lastEventId: string,
    { send }: { send: (eventId: string, message: JSONRPCMessage) => Promise<void> }
  ): Promise<string> {
    const lastEvent = this.events.get(lastEventId);
    if (!lastEvent) {
      return '';
    }

    const ordered = [...this.events.entries()].sort((a, b) => a[1].createdAtMs - b[1].createdAtMs);

    let found = false;
    for (const [eventId, event] of ordered) {
      if (event.streamId !== lastEvent.streamId) {
        continue;
      }

      if (eventId === lastEventId) {
        found = true;
        continue;
      }

      if (found) {
        await send(eventId, event.message);
      }
    }

    return lastEvent.streamId;
  }
}
