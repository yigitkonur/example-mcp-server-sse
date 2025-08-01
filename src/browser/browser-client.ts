/**
 * Browser-compatible SSE Calculator Client
 * This client can be used in browsers without the MCP SDK
 */
export class BrowserSSECalculatorClient {
  private eventSource: EventSource | undefined;
  private endpoint: string | undefined;
  private sessionId: string | undefined;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: any;
  }>();
  private requestId = 0;
  private connected = false;

  constructor(private baseUrl: string) {}

  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Already connected');
    }

    return new Promise((resolve, reject) => {
      console.log(`Connecting to ${this.baseUrl}...`);
      this.eventSource = new EventSource(this.baseUrl);

      // Set up timeout for connection
      const connectionTimeout = setTimeout(() => {
        this.eventSource?.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      // Critical: Wait for endpoint event
      this.eventSource.addEventListener('endpoint', (event) => {
        clearTimeout(connectionTimeout);
        
        // Extract endpoint URL from event data
        const messageEvent = event as MessageEvent;
        this.endpoint = new URL(messageEvent.data, this.baseUrl).href;
        
        // Extract sessionId from endpoint URL
        const url = new URL(this.endpoint);
        const sessionIdParam = url.searchParams.get('sessionId');
        this.sessionId = sessionIdParam === null ? undefined : sessionIdParam;
        
        console.log(`Connected with session ID: ${this.sessionId}`);
        this.connected = true;
        resolve();
      });

      // Handle standard messages
      this.eventSource.addEventListener('message', (event) => {
        try {
          const messageEvent = event as MessageEvent;
          const message = JSON.parse(messageEvent.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      // Handle errors
      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        
        // If not connected yet, reject the connection promise
        if (!this.connected) {
          clearTimeout(connectionTimeout);
          reject(new Error('Failed to establish SSE connection'));
        }
        
        // EventSource will automatically reconnect
      };

      // Handle other event types
      this.eventSource.addEventListener('notification', (event) => {
        const messageEvent = event as MessageEvent;
        console.log('Notification:', JSON.parse(messageEvent.data));
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    console.log('Disconnecting...');
    
    // Cancel all pending requests
    for (const [_id, handler] of this.pendingRequests) {
      clearTimeout(handler.timeout);
      handler.reject(new Error('Client disconnected'));
    }
    this.pendingRequests.clear();

    // Close EventSource
    this.eventSource?.close();
    this.eventSource = undefined;
    this.endpoint = undefined;
    this.sessionId = undefined;
    this.connected = false;
    
    console.log('Disconnected');
  }

  async request(method: string, params?: any): Promise<any> {
    if (!this.connected || !this.endpoint) {
      throw new Error('Not connected');
    }

    const id = String(++this.requestId);
    
    // Create promise for the response
    const responsePromise = new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for method: ${method}`));
      }, 30000); // 30 second timeout

      this.pendingRequests.set(id, { resolve, reject, timeout });
    });

    // Send the request
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id,
        }),
      });

      if (!response.ok) {
        this.pendingRequests.delete(id);
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      // Wait for the actual response via SSE
      return await responsePromise;
    } catch (error) {
      // Clean up on error
      const handler = this.pendingRequests.get(id);
      if (handler) {
        clearTimeout(handler.timeout);
        this.pendingRequests.delete(id);
      }
      throw error;
    }
  }

  // Tool methods
  async listTools() {
    return this.request('tools/list');
  }

  async callTool(name: string, args: any) {
    return this.request('tools/call', { name, arguments: args });
  }

  async calculate(
    operation: string,
    input1: number,
    input2?: number,
    precision?: number
  ) {
    const result = await this.callTool('calculate', {
      operation,
      input_1: input1,
      input_2: input2,
      precision,
    });

    // Extract structured content if available
    if (result.structuredContent) {
      return result.structuredContent;
    }

    // Fallback to text content
    return {
      expression: result.content?.[0]?.text || '',
      result: 0,
      formatted: '',
    };
  }

  // Resource methods
  async listResources() {
    return this.request('resources/list');
  }

  async readResource(uri: string) {
    const result = await this.request('resources/read', { uri });
    if (result.contents?.[0]?.text) {
      try {
        return JSON.parse(result.contents[0].text);
      } catch {
        return result.contents[0].text;
      }
    }
    return null;
  }

  async getConstants() {
    return this.readResource('calculator://constants');
  }

  async getHistory(limit: number | 'all' = 10) {
    return this.readResource(`calculator://history/${limit}`);
  }

  async getStatistics() {
    return this.readResource('calculator://stats');
  }

  // Prompt methods
  async listPrompts() {
    return this.request('prompts/list');
  }

  async getPrompt(name: string, args: any) {
    return this.request('prompts/get', { name, arguments: args });
  }

  async explainCalculation(
    expression: string,
    level = 'intermediate',
    includeSteps = true
  ) {
    return this.getPrompt('explain-calculation', {
      expression,
      level,
      includeSteps,
    });
  }

  async generatePracticeProblems(
    topic = 'arithmetic',
    difficulty = 'medium',
    count = 5
  ) {
    return this.getPrompt('generate-practice-problems', {
      topic,
      difficulty,
      count,
    });
  }

  // Private methods
  private handleMessage(message: any) {
    // Handle responses to our requests
    if ('id' in message && this.pendingRequests.has(message.id)) {
      const handler = this.pendingRequests.get(message.id)!;
      clearTimeout(handler.timeout);
      this.pendingRequests.delete(message.id);

      if ('error' in message) {
        handler.reject(new Error(message.error.message || 'Unknown error'));
      } else {
        handler.resolve(message.result);
      }
    } else if ('method' in message) {
      // Handle notifications
      console.log('Notification:', message);
    }
  }
}

// Export for use in browser
declare const window: any;
if (typeof window !== 'undefined') {
  window.BrowserSSECalculatorClient = BrowserSSECalculatorClient;
}