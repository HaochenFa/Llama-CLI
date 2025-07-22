/**
 * CLI integration tests
 */

import { describe, it, expect } from 'vitest';
import { Logger, LogLevel } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { getErrorMessage, getErrorStack } from '../utils/error-utils.js';

describe('CLI Integration Tests', () => {
  describe('Logger', () => {
    it('should create logger with default level', () => {
      const logger = new Logger();
      
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should set log level from string', () => {
      const logger = new Logger();
      
      logger.setLevel('debug');
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
      
      logger.setLevel('error');
      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });

    it('should set log level from enum', () => {
      const logger = new Logger();
      
      logger.setLevel(LogLevel.WARN);
      expect(logger.getLevel()).toBe(LogLevel.WARN);
    });
  });

  describe('Error Handler', () => {
    it('should create error handler', () => {
      const errorHandler = new ErrorHandler();
      
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler.handle).toBe('function');
    });

    it('should create error handler with logger', () => {
      const logger = new Logger();
      const errorHandler = new ErrorHandler(logger);
      
      expect(errorHandler).toBeDefined();
    });

    it('should have static methods', () => {
      expect(typeof ErrorHandler.handle).toBe('function');
      expect(typeof ErrorHandler.getErrorMessage).toBe('function');
      expect(typeof ErrorHandler.isNetworkError).toBe('function');
      expect(typeof ErrorHandler.isAuthError).toBe('function');
    });
  });

  describe('Error Utils', () => {
    it('should extract error message from Error object', () => {
      const error = new Error('Test error message');
      const message = getErrorMessage(error);
      
      expect(message).toBe('Test error message');
    });

    it('should extract error message from string', () => {
      const message = getErrorMessage('String error');
      
      expect(message).toBe('String error');
    });

    it('should handle unknown error types', () => {
      const message = getErrorMessage({ someProperty: 'value' });
      
      expect(message).toBe('Unknown error occurred');
    });

    it('should extract stack trace from Error object', () => {
      const error = new Error('Test error');
      const stack = getErrorStack(error);
      
      expect(stack).toBeDefined();
      expect(typeof stack).toBe('string');
    });

    it('should handle missing stack trace', () => {
      const stack = getErrorStack('string error');
      
      expect(stack).toBeUndefined();
    });
  });
});
