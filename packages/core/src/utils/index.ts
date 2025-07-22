/**
 * Utility functions for LlamaCLI
 */

import { promises as fs } from "fs";
import { resolve, extname, basename } from "path";
import { createHash } from "crypto";

/**
 * File utilities
 */
export class FileUtils {
  /**
   * Check if a file exists
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats safely
   */
  static async getStats(filePath: string) {
    try {
      return await fs.stat(filePath);
    } catch {
      return null;
    }
  }

  /**
   * Read file with encoding detection
   */
  static async readFile(filePath: string, encoding: BufferEncoding = "utf8"): Promise<string> {
    const content = await fs.readFile(filePath, encoding);
    return content;
  }

  /**
   * Write file with directory creation
   */
  static async writeFile(
    filePath: string,
    content: string,
    options: { encoding?: BufferEncoding; createDirs?: boolean } = {}
  ): Promise<void> {
    const { encoding = "utf8", createDirs = true } = options;

    if (createDirs) {
      const dir = resolve(filePath, "..");
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(filePath, content, encoding);
  }

  /**
   * Calculate file hash
   */
  static async calculateHash(filePath: string, algorithm: string = "sha256"): Promise<string> {
    const content = await fs.readFile(filePath);
    return createHash(algorithm).update(content).digest("hex");
  }

  /**
   * Get file extension
   */
  static getExtension(filePath: string): string {
    return extname(filePath).toLowerCase();
  }

  /**
   * Get file name without extension
   */
  static getBaseName(filePath: string): string {
    const ext = extname(filePath);
    return basename(filePath, ext);
  }

  /**
   * Format file size in human-readable format
   */
  static formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
  }

  /**
   * Check if file is binary
   */
  static async isBinary(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath);
      const chunk = buffer.slice(0, 1024);

      for (let i = 0; i < chunk.length; i++) {
        const byte = chunk[i];
        if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}

/**
 * String utilities
 */
export class StringUtils {
  /**
   * Truncate string to specified length
   */
  static truncate(str: string, maxLength: number, suffix: string = "..."): string {
    if (str.length <= maxLength) {
      return str;
    }

    return str.slice(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Escape special characters for regex
   */
  static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Convert string to camelCase
   */
  static toCamelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, "");
  }

  /**
   * Convert string to kebab-case
   */
  static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  }

  /**
   * Convert string to snake_case
   */
  static toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toLowerCase();
  }

  /**
   * Generate random string
   */
  static randomString(
    length: number,
    charset: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  ): string {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Count words in string
   */
  static countWords(str: string): number {
    return str
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Estimate reading time in minutes
   */
  static estimateReadingTime(str: string, wordsPerMinute: number = 200): number {
    const wordCount = this.countWords(str);
    return Math.ceil(wordCount / wordsPerMinute);
  }
}

/**
 * Object utilities
 */
export class ObjectUtils {
  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item)) as unknown as T;
    }

    if (typeof obj === "object") {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * Deep merge objects
   */
  static deepMerge<T extends Record<string, any>>(...objects: Partial<T>[]): T {
    const result = {} as T;

    for (const obj of objects) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];

          if (value && typeof value === "object" && !Array.isArray(value)) {
            result[key] = this.deepMerge(result[key] || {}, value);
          } else {
            (result as any)[key] = value;
          }
        }
      }
    }

    return result;
  }

  /**
   * Get nested property value
   */
  static getNestedValue(obj: any, path: string, defaultValue?: any): any {
    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Set nested property value
   */
  static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Remove undefined values from object
   */
  static removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: Partial<T> = {};

    for (const key in obj) {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    }

    return result;
  }

  /**
   * Pick specific properties from object
   */
  static pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;

    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }

    return result;
  }

  /**
   * Omit specific properties from object
   */
  static omit<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj } as Omit<T, K>;

    for (const key of keys) {
      delete (result as any)[key];
    }

    return result;
  }
}

/**
 * Array utilities
 */
export class ArrayUtils {
  /**
   * Remove duplicates from array
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * Remove duplicates by key
   */
  static uniqueBy<T>(array: T[], keyFn: (item: T) => any): T[] {
    const seen = new Set();
    return array.filter((item) => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Group array items by key
   */
  static groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    const groups: Record<string, T[]> = {};

    for (const item of array) {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }

    return groups;
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }

    return chunks;
  }

