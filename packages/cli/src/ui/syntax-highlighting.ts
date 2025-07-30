/**
 * Syntax Highlighting System for LlamaCLI
 * Provides code syntax highlighting for various languages
 */

import chalk from 'chalk';

export interface HighlightTheme {
  keyword: (text: string) => string;
  string: (text: string) => string;
  comment: (text: string) => string;
  number: (text: string) => string;
  operator: (text: string) => string;
  function: (text: string) => string;
  variable: (text: string) => string;
  type: (text: string) => string;
  constant: (text: string) => string;
  punctuation: (text: string) => string;
}

export interface LanguageDefinition {
  name: string;
  extensions: string[];
  keywords: string[];
  operators: string[];
  stringDelimiters: string[];
  commentPatterns: {
    line?: string;
    block?: { start: string; end: string };
  };
  numberPattern: RegExp;
  functionPattern?: RegExp;
  typePattern?: RegExp;
}

export class SyntaxHighlighter {
  private themes: Map<string, HighlightTheme> = new Map();
  private languages: Map<string, LanguageDefinition> = new Map();
  private currentTheme: HighlightTheme;

  constructor() {
    this.initializeThemes();
    this.initializeLanguages();
    this.currentTheme = this.themes.get('default')!;
  }

  /**
   * Initialize color themes
   */
  private initializeThemes(): void {
    // Default theme
    this.themes.set('default', {
      keyword: chalk.blue.bold,
      string: chalk.green,
      comment: chalk.gray,
      number: chalk.yellow,
      operator: chalk.cyan,
      function: chalk.magenta,
      variable: chalk.white,
      type: chalk.blue,
      constant: chalk.red,
      punctuation: chalk.white,
    });

    // Dark theme
    this.themes.set('dark', {
      keyword: chalk.blueBright.bold,
      string: chalk.greenBright,
      comment: chalk.gray,
      number: chalk.yellowBright,
      operator: chalk.cyanBright,
      function: chalk.magentaBright,
      variable: chalk.whiteBright,
      type: chalk.blueBright,
      constant: chalk.redBright,
      punctuation: chalk.whiteBright,
    });

    // Light theme
    this.themes.set('light', {
      keyword: chalk.blue.bold,
      string: chalk.green.bold,
      comment: chalk.gray.dim,
      number: chalk.magenta,
      operator: chalk.cyan.bold,
      function: chalk.red.bold,
      variable: chalk.black,
      type: chalk.blue,
      constant: chalk.red,
      punctuation: chalk.black,
    });
  }

  /**
   * Initialize language definitions
   */
  private initializeLanguages(): void {
    // JavaScript/TypeScript
    this.languages.set('javascript', {
      name: 'JavaScript',
      extensions: ['.js', '.jsx', '.mjs'],
      keywords: [
        'const', 'let', 'var', 'function', 'class', 'extends', 'implements',
        'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
        'try', 'catch', 'finally', 'throw', 'return', 'break', 'continue',
        'import', 'export', 'from', 'as', 'default', 'async', 'await',
        'true', 'false', 'null', 'undefined', 'this', 'super', 'new'
      ],
      operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':'],
      stringDelimiters: ['"', "'", '`'],
      commentPatterns: {
        line: '//',
        block: { start: '/*', end: '*/' }
      },
      numberPattern: /\b\d+(\.\d+)?\b/g,
      functionPattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    });

    this.languages.set('typescript', {
      ...this.languages.get('javascript')!,
      name: 'TypeScript',
      extensions: ['.ts', '.tsx'],
      keywords: [
        ...this.languages.get('javascript')!.keywords,
        'interface', 'type', 'enum', 'namespace', 'module', 'declare',
        'public', 'private', 'protected', 'readonly', 'static', 'abstract'
      ],
    });

    // Python
    this.languages.set('python', {
      name: 'Python',
      extensions: ['.py', '.pyw'],
      keywords: [
        'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except',
        'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'break',
        'continue', 'pass', 'lambda', 'and', 'or', 'not', 'in', 'is',
        'True', 'False', 'None', 'self', 'super'
      ],
      operators: ['+', '-', '*', '/', '//', '%', '**', '=', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not'],
      stringDelimiters: ['"', "'"],
      commentPatterns: {
        line: '#'
      },
      numberPattern: /\b\d+(\.\d+)?\b/g,
      functionPattern: /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
    });

    // JSON
    this.languages.set('json', {
      name: 'JSON',
      extensions: ['.json'],
      keywords: ['true', 'false', 'null'],
      operators: [':'],
      stringDelimiters: ['"'],
      commentPatterns: {},
      numberPattern: /\b-?\d+(\.\d+)?([eE][+-]?\d+)?\b/g,
    });

    // Shell/Bash
    this.languages.set('shell', {
      name: 'Shell',
      extensions: ['.sh', '.bash', '.zsh'],
      keywords: [
        'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done',
        'case', 'esac', 'function', 'return', 'exit', 'break', 'continue',
        'echo', 'printf', 'read', 'export', 'local', 'readonly'
      ],
      operators: ['=', '==', '!=', '-eq', '-ne', '-lt', '-le', '-gt', '-ge', '&&', '||', '!', '|', '&'],
      stringDelimiters: ['"', "'"],
      commentPatterns: {
        line: '#'
      },
      numberPattern: /\b\d+\b/g,
    });
  }

