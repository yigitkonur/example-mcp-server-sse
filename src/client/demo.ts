#!/usr/bin/env node
import { CalculatorSSEClient } from './calculator-client.js';

async function demonstrateCalculator() {
  const client = new CalculatorSSEClient('http://localhost:8082/connect');

  try {
    // Connect to the server
    console.log('🔌 Connecting to Calculator SSE Server...\n');
    await client.connect();

    // List available tools
    console.log('🔧 Available Tools:');
    const tools = await client.listTools();
    if (tools.tools) {
      tools.tools.forEach((tool) => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
    }
    console.log();

    // List available resources
    console.log('📚 Available Resources:');
    const resources = await client.listResources();
    if (resources.resources) {
      resources.resources.forEach((resource) => {
        console.log(`  - ${resource.uri}: ${resource.description}`);
      });
    }
    console.log();

    // List available prompts
    console.log('💬 Available Prompts:');
    const prompts = await client.listPrompts();
    if (prompts.prompts) {
      prompts.prompts.forEach((prompt) => {
        console.log(`  - ${prompt.name}: ${prompt.description}`);
      });
    }
    console.log();

    // Perform some calculations
    console.log('🧮 Performing Calculations:\n');

    // Addition
    console.log('1. Addition:');
    const addResult = await client.calculate('add', 25, 17);
    console.log(`   ${addResult.expression}\n`);

    // Multiplication
    console.log('2. Multiplication:');
    const multiplyResult = await client.calculate('multiply', 12, 7, 0);
    console.log(`   ${multiplyResult.expression}\n`);

    // Division with precision
    console.log('3. Division with precision:');
    const divideResult = await client.calculate('divide', 22, 7, 5);
    console.log(`   ${divideResult.expression}\n`);

    // Square root
    console.log('4. Square root:');
    const sqrtResult = await client.calculate('sqrt', 144);
    console.log(`   ${sqrtResult.expression}\n`);

    // Power
    console.log('5. Power:');
    const powerResult = await client.calculate('power', 2, 10);
    console.log(`   ${powerResult.expression}\n`);

    // Get mathematical constants
    console.log('📊 Mathematical Constants:');
    const constants = await client.getConstants();
    Object.entries(constants as Record<string, number>).forEach(([name, value]) => {
      console.log(`   ${name}: ${value}`);
    });
    console.log();

    // Get calculation history
    console.log('📜 Recent Calculation History:');
    const history = await client.getHistory(5);
    const historyData = history as any;
    console.log(`   Total calculations: ${historyData.totalCount}`);
    console.log(`   Showing last ${historyData.count} calculations:`);
    if (historyData.calculations) {
      historyData.calculations.forEach((calc: any, index: number) => {
        console.log(`   ${index + 1}. ${calc.expression} (${new Date(calc.timestamp).toLocaleTimeString()})`);
      });
    }
    console.log();

    // Get statistics
    console.log('📈 Usage Statistics:');
    const stats = await client.getStatistics();
    const statsData = stats as any;
    console.log(`   Total calculations: ${statsData.totalCalculations}`);
    if (statsData.operationCounts) {
      console.log('   Operations used:');
      Object.entries(statsData.operationCounts).forEach(([op, count]) => {
        console.log(`     - ${op}: ${count}`);
      });
    }
    console.log();

    // Use prompts
    console.log('💡 Using Prompts:\n');

    // Get explanation for a calculation
    console.log('1. Explaining a calculation:');
    const explanation = await client.explainCalculation('2^10', 'intermediate', true);
    console.log('   Prompt generated for LLM:');
    const explanationMessage = (explanation as any).messages[0].content.text as string;
    console.log(`   "${explanationMessage.substring(0, 100)}..."\n`);

    // Generate practice problems
    console.log('2. Generating practice problems:');
    const problems = await client.generatePracticeProblems('arithmetic', 'medium', 3);
    console.log('   Prompt generated for LLM:');
    const problemsMessage = (problems as any).messages[0].content.text as string;
    console.log(`   "${problemsMessage.substring(0, 100)}..."\n`);

    // Get a tutorial
    console.log('3. Getting a tutorial:');
    const tutorial = await client.getTutorial('basic');
    console.log('   Prompt generated for LLM:');
    const tutorialMessage = (tutorial as any).messages[0].content.text as string;
    console.log(`   "${tutorialMessage.substring(0, 100)}..."\n`);

    // Error handling demonstration
    console.log('⚠️  Error Handling:\n');
    try {
      console.log('Attempting division by zero...');
      await client.calculate('divide', 10, 0);
    } catch (error) {
      console.log(`   Error caught: ${(error as Error).message}\n`);
    }

    try {
      console.log('Attempting square root of negative number...');
      await client.calculate('sqrt', -16);
    } catch (error) {
      console.log(`   Error caught: ${(error as Error).message}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect
    console.log('👋 Disconnecting...');
    await client.disconnect();
    console.log('✅ Demo completed!');
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateCalculator().catch(console.error);
}

export { demonstrateCalculator };