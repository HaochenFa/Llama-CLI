/**
 * Simple logger utility
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private level: LogLevel = LogLevel.INFO;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  setLevel(level: LogLevel | string): void {
    if (typeof level === "string") {
      switch (level) {
        case "debug":
          this.level = LogLevel.DEBUG;
          break;
        case "info":
          this.level = LogLevel.INFO;
          break;
        case "warn":
          this.level = LogLevel.WARN;
          break;
        case "error":
          this.level = LogLevel.ERROR;
          break;
        default:
          this.level = LogLevel.INFO;
      }
    } else {
      this.level = level;
    }
  }

  getLevel(): LogLevel {
    return this.level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}

// Default logger instance
export const logger = new Logger();
