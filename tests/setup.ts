// tests/setup.ts
// Global test setup and configuration

// Mock console methods to reduce noise in tests
const originalConsole = global.console;

beforeEach(() => {
  // Mock console methods to avoid cluttering test output
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as any;
});

afterEach(() => {
  // Restore console after each test
  global.console = originalConsole;
});

// Global test utilities
export const mockLLMResponse = (responses: string[]) => {
  let responseIndex = 0;
  return {
    async* chatStream() {
      for (const response of responses) {
        yield response;
      }
    },
    async testConnection() {
      return { success: true, models: ['test-model'] };
    }
  };
};

export const createMockProfile = (overrides = {}) => ({
  name: 'test-profile',
  type: 'ollama' as const,
  endpoint: 'http://localhost:11434',
  ...overrides
});

export const createMockContext = (overrides = {}) => ({
  long_term_memory: [],
  available_tools: [],
  file_context: [],
  chat_history: [],
  current_working_directory: '/test',
  ...overrides
});
