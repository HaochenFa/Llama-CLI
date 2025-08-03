/**
 * Test helper utilities
 */

import { vi } from 'vitest';

// Time manipulation utilities
export const mockTime = (date: Date | string | number) => {
  const mockDate = new Date(date);
  vi.setSystemTime(mockDate);
  return mockDate;
};

export const restoreTime = () => {
  vi.useRealTimers();
};

// Environment variable utilities
export const mockEnv = (vars: Record<string, string>) => {
  const originalEnv = { ...process.env };
  Object.assign(process.env, vars);
  
  return () => {
    process.env = originalEnv;
  };
};

// Console capture utilities
export const captureConsole = () => {
  const logs: string[] = [];
  const warns: string[] = [];
  const errors: string[] = [];
  
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.log = vi.fn((...args) => {
    logs.push(args.join(' '));
  });
  
  console.warn = vi.fn((...args) => {
    warns.push(args.join(' '));
  });
  
  console.error = vi.fn((...args) => {
    errors.push(args.join(' '));
  });
  
  return {
    logs,
    warns,
    errors,
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
};

// Async testing utilities
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

export const waitForNextTick = (): Promise<void> => 
  new Promise(resolve => process.nextTick(resolve));

export const waitForTimeout = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Error testing utilities
export const expectToThrow = async (
  fn: () => Promise<any> | any,
  expectedError?: string | RegExp | Error
): Promise<Error> => {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else if (expectedError instanceof RegExp) {
        expect(error.message).toMatch(expectedError);
      } else if (expectedError instanceof Error) {
        expect(error.message).toBe(expectedError.message);
      }
    }
    return error as Error;
  }
};

// Mock function utilities
export const createMockFunction = <T extends (...args: any[]) => any>(
  implementation?: T
): vi.MockedFunction<T> => {
  return vi.fn(implementation) as vi.MockedFunction<T>;
};

export const createAsyncMockFunction = <T>(
  returnValue: T,
  delay = 0
): vi.MockedFunction<() => Promise<T>> => {
  return vi.fn(async () => {
    if (delay > 0) {
      await waitForTimeout(delay);
    }
    return returnValue;
  });
};

export const createRejectedMockFunction = (
  error: Error,
  delay = 0
): vi.MockedFunction<() => Promise<never>> => {
  return vi.fn(async () => {
    if (delay > 0) {
      await waitForTimeout(delay);
    }
    throw error;
  });
};

// Test data validation utilities
export const validateTestData = (data: any, schema: any): boolean => {
  // Simple schema validation for test data
  if (typeof schema === 'string') {
    return typeof data === schema;
  }
  
  if (Array.isArray(schema)) {
    return Array.isArray(data) && data.every(item => 
      schema.some(schemaItem => validateTestData(item, schemaItem))
    );
  }
  
  if (typeof schema === 'object' && schema !== null) {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    
    return Object.keys(schema).every(key => 
      key in data && validateTestData(data[key], schema[key])
    );
  }
  
  return data === schema;
};

// Performance testing utilities
export const measurePerformance = async <T>(
  fn: () => Promise<T> | T,
  iterations = 1
): Promise<{ result: T; averageTime: number; totalTime: number }> => {
  const times: number[] = [];
  let result: T;
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  
  return {
    result: result!,
    averageTime,
    totalTime,
  };
};

// Memory testing utilities
export const measureMemory = async <T>(
  fn: () => Promise<T> | T
): Promise<{ result: T; memoryUsed: number }> => {
  const initialMemory = process.memoryUsage().heapUsed;
  const result = await fn();
  const finalMemory = process.memoryUsage().heapUsed;
  
  return {
    result,
    memoryUsed: finalMemory - initialMemory,
  };
};

// Cleanup utilities
export const createCleanupStack = () => {
  const cleanupFunctions: (() => void | Promise<void>)[] = [];
  
  return {
    add: (fn: () => void | Promise<void>) => {
      cleanupFunctions.push(fn);
    },
    cleanup: async () => {
      for (const fn of cleanupFunctions.reverse()) {
        await fn();
      }
      cleanupFunctions.length = 0;
    },
  };
};
