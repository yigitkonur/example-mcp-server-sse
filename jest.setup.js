// Jest setup file for SSE server tests
const fetch = (() => {
  try {
    return require('node-fetch').default || require('node-fetch');
  } catch {
    return global.fetch;
  }
})();
const EventSource = require('eventsource');

// Set test timeout
jest.setTimeout(10000);

// Polyfill for EventSource and fetch in Node.js test environment
global.EventSource = EventSource;
global.fetch = fetch;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};