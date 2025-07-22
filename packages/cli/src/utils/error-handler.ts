/**
 * Error handling utilities
 */

import { logger } from "./logger.js";

interface Logger {
  info: (message: string) => void;
  debug: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export class ErrorHandler {
  private logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  handle(error: unknown, context?: string): void {
    const message = ErrorHandler.getErrorMessage(error);
    const contextStr = context ? ` in ${context}` : "";

    if (this.logger) {
      this.logger.error(`Error${contextStr}: ${message}`);

      if (error instanceof Error && error.stack) {
        this.logger.debug(`Stack trace: ${error.stack}`);
      }
    } else {
      console.error(`Error${contextStr}: ${message}`);
    }
  }

  static handle(error: unknown, context?: string): void {
    const message = this.getErrorMessage(error);
    const contextStr = context ? ` in ${context}` : "";

    logger.error(`Error${contextStr}: ${message}`);

    if (error instanceof Error && error.stack) {
      logger.debug(`Stack trace: ${error.stack}`);
    }
  }

  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "Unknown error occurred";
  }

  static isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("timeout")
    );
  }

  static isAuthError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    return (
      message.includes("auth") ||
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("401") ||
      message.includes("403")
    );
  }

  static createUserFriendlyMessage(error: unknown): string {
    if (this.isNetworkError(error)) {
      return "Network connection failed. Please check your internet connection and try again.";
    }

    if (this.isAuthError(error)) {
      return "Authentication failed. Please check your API key or credentials.";
    }

    return this.getErrorMessage(error);
  }
}
