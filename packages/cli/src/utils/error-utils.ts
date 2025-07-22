/**
 * Error utility functions for handling unknown error types
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error occurred';
}

export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  if (error && typeof error === 'object' && 'stack' in error) {
    return String(error.stack);
  }
  return undefined;
}

export function isErrorWithMessage(error: unknown): error is { message: string } {
  return error !== null && 
         typeof error === 'object' && 
         'message' in error && 
         typeof error.message === 'string';
}

export function isErrorWithStack(error: unknown): error is { stack: string } {
  return error !== null && 
         typeof error === 'object' && 
         'stack' in error && 
         typeof error.stack === 'string';
}

export function logError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const stack = getErrorStack(error);
  const contextStr = context ? ` in ${context}` : '';
  
  console.error(`Error${contextStr}: ${message}`);
  if (stack) {
    console.error('Stack trace:', stack);
  }
}
