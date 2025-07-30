/**
 * User Preferences Management for LlamaCLI
 * Handles persistent storage of user customizations and settings
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export interface UserPreferences {
  version: string;
  cli: CLIPreferences;
  editor: EditorPreferences;
  display: DisplayPreferences;
  behavior: BehaviorPreferences;
  shortcuts: ShortcutPreferences;
  history: HistoryPreferences;
  lastUpdated: number;
}

export interface CLIPreferences {
  theme: string;
  colorScheme: 'auto' | 'light' | 'dark';
  prompt: string;
  showWelcome: boolean;
  showTips: boolean;
  enableAnimations: boolean;
  compactMode: boolean;
  showTimestamps: boolean;
  autoComplete: boolean;
  syntaxHighlighting: boolean;
}

export interface EditorPreferences {
  defaultEditor: string;
  lineNumbers: boolean;
  wordWrap: boolean;
  tabSize: number;
  insertSpaces: boolean;
  autoSave: boolean;
  fontSize: number;
  fontFamily: string;
}

export interface DisplayPreferences {
  maxWidth: number;
  showLineNumbers: boolean;
  showFileIcons: boolean;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  codeBlockStyle: 'bordered' | 'highlighted' | 'minimal';
  tableStyle: 'ascii' | 'unicode' | 'minimal';
}

export interface BehaviorPreferences {
  confirmExit: boolean;
  confirmDelete: boolean;
  autoSaveSession: boolean;
  rememberWindowSize: boolean;
  checkForUpdates: boolean;
  sendTelemetry: boolean;
  enableNotifications: boolean;
  soundEnabled: boolean;
}

export interface ShortcutPreferences {
  clearScreen: string;
  exitApp: string;
  showHelp: string;
  toggleTheme: string;
  newSession: string;
  saveSession: string;
  searchHistory: string;
  customShortcuts: Record<string, string>;
}

export interface HistoryPreferences {
  enabled: boolean;
  maxEntries: number;
  persistAcrossSessions: boolean;
  excludePatterns: string[];
  searchEnabled: boolean;
  duplicateHandling: 'allow' | 'remove' | 'moveToEnd';
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  version: "1.0.0",
  cli: {
    theme: "default",
    colorScheme: "auto",
    prompt: "llamacli> ",
    showWelcome: true,
    showTips: true,
    enableAnimations: true,
    compactMode: false,
    showTimestamps: false,
    autoComplete: true,
    syntaxHighlighting: true,
  },
  editor: {
    defaultEditor: "auto",
    lineNumbers: true,
    wordWrap: true,
    tabSize: 2,
    insertSpaces: true,
    autoSave: false,
    fontSize: 14,
    fontFamily: "monospace",
  },
  display: {
    maxWidth: 120,
    showLineNumbers: true,
    showFileIcons: true,
    dateFormat: "YYYY-MM-DD",
    timeFormat: "HH:mm:ss",
    numberFormat: "en-US",
    codeBlockStyle: "bordered",
    tableStyle: "unicode",
  },
  behavior: {
    confirmExit: false,
    confirmDelete: true,
    autoSaveSession: true,
    rememberWindowSize: true,
    checkForUpdates: true,
    sendTelemetry: false,
    enableNotifications: true,
    soundEnabled: false,
  },
  shortcuts: {
    clearScreen: "Ctrl+L",
    exitApp: "Ctrl+D",
    showHelp: "F1",
    toggleTheme: "Ctrl+T",
    newSession: "Ctrl+N",
    saveSession: "Ctrl+S",
    searchHistory: "Ctrl+R",
    customShortcuts: {},
  },
  history: {
    enabled: true,
    maxEntries: 1000,
    persistAcrossSessions: true,
    excludePatterns: ["password", "secret", "token", "key"],
    searchEnabled: true,
    duplicateHandling: "moveToEnd",
  },
  lastUpdated: Date.now(),
};

export class UserPreferencesManager {
  private preferencesPath: string;
  private dataDir: string;
  private preferences: UserPreferences;
  private watchers: Set<(preferences: UserPreferences) => void> = new Set();

  constructor() {
    this.dataDir = path.join(os.homedir(), ".llamacli");
    this.preferencesPath = path.join(this.dataDir, "preferences.json");
    this.preferences = { ...DEFAULT_USER_PREFERENCES };
  }

  /**
   * Initialize the preferences manager
   */
  async initialize(): Promise<void> {
    await this.ensureDataDir();
    await this.loadPreferences();
  }

  /**
   * Ensure the data directory exists
   */
  private async ensureDataDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  /**
   * Load preferences from disk
   */
  private async loadPreferences(): Promise<void> {
    try {
      const data = await fs.readFile(this.preferencesPath, "utf8");
      const loaded = JSON.parse(data) as UserPreferences;
      
      // Merge with defaults to handle new preferences
      this.preferences = this.mergePreferences(DEFAULT_USER_PREFERENCES, loaded);
      
      // Update version and timestamp
      this.preferences.version = DEFAULT_USER_PREFERENCES.version;
      this.preferences.lastUpdated = Date.now();
      
    } catch (error) {
      // Preferences file doesn't exist or is corrupted, use defaults
      console.log("Using default user preferences");
      await this.savePreferences();
    }
  }

  /**
   * Save preferences to disk
   */
  async savePreferences(): Promise<void> {
    this.preferences.lastUpdated = Date.now();
    const data = JSON.stringify(this.preferences, null, 2);
    await fs.writeFile(this.preferencesPath, data, "utf8");
    this.notifyWatchers();
  }

  /**
   * Get current preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Update preferences
   */
  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    this.preferences = this.mergePreferences(this.preferences, updates);
    await this.savePreferences();
  }

  /**
   * Get specific preference section
   */
  getCLIPreferences(): CLIPreferences {
    return { ...this.preferences.cli };
  }

  getEditorPreferences(): EditorPreferences {
    return { ...this.preferences.editor };
  }

  getDisplayPreferences(): DisplayPreferences {
    return { ...this.preferences.display };
  }

  getBehaviorPreferences(): BehaviorPreferences {
    return { ...this.preferences.behavior };
  }

  getShortcutPreferences(): ShortcutPreferences {
    return { ...this.preferences.shortcuts };
  }

  getHistoryPreferences(): HistoryPreferences {
    return { ...this.preferences.history };
  }

  /**
   * Update specific preference sections
   */
  async updateCLIPreferences(updates: Partial<CLIPreferences>): Promise<void> {
    this.preferences.cli = { ...this.preferences.cli, ...updates };
    await this.savePreferences();
  }

  async updateEditorPreferences(updates: Partial<EditorPreferences>): Promise<void> {
    this.preferences.editor = { ...this.preferences.editor, ...updates };
    await this.savePreferences();
  }

  async updateDisplayPreferences(updates: Partial<DisplayPreferences>): Promise<void> {
    this.preferences.display = { ...this.preferences.display, ...updates };
    await this.savePreferences();
  }

  async updateBehaviorPreferences(updates: Partial<BehaviorPreferences>): Promise<void> {
    this.preferences.behavior = { ...this.preferences.behavior, ...updates };
    await this.savePreferences();
  }

  async updateShortcutPreferences(updates: Partial<ShortcutPreferences>): Promise<void> {
    this.preferences.shortcuts = { ...this.preferences.shortcuts, ...updates };
    await this.savePreferences();
  }

  async updateHistoryPreferences(updates: Partial<HistoryPreferences>): Promise<void> {
    this.preferences.history = { ...this.preferences.history, ...updates };
    await this.savePreferences();
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<void> {
    this.preferences = { ...DEFAULT_USER_PREFERENCES };
    await this.savePreferences();
  }

  /**
   * Reset specific preference section
   */
  async resetCLIPreferences(): Promise<void> {
    this.preferences.cli = { ...DEFAULT_USER_PREFERENCES.cli };
    await this.savePreferences();
  }

  /**
   * Watch for preference changes
   */
  onPreferencesChange(callback: (preferences: UserPreferences) => void): () => void {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }

  /**
   * Notify watchers of changes
   */
  private notifyWatchers(): void {
    this.watchers.forEach((callback) => callback(this.preferences));
  }

  /**
   * Deep merge preferences objects
   */
  private mergePreferences(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergePreferences(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Export preferences to file
   */
  async exportPreferences(filePath: string): Promise<void> {
    const data = JSON.stringify(this.preferences, null, 2);
    await fs.writeFile(filePath, data, "utf8");
  }

  /**
   * Import preferences from file
   */
  async importPreferences(filePath: string): Promise<void> {
    const data = await fs.readFile(filePath, "utf8");
    const imported = JSON.parse(data) as UserPreferences;
    
    // Validate and merge
    this.preferences = this.mergePreferences(DEFAULT_USER_PREFERENCES, imported);
    await this.savePreferences();
  }
}

// Export singleton instance
export const userPreferencesManager = new UserPreferencesManager();
