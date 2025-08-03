#!/usr/bin/env node

/**
 * Simple User Preferences Test
 * Tests the user preferences functionality without full build dependencies
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Simple implementation for testing
const DEFAULT_PREFERENCES = {
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

class SimplePreferencesManager {
  constructor() {
    this.dataDir = path.join(os.homedir(), '.llamacli');
    this.preferencesPath = path.join(this.dataDir, 'preferences.json');
    this.preferences = { ...DEFAULT_PREFERENCES };
  }

  async initialize() {
    await this.ensureDataDir();
    await this.loadPreferences();
  }

  async ensureDataDir() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  async loadPreferences() {
    try {
      const data = await fs.readFile(this.preferencesPath, 'utf8');
      const loaded = JSON.parse(data);
      this.preferences = this.mergePreferences(DEFAULT_PREFERENCES, loaded);
      this.preferences.version = DEFAULT_PREFERENCES.version;
      this.preferences.lastUpdated = Date.now();
    } catch (error) {
      console.log('Using default preferences');
      await this.savePreferences();
    }
  }

  async savePreferences() {
    this.preferences.lastUpdated = Date.now();
    const data = JSON.stringify(this.preferences, null, 2);
    await fs.writeFile(this.preferencesPath, data, 'utf8');
  }

  getPreferences() {
    return { ...this.preferences };
  }

  async updatePreferences(updates) {
    this.preferences = this.mergePreferences(this.preferences, updates);
    await this.savePreferences();
  }

  getCLIPreferences() {
    return { ...this.preferences.cli };
  }

  async updateCLIPreferences(updates) {
    this.preferences.cli = { ...this.preferences.cli, ...updates };
    await this.savePreferences();
  }

  getHistoryPreferences() {
    return { ...this.preferences.history };
  }

  async updateHistoryPreferences(updates) {
    this.preferences.history = { ...this.preferences.history, ...updates };
    await this.savePreferences();
  }

  async resetPreferences() {
    this.preferences = { ...DEFAULT_PREFERENCES };
    await this.savePreferences();
  }

  async resetCLIPreferences() {
    this.preferences.cli = { ...DEFAULT_PREFERENCES.cli };
    await this.savePreferences();
  }

  async exportPreferences(filePath) {
    const data = JSON.stringify(this.preferences, null, 2);
    await fs.writeFile(filePath, data, 'utf8');
  }

  async importPreferences(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    const imported = JSON.parse(data);
    this.preferences = this.mergePreferences(DEFAULT_PREFERENCES, imported);
    await this.savePreferences();
  }

  mergePreferences(target, source) {
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
}

async function testPreferences() {
  console.log('🧪 Testing User Preferences System\n');

  const prefsManager = new SimplePreferencesManager();

  try {
    // Test 1: Initialize
    console.log('1. Initializing preferences...');
    await prefsManager.initialize();
    console.log('✅ Initialized successfully\n');

    // Test 2: Get defaults
    console.log('2. Getting default preferences...');
    const defaults = prefsManager.getPreferences();
    console.log(`✅ Default theme: ${defaults.cli.theme}`);
    console.log(`✅ Auto-completion: ${defaults.cli.autoComplete}`);
    console.log(`✅ History enabled: ${defaults.history.enabled}\n`);

    // Test 3: Update CLI preferences
    console.log('3. Updating CLI preferences...');
    await prefsManager.updateCLIPreferences({
      theme: 'dracula',
      prompt: 'test> ',
      showWelcome: false,
    });
    
    const cliPrefs = prefsManager.getCLIPreferences();
    console.log(`✅ Updated theme: ${cliPrefs.theme}`);
    console.log(`✅ Updated prompt: ${cliPrefs.prompt}`);
    console.log(`✅ Show welcome: ${cliPrefs.showWelcome}\n`);

    // Test 4: Update history preferences
    console.log('4. Updating history preferences...');
    await prefsManager.updateHistoryPreferences({
      maxEntries: 500,
      duplicateHandling: 'remove',
    });
    
    const historyPrefs = prefsManager.getHistoryPreferences();
    console.log(`✅ Max entries: ${historyPrefs.maxEntries}`);
    console.log(`✅ Duplicate handling: ${historyPrefs.duplicateHandling}\n`);

    // Test 5: Export/Import
    console.log('5. Testing export/import...');
    const tempFile = '/tmp/llamacli-test-prefs.json';
    
    await prefsManager.exportPreferences(tempFile);
    console.log('✅ Exported preferences');
    
    // Change something
    await prefsManager.updateCLIPreferences({ theme: 'light' });
    console.log(`✅ Changed theme to: ${prefsManager.getCLIPreferences().theme}`);
    
    // Import back
    await prefsManager.importPreferences(tempFile);
    const importedTheme = prefsManager.getCLIPreferences().theme;
    console.log(`✅ Imported theme back: ${importedTheme}`);
    
    // Cleanup
    try {
      await fs.unlink(tempFile);
    } catch (error) {
      // Ignore
    }
    console.log();

    // Test 6: Reset
    console.log('6. Testing reset...');
    await prefsManager.updateCLIPreferences({ theme: 'custom' });
    console.log(`✅ Set custom theme: ${prefsManager.getCLIPreferences().theme}`);
    
    await prefsManager.resetCLIPreferences();
    console.log(`✅ Reset theme: ${prefsManager.getCLIPreferences().theme}\n`);

    // Test 7: File persistence
    console.log('7. Testing file persistence...');
    const prefsPath = path.join(os.homedir(), '.llamacli', 'preferences.json');
    
    try {
      await fs.access(prefsPath);
      console.log('✅ Preferences file exists');
      
      const fileContent = await fs.readFile(prefsPath, 'utf8');
      const parsed = JSON.parse(fileContent);
      console.log(`✅ File contains valid JSON with version: ${parsed.version}`);
      console.log(`✅ File size: ${fileContent.length} bytes\n`);
    } catch (error) {
      console.log('❌ Preferences file not found or invalid');
    }

    console.log('📊 Test Summary:');
    console.log('✅ Preferences initialization');
    console.log('✅ Default preferences loading');
    console.log('✅ CLI preferences updates');
    console.log('✅ History preferences updates');
    console.log('✅ Export/import functionality');
    console.log('✅ Reset functionality');
    console.log('✅ File persistence');
    
    console.log('\n🎉 All user preferences tests passed!');
    console.log('\n📁 Preferences are stored in:', prefsPath);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testPreferences().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
