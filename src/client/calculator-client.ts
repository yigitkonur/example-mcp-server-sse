import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { 
  ListToolsResult, 
  ListResourcesResult, 
  ListPromptsResult,
  GetPromptResult
} from '@modelcontextprotocol/sdk/types.js';

export class CalculatorSSEClient {
  private client: Client;
  private transport: SSEClientTransport;
  private connected: boolean = false;

  constructor(
    private serverUrl: string,
    // @ts-expect-error - options is used in the constructor body
    private readonly options?: {
      name?: string;
      version?: string;
      authToken?: string;
    }
  ) {
    this.client = new Client(
      {
        name: options?.name || 'calculator-sse-client',
        version: options?.version || '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    const transportOptions: any = {};
    
    // Add auth token if provided
    if (options?.authToken) {
      transportOptions.requestInit = {
        headers: {
          Authorization: `Bearer ${options.authToken}`,
        },
      };
    }

    this.transport = new SSEClientTransport(new URL(serverUrl), transportOptions);
  }

  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Client is already connected');
    }

    console.log(`Connecting to SSE server at ${this.serverUrl}...`);
    await this.client.connect(this.transport);
    this.connected = true;
    console.log('Connected successfully!');
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    console.log('Disconnecting from server...');
    await this.client.close();
    this.connected = false;
    console.log('Disconnected successfully!');
  }

  async listTools(): Promise<ListToolsResult> {
    this.ensureConnected();
    return await this.client.listTools();
  }

  async listResources(): Promise<ListResourcesResult> {
    this.ensureConnected();
    return await this.client.listResources();
  }

  async listPrompts(): Promise<ListPromptsResult> {
    this.ensureConnected();
    return await this.client.listPrompts();
  }

  async calculate(
    operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt',
    input1: number,
    input2?: number,
    precision?: number
  ): Promise<{
    expression: string;
  }> {
    this.ensureConnected();

    const result = await this.client.callTool({
      name: 'calculate',
      arguments: {
        op: operation,
        a: input1,
        b: input2,
        precision,
      },
    });

    // Get the text content
    if (result.content && Array.isArray(result.content) && result.content.length > 0) {
      const textContent = result.content[0] as any;
      if (textContent && textContent.type === 'text') {
        return {
          expression: textContent.text,
        };
      }
    }

    throw new Error('Unexpected response format');
  }

  async getConstants(): Promise<Record<string, number>> {
    this.ensureConnected();

    const result = await this.client.readResource({
      uri: 'calculator://constants',
    });

    if (result.contents && result.contents.length > 0) {
      const firstContent = result.contents[0];
      if (firstContent && firstContent.text) {
        return JSON.parse(firstContent.text as string);
      }
    }

    throw new Error('No constants found');
  }

  async getHistory(limit: number | string = 10): Promise<any> {
    this.ensureConnected();

    const result = await this.client.readResource({
      uri: `calculator://history/${limit}`,
    });

    if (result.contents && result.contents.length > 0) {
      const firstContent = result.contents[0];
      if (firstContent && firstContent.text) {
        return JSON.parse(firstContent.text as string);
      }
    }

    throw new Error('No history found');
  }

  async getStatistics(): Promise<any> {
    this.ensureConnected();

    const result = await this.client.readResource({
      uri: 'calculator://stats',
    });

    if (result.contents && result.contents.length > 0) {
      const firstContent = result.contents[0];
      if (firstContent && firstContent.text) {
        return JSON.parse(firstContent.text as string);
      }
    }

    throw new Error('No statistics found');
  }

  async explainCalculation(
    expression: string,
    level: 'elementary' | 'intermediate' | 'advanced' = 'intermediate',
    includeSteps: boolean = true
  ): Promise<GetPromptResult> {
    this.ensureConnected();

    return await this.client.getPrompt({
      name: 'explain-calculation',
      arguments: {
        expression,
        level,
        includeSteps: includeSteps.toString(),
      },
    });
  }

  async generatePracticeProblems(
    topic: 'arithmetic' | 'algebra' | 'geometry' | 'mixed' = 'arithmetic',
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    count: number = 5
  ): Promise<GetPromptResult> {
    this.ensureConnected();

    return await this.client.getPrompt({
      name: 'generate-practice-problems',
      arguments: {
        topic,
        difficulty,
        count: count.toString(),
      },
    });
  }

  async getTutorial(
    focusArea: 'basic' | 'advanced' | 'tips' = 'basic'
  ): Promise<GetPromptResult> {
    this.ensureConnected();

    return await this.client.getPrompt({
      name: 'calculator-tutorial',
      arguments: {
        focusArea,
      },
    });
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Client is not connected. Call connect() first.');
    }
  }
}