/**
 * Test utilities - unified exports
 */

// Re-export all test utilities
export * from './factories.js';
export * from './mock-adapters.js';
export * from './mock-filesystem.js';
export * from './msw-handlers.js';
export * from './test-helpers.js';

// Common test setup function
export const setupTestEnvironment = () => {
  // This function can be called in test setup to initialize common mocks
  console.log('Setting up test environment...');
};

// Common test teardown function
export const teardownTestEnvironment = () => {
  // This function can be called in test teardown to clean up
  console.log('Tearing down test environment...');
};
