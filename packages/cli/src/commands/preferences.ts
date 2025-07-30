/**
 * Preferences Command for LlamaCLI
 * Manages user preferences and settings
 */

import { Command } from "commander";
import { userPreferencesManager, UserPreferences } from "@llamacli/core";
import { themeManager } from "../ui/theme-manager.js";

export class PreferencesCommand {
  private program: Command;

  constructor() {
    this.program = new Command("preferences")
      .alias("prefs")
      .description("Manage user preferences and settings")
      .addCommand(this.createListCommand())
      .addCommand(this.createGetCommand())
      .addCommand(this.createSetCommand())
      .addCommand(this.createResetCommand())
      .addCommand(this.createExportCommand())
      .addCommand(this.createImportCommand());
  }

  getCommand(): Command {
    return this.program;
  }

  /**
   * List all preferences
   */
  private createListCommand(): Command {
    return new Command("list")
      .alias("ls")
      .description("List all user preferences")
      .option("-s, --section <section>", "Show specific section (cli, editor, display, behavior, shortcuts, history)")
      .option("-j, --json", "Output in JSON format")
      .action(async (options) => {
        await this.listPreferences(options);
      });
  }

  /**
   * Get specific preference
   */
  private createGetCommand(): Command {
    return new Command("get")
      .description("Get a specific preference value")
      .argument("<key>", "Preference key (e.g., cli.theme, editor.tabSize)")
      .action(async (key) => {
        await this.getPreference(key);
      });
  }

  /**
   * Set specific preference
   */
  private createSetCommand(): Command {
    return new Command("set")
      .description("Set a specific preference value")
      .argument("<key>", "Preference key (e.g., cli.theme, editor.tabSize)")
      .argument("<value>", "Preference value")
      .action(async (key, value) => {
        await this.setPreference(key, value);
      });
  }

  /**
   * Reset preferences
   */
  private createResetCommand(): Command {
    return new Command("reset")
      .description("Reset preferences to defaults")
      .option("-s, --section <section>", "Reset specific section only")
      .option("-y, --yes", "Skip confirmation")
      .action(async (options) => {
        await this.resetPreferences(options);
      });
  }

  /**
   * Export preferences
   */
  private createExportCommand(): Command {
    return new Command("export")
      .description("Export preferences to file")
      .argument("<file>", "Output file path")
      .action(async (file) => {
        await this.exportPreferences(file);
      });
  }

  /**
   * Import preferences
   */
  private createImportCommand(): Command {
    return new Command("import")
      .description("Import preferences from file")
      .argument("<file>", "Input file path")
      .option("-y, --yes", "Skip confirmation")
      .action(async (file, options) => {
        await this.importPreferences(file, options);
      });
  }

  /**
   * List preferences implementation
   */
  private async listPreferences(options: any): Promise<void> {
    try {
      await userPreferencesManager.initialize();
      const preferences = userPreferencesManager.getPreferences();

      if (options.json) {
        if (options.section) {
          const section = (preferences as any)[options.section];
          if (section) {
            console.log(JSON.stringify(section, null, 2));
          } else {
            console.error(`Section '${options.section}' not found`);
            process.exit(1);
          }
        } else {
          console.log(JSON.stringify(preferences, null, 2));
        }
        return;
      }

      // Human-readable format
      console.log("📋 User Preferences\n");

      const sections = options.section ? [options.section] : 
        ['cli', 'editor', 'display', 'behavior', 'shortcuts', 'history'];

      for (const sectionName of sections) {
        const section = (preferences as any)[sectionName];
        if (!section) {
          console.error(`Section '${sectionName}' not found`);
          continue;
        }

        console.log(`${this.getSectionIcon(sectionName)} ${this.capitalize(sectionName)} Settings:`);
        this.printSection(section, '  ');
        console.log();
      }

    } catch (error) {
      console.error("Failed to list preferences:", error);
      process.exit(1);
    }
  }

