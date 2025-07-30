/**
 * Error Handling Middleware for LlamaCLI
 * Integrates enhanced error handling, display, and reporting
 */

import { enhancedErrorHandler, errorDisplayManager, ErrorContext } from './enhanced-error-handler.js';
import { errorReporter } from './error-reporter.js';
import { userPreferencesManager } from '../config/user-preferences.js';

export interface ErrorMiddlewareOptions {
  interactive?: boolean;
  showSuggestions?: boolean;
  enableReporting?: boolean;
  context?: ErrorContext;
  exitOnError?: boolean;
}

export class ErrorMiddleware {
  private static instance: ErrorMiddleware;

  static getInstance(): ErrorMiddleware {
    if (!ErrorMiddleware.instance) {
      ErrorMiddleware.instance = new ErrorMiddleware();
    }
    return ErrorMiddleware.instance;
  }

  /**
   * Handle error with full processing pipeline
   */
  async handleError(
    error: unknown,
    options: ErrorMiddlewareOptions = {}
  ): Promise<void> {
    const {
      interactive = false,
      showSuggestions = true,
      enableReporting = true,
      context,
      exitOnError = true,
    } = options;

    try {
      // Process the error through enhanced handler
      const enhancedError = enhancedErrorHandler.processError(error, context);

      // Display the error to the user
      if (showSuggestions) {
        await errorDisplayManager.displayError(enhancedError, interactive);
      } else {
        // Simple error display
        console.error(`❌ ${enhancedError.userMessage}`);
      }

      // Report the error if enabled and reportable
      if (enableReporting && enhancedError.reportable) {
        await this.reportErrorIfConsented(enhancedError, context?.sessionId);
      }

      // Log for debugging
      this.logError(enhancedError);

      // Exit if requested
      if (exitOnError && !enhancedError.recoverable) {
        process.exit(1);
      }

    } catch (handlingError) {
      // Fallback error handling if our error handling fails
      console.error('❌ Error occurred while handling error:', handlingError);
      console.error('❌ Original error:', error);
      
      if (exitOnError) {
        process.exit(1);
      }
    }
  }

  /**
   * Create error handler function for use in try-catch blocks
   */
  createHandler(options: ErrorMiddlewareOptions = {}) {
    return (error: unknown) => this.handleError(error, options);
  }

  /**
   * Create async error handler for promises
   */
  createAsyncHandler(options: ErrorMiddlewareOptions = {}) {
    return async (error: unknown) => await this.handleError(error, options);
  }

  /**
   * Wrap a function with error handling
   */
  wrapFunction<T extends (...args: any[]) => any>(
    fn: T,
    options: ErrorMiddlewareOptions = {}
  ): T {
    return ((...args: any[]) => {
      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result && typeof result.catch === 'function') {
          return result.catch(this.createAsyncHandler(options));
        }
        
        return result;
      } catch (error) {
        this.handleError(error, options);
      }
    }) as T;
  }

  /**
   * Wrap an async function with error handling
   */
  wrapAsyncFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: ErrorMiddlewareOptions = {}
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        await this.handleError(error, options);
      }
    }) as T;
  }

  /**
   * Set up global error handlers
   */
  setupGlobalHandlers(options: ErrorMiddlewareOptions = {}): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('🚨 Uncaught Exception:');
      await this.handleError(error, {
        ...options,
        context: { operation: 'uncaughtException' },
        exitOnError: true,
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('🚨 Unhandled Promise Rejection:');
      await this.handleError(reason, {
        ...options,
        context: { 
          operation: 'unhandledRejection',
          environment: { promise: promise.toString() },
        },
        exitOnError: true,
      });
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      console.log('\n👋 Received SIGINT, shutting down gracefully...');
      
      // Give time for cleanup
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });

    // Handle SIGTERM
    process.on('SIGTERM', async () => {
      console.log('👋 Received SIGTERM, shutting down gracefully...');
      
      // Give time for cleanup
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
  }

  /**
   * Report error if user has consented
   */
  private async reportErrorIfConsented(
    enhancedError: any,
    sessionId?: string
  ): Promise<void> {
    try {
      await userPreferencesManager.initialize();
      const behaviorPrefs = userPreferencesManager.getBehaviorPreferences();
      
      if (behaviorPrefs.sendTelemetry) {
        const reportId = await errorReporter.reportError(
          enhancedError,
          sessionId,
          true
        );
        
        if (process.env.LLAMACLI_DEBUG) {
          console.debug(`📊 Error reported with ID: ${reportId}`);
        }
      }
    } catch (error) {
      // Don't fail if reporting fails
      console.debug('Failed to report error:', error);
    }
  }

  /**
   * Log error for debugging
   */
  private logError(enhancedError: any): void {
    if (process.env.LLAMACLI_DEBUG || process.env.NODE_ENV === 'development') {
      console.debug('🐛 Enhanced Error Details:');
      console.debug(`   Type: ${enhancedError.type}`);
      console.debug(`   Code: ${enhancedError.code}`);
      console.debug(`   Recoverable: ${enhancedError.recoverable}`);
      console.debug(`   Reportable: ${enhancedError.reportable}`);
      
      if (enhancedError.originalError?.stack) {
        console.debug('   Stack:', enhancedError.originalError.stack);
      }
      
      if (enhancedError.context) {
        console.debug('   Context:', JSON.stringify(enhancedError.context, null, 2));
      }
    }
  }
}

/**
 * Convenience functions for common error handling patterns
 */

// Global error middleware instance
export const errorMiddleware = ErrorMiddleware.getInstance();

/**
 * Handle error with default options
 */
export async function handleError(error: unknown, context?: ErrorContext): Promise<void> {
  await errorMiddleware.handleError(error, { context });
}

/**
 * Handle error in interactive mode
 */
export async function handleInteractiveError(error: unknown, context?: ErrorContext): Promise<void> {
  await errorMiddleware.handleError(error, { 
    interactive: true, 
    context,
    exitOnError: false,
  });
}

/**
 * Handle error with minimal display
 */
export async function handleQuietError(error: unknown, context?: ErrorContext): Promise<void> {
  await errorMiddleware.handleError(error, { 
    showSuggestions: false,
    enableReporting: false,
    context,
  });
}

/**
 * Wrap function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  options?: ErrorMiddlewareOptions
): T {
  return errorMiddleware.wrapFunction(fn, options);
}

/**
 * Wrap async function with error handling
 */
export function withAsyncErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: ErrorMiddlewareOptions
): T {
  return errorMiddleware.wrapAsyncFunction(fn, options);
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandling(options?: ErrorMiddlewareOptions): void {
  errorMiddleware.setupGlobalHandlers(options);
}

/**
 * Create error context
 */
export function createErrorContext(
  command?: string,
  operation?: string,
  userInput?: string,
  sessionId?: string,
  additionalData?: Record<string, any>
): ErrorContext {
  return {
    command,
    operation,
    userInput,
    sessionId,
    timestamp: Date.now(),
    environment: additionalData,
  };
}