  /**
   * Flatten nested arrays
   */
  static flatten<T>(array: (T | T[])[]): T[] {
    const result: T[] = [];

    for (const item of array) {
      if (Array.isArray(item)) {
        result.push(...this.flatten(item));
      } else {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Get random item from array
   */
  static randomItem<T>(array: T[]): T | undefined {
    if (array.length === 0) {
      return undefined;
    }

    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Shuffle array
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }
}

/**
 * Date utilities
 */
export class DateUtils {
  /**
   * Format date to ISO string
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * Format date to human-readable string
   */
  static toHumanString(date: Date): string {
    return date.toLocaleString();
  }

  /**
   * Get relative time string (e.g., "2 hours ago")
   */
  static getRelativeTime(date: Date, now: Date = new Date()): string {
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return "just now";
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
    } else if (diffDay < 7) {
      return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Add time to date
   */
  static addTime(date: Date, amount: number, unit: "seconds" | "minutes" | "hours" | "days"): Date {
    const result = new Date(date);

    switch (unit) {
      case "seconds":
        result.setSeconds(result.getSeconds() + amount);
        break;
      case "minutes":
        result.setMinutes(result.getMinutes() + amount);
        break;
      case "hours":
        result.setHours(result.getHours() + amount);
        break;
      case "days":
        result.setDate(result.getDate() + amount);
        break;
    }

    return result;
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Check if date is yesterday
   */
  static isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Check if string is valid email
   */
  static isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if string is valid URL
   */
  static isUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if string is valid JSON
   */
  static isJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if value is empty
   */
  static isEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === "string") {
      return value.trim() === "";
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === "object") {
      return Object.keys(value).length === 0;
    }

    return false;
  }

  /**
   * Check if value is numeric
   */
  static isNumeric(value: any): boolean {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  /**
   * Check if string matches pattern
   */
  static matchesPattern(str: string, pattern: string | RegExp): boolean {
    if (typeof pattern === "string") {
      pattern = new RegExp(pattern);
    }
    return pattern.test(str);
  }
}

/**
 * Async utilities
 */
export class AsyncUtils {
  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      delay?: number;
      backoff?: number;
      shouldRetry?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, delay = 1000, backoff = 2, shouldRetry = () => true } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries || !shouldRetry(lastError)) {
          throw lastError;
        }

        await this.sleep(delay * Math.pow(backoff, attempt));
      }
    }

    throw lastError!;
  }

  /**
   * Run promises with concurrency limit
   */
  static async concurrent<T>(tasks: (() => Promise<T>)[], concurrency: number = 5): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const [index, task] of tasks.entries()) {
      const promise = task().then((result) => {
        results[index] = result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Timeout wrapper for promises
   */
  static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Operation timed out")), timeoutMs);
      }),
    ]);
  }
}

/**
 * Error utilities
 */
export class ErrorUtils {
  /**
   * Create error with additional context
   */
  static createError(
    message: string,
    code?: string,
    cause?: Error,
    context?: Record<string, any>
  ): Error & { code?: string; cause?: Error; context?: Record<string, any> } {
    const error = new Error(message) as Error & {
      code?: string;
      cause?: Error;
      context?: Record<string, any>;
    };

    if (code) error.code = code;
    if (cause) error.cause = cause;
    if (context) error.context = context;

    return error;
  }

  /**
   * Check if error is of specific type
   */
  static isErrorType(error: any, type: string): boolean {
    return error instanceof Error && error.constructor.name === type;
  }

  /**
   * Get error stack trace
   */
  static getStackTrace(error: Error): string[] {
    return error.stack?.split("\n").slice(1) || [];
  }

  /**
   * Format error for logging
   */
  static formatError(error: Error): string {
    let formatted = `${error.name}: ${error.message}`;

    if ((error as any).code) {
      formatted += ` (${(error as any).code})`;
    }

    if (error.stack) {
      formatted += `\n${error.stack}`;
    }

    return formatted;
  }
}
