// tests/basic.test.ts
// Basic tests to verify the testing infrastructure works

import { describe, it, expect } from '@jest/globals';

describe('Basic Test Suite', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should work with objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toEqual({ name: 'test', value: 42 });
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });
});

describe('String Operations', () => {
  it('should handle string manipulation', () => {
    const str = 'Hello, World!';
    expect(str.toLowerCase()).toBe('hello, world!');
    expect(str.includes('World')).toBe(true);
  });

  it('should handle regex patterns', () => {
    const pattern = /^@([^\s]+)/;
    const input = '@src/main.ts';
    const match = input.match(pattern);
    
    expect(match).toBeTruthy();
    expect(match?.[1]).toBe('src/main.ts');
  });
});

describe('Error Handling', () => {
  it('should catch thrown errors', () => {
    expect(() => {
      throw new Error('Test error');
    }).toThrow('Test error');
  });

  it('should handle async errors', async () => {
    await expect(async () => {
      throw new Error('Async error');
    }).rejects.toThrow('Async error');
  });
});