  /**
   * Set the current theme
   */
  setTheme(themeName: string): boolean {
    const theme = this.themes.get(themeName);
    if (theme) {
      this.currentTheme = theme;
      return true;
    }
    return false;
  }

  /**
   * Get available themes
   */
  getAvailableThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * Detect language from file extension or content
   */
  detectLanguage(filename?: string, content?: string): string {
    if (filename) {
      const ext = filename.toLowerCase();
      for (const [lang, def] of this.languages) {
        if (def.extensions.some(e => ext.endsWith(e))) {
          return lang;
        }
      }
    }

    if (content) {
      // Simple heuristics for language detection
      if (content.includes('#!/bin/bash') || content.includes('#!/bin/sh')) {
        return 'shell';
      }
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        try {
          JSON.parse(content);
          return 'json';
        } catch {
          // Not valid JSON
        }
      }
    }

    return 'text';
  }

  /**
   * Highlight code with syntax coloring
   */
  highlight(code: string, language?: string): string {
    if (!language || language === 'text') {
      return code;
    }

    const langDef = this.languages.get(language);
    if (!langDef) {
      return code;
    }

    let highlighted = code;

    // Highlight strings first (to avoid highlighting keywords inside strings)
    highlighted = this.highlightStrings(highlighted, langDef);

    // Highlight comments
    highlighted = this.highlightComments(highlighted, langDef);

    // Highlight numbers
    highlighted = this.highlightNumbers(highlighted, langDef);

    // Highlight keywords
    highlighted = this.highlightKeywords(highlighted, langDef);

    // Highlight functions
    if (langDef.functionPattern) {
      highlighted = this.highlightFunctions(highlighted, langDef);
    }

    return highlighted;
  }

  /**
   * Highlight strings
   */
  private highlightStrings(code: string, langDef: LanguageDefinition): string {
    let result = code;
    
    for (const delimiter of langDef.stringDelimiters) {
      const regex = new RegExp(`${this.escapeRegex(delimiter)}([^${this.escapeRegex(delimiter)}]*)${this.escapeRegex(delimiter)}`, 'g');
      result = result.replace(regex, (match) => {
        return this.currentTheme.string(match);
      });
    }
    
    return result;
  }

  /**
   * Highlight comments
   */
  private highlightComments(code: string, langDef: LanguageDefinition): string {
    let result = code;
    
    // Line comments
    if (langDef.commentPatterns.line) {
      const regex = new RegExp(`${this.escapeRegex(langDef.commentPatterns.line)}.*$`, 'gm');
      result = result.replace(regex, (match) => {
        return this.currentTheme.comment(match);
      });
    }
    
    // Block comments
    if (langDef.commentPatterns.block) {
      const { start, end } = langDef.commentPatterns.block;
      const regex = new RegExp(`${this.escapeRegex(start)}[\\s\\S]*?${this.escapeRegex(end)}`, 'g');
      result = result.replace(regex, (match) => {
        return this.currentTheme.comment(match);
      });
    }
    
    return result;
  }

  /**
   * Highlight numbers
   */
  private highlightNumbers(code: string, langDef: LanguageDefinition): string {
    return code.replace(langDef.numberPattern, (match) => {
      return this.currentTheme.number(match);
    });
  }

  /**
   * Highlight keywords
   */
  private highlightKeywords(code: string, langDef: LanguageDefinition): string {
    let result = code;
    
    for (const keyword of langDef.keywords) {
      const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'g');
      result = result.replace(regex, (match) => {
        return this.currentTheme.keyword(match);
      });
    }
    
    return result;
  }

  /**
   * Highlight functions
   */
  private highlightFunctions(code: string, langDef: LanguageDefinition): string {
    if (!langDef.functionPattern) return code;
    
    return code.replace(langDef.functionPattern, (match, funcName) => {
      return match.replace(funcName, this.currentTheme.function(funcName));
    });
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Create a simple code block with border
   */
  formatCodeBlock(code: string, language?: string, title?: string): string {
    const highlighted = this.highlight(code, language);
    const lines = highlighted.split('\n');
    const maxLength = Math.max(...lines.map(line => this.stripAnsi(line).length));
    const width = Math.min(maxLength + 4, 80);
    
    let result = '';
    
    // Top border
    result += chalk.gray('┌' + '─'.repeat(width - 2) + '┐\n');
    
    // Title
    if (title) {
      const titleLine = `│ ${title}${' '.repeat(width - title.length - 4)} │`;
      result += chalk.gray(titleLine) + '\n';
      result += chalk.gray('├' + '─'.repeat(width - 2) + '┤\n');
    }
    
    // Content
    for (const line of lines) {
      const padding = width - this.stripAnsi(line).length - 4;
      result += chalk.gray('│ ') + line + ' '.repeat(Math.max(0, padding)) + chalk.gray(' │\n');
    }
    
    // Bottom border
    result += chalk.gray('└' + '─'.repeat(width - 2) + '┘');
    
    return result;
  }

  /**
   * Strip ANSI escape codes for length calculation
   */
  private stripAnsi(str: string): string {
    return str.replace(/\u001b\[[0-9;]*m/g, '');
  }
}

// Export singleton instance
export const syntaxHighlighter = new SyntaxHighlighter();