  /**
   * Get preference implementation
   */
  private async getPreference(key: string): Promise<void> {
    try {
      await userPreferencesManager.initialize();
      const preferences = userPreferencesManager.getPreferences();
      
      const value = this.getNestedValue(preferences, key);
      if (value !== undefined) {
        console.log(value);
      } else {
        console.error(`Preference '${key}' not found`);
        process.exit(1);
      }
    } catch (error) {
      console.error("Failed to get preference:", error);
      process.exit(1);
    }
  }

  /**
   * Set preference implementation
   */
  private async setPreference(key: string, value: string): Promise<void> {
    try {
      await userPreferencesManager.initialize();
      
      // Parse value based on type
      const parsedValue = this.parseValue(value);
      
      // Update preference
      const updates = this.createNestedUpdate(key, parsedValue);
      await userPreferencesManager.updatePreferences(updates);
      
      console.log(`✅ Set ${key} = ${parsedValue}`);
      
      // Apply special handling for certain preferences
      if (key === 'cli.theme') {
        await themeManager.setTheme(parsedValue as string);
        console.log(`🎨 Theme changed to: ${parsedValue}`);
      }
      
    } catch (error) {
      console.error("Failed to set preference:", error);
      process.exit(1);
    }
  }

  /**
   * Reset preferences implementation
   */
  private async resetPreferences(options: any): Promise<void> {
    try {
      if (!options.yes) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          const question = options.section 
            ? `Reset ${options.section} preferences to defaults? (y/N): `
            : "Reset all preferences to defaults? (y/N): ";
          rl.question(question, resolve);
        });

        rl.close();

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log("Reset cancelled");
          return;
        }
      }

      await userPreferencesManager.initialize();

      if (options.section) {
        switch (options.section) {
          case 'cli':
            await userPreferencesManager.resetCLIPreferences();
            break;
          default:
            console.error(`Section '${options.section}' reset not implemented`);
            process.exit(1);
        }
        console.log(`✅ Reset ${options.section} preferences to defaults`);
      } else {
        await userPreferencesManager.resetPreferences();
        console.log("✅ Reset all preferences to defaults");
      }

    } catch (error) {
      console.error("Failed to reset preferences:", error);
      process.exit(1);
    }
  }

  /**
   * Export preferences implementation
   */
  private async exportPreferences(file: string): Promise<void> {
    try {
      await userPreferencesManager.initialize();
      await userPreferencesManager.exportPreferences(file);
      console.log(`✅ Exported preferences to: ${file}`);
    } catch (error) {
      console.error("Failed to export preferences:", error);
      process.exit(1);
    }
  }

  /**
   * Import preferences implementation
   */
  private async importPreferences(file: string, options: any): Promise<void> {
    try {
      if (!options.yes) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(`Import preferences from ${file}? This will overwrite current settings. (y/N): `, resolve);
        });

        rl.close();

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log("Import cancelled");
          return;
        }
      }

      await userPreferencesManager.initialize();
      await userPreferencesManager.importPreferences(file);
      console.log(`✅ Imported preferences from: ${file}`);
    } catch (error) {
      console.error("Failed to import preferences:", error);
      process.exit(1);
    }
  }

  // Helper methods
  private getSectionIcon(section: string): string {
    const icons: Record<string, string> = {
      cli: '🖥️',
      editor: '📝',
      display: '🎨',
      behavior: '⚙️',
      shortcuts: '⌨️',
      history: '📚',
    };
    return icons[section] || '📋';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private printSection(obj: any, indent: string): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        console.log(`${indent}${key}:`);
        this.printSection(value, indent + '  ');
      } else {
        console.log(`${indent}${key}: ${JSON.stringify(value)}`);
      }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private createNestedUpdate(path: string, value: any): any {
    const keys = path.split('.');
    const result: any = {};
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    return result;
  }

  private parseValue(value: string): any {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, return as string
      return value;
    }
  }
}
