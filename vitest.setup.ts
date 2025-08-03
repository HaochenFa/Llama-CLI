/**
 * Vitest setup file
 * Provides global test configuration and utilities
 */

import { vi, beforeEach, afterEach } from "vitest";

// Setup testing library for React components (if available)
try {
  const { configure } = await import("@testing-library/react");
  configure({ testIdAttribute: "data-testid" });
} catch {
  // @testing-library/react not available, skip
}

// Setup jest-dom matchers (if available)
try {
  await import("@testing-library/jest-dom/vitest");
} catch {
  // @testing-library/jest-dom not available, skip
}

// Mock fetch globally for tests
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

// Test lifecycle hooks
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Global test utilities
declare global {
  var testUtils: {
    mockFetch: typeof vi.fn;
    restoreConsole: () => void;
    createMockResponse: (data: any, status?: number) => Response;
  };
}

globalThis.testUtils = {
  mockFetch: vi.fn(),
  restoreConsole: () => {
    Object.assign(console, originalConsole);
  },
  createMockResponse: (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  },
};
