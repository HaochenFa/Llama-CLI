/**
 * Theme Management System for LlamaCLI
 * Manages color themes and visual styling for the CLI interface
 */

import chalk from "chalk";
import { ConfigStore, userPreferencesManager, UserPreferencesManager } from "@llamacli/core";

export interface CLITheme {
  name: string;
  type: "light" | "dark";
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    muted: string;
    background: string;
    foreground: string;
    accent: string;
    border: string;
  };
  styles: {
    header: (text: string) => string;
    subheader: (text: string) => string;
    success: (text: string) => string;
    warning: (text: string) => string;
    error: (text: string) => string;
    info: (text: string) => string;
    muted: (text: string) => string;
    highlight: (text: string) => string;
    code: (text: string) => string;
    prompt: (text: string) => string;
    border: (text: string) => string;
  };
}

export class ThemeManager {
  private themes: Map<string, CLITheme> = new Map();
  private currentTheme: CLITheme;
  private configStore?: ConfigStore;
  private preferencesManager: UserPreferencesManager;

  constructor(configStore?: ConfigStore) {
    this.configStore = configStore;
    this.preferencesManager = userPreferencesManager;
    this.initializeThemes();
    this.currentTheme = this.themes.get("default")!;
    this.loadUserTheme();
  }

  /**
   * Initialize built-in themes
   */
  private initializeThemes(): void {
    // Default theme (dark)
    this.themes.set("default", {
      name: "Default",
      type: "dark",
      colors: {
        primary: "#89B4FA",
        secondary: "#CBA6F7",
        success: "#A6E3A1",
        warning: "#F9E2AF",
        error: "#F38BA8",
        info: "#89DCEB",
        muted: "#6C7086",
        background: "#1E1E2E",
        foreground: "#CDD6F4",
        accent: "#89B4FA",
        border: "#45475A",
      },
      styles: {
        header: chalk.hex("#89B4FA").bold,
        subheader: chalk.hex("#CBA6F7"),
        success: chalk.hex("#A6E3A1"),
        warning: chalk.hex("#F9E2AF"),
        error: chalk.hex("#F38BA8"),
        info: chalk.hex("#89DCEB"),
        muted: chalk.hex("#6C7086"),
        highlight: chalk.hex("#89B4FA").bold,
        code: chalk.hex("#CDD6F4").bgHex("#313244"),
        prompt: chalk.hex("#89B4FA").bold,
        border: chalk.hex("#45475A"),
      },
    });

    // Light theme
    this.themes.set("light", {
      name: "Light",
      type: "light",
      colors: {
        primary: "#1e66f5",
        secondary: "#8839ef",
        success: "#40a02b",
        warning: "#df8e1d",
        error: "#d20f39",
        info: "#179299",
        muted: "#6c6f85",
        background: "#eff1f5",
        foreground: "#4c4f69",
        accent: "#1e66f5",
        border: "#bcc0cc",
      },
      styles: {
        header: chalk.hex("#1e66f5").bold,
        subheader: chalk.hex("#8839ef"),
        success: chalk.hex("#40a02b"),
        warning: chalk.hex("#df8e1d"),
        error: chalk.hex("#d20f39"),
        info: chalk.hex("#179299"),
        muted: chalk.hex("#6c6f85"),
        highlight: chalk.hex("#1e66f5").bold,
        code: chalk.hex("#4c4f69").bgHex("#e6e9ef"),
        prompt: chalk.hex("#1e66f5").bold,
        border: chalk.hex("#bcc0cc"),
      },
    });

    // Dracula theme
    this.themes.set("dracula", {
      name: "Dracula",
      type: "dark",
      colors: {
        primary: "#bd93f9",
        secondary: "#ff79c6",
        success: "#50fa7b",
        warning: "#f1fa8c",
        error: "#ff5555",
        info: "#8be9fd",
        muted: "#6272a4",
        background: "#282a36",
        foreground: "#f8f8f2",
        accent: "#bd93f9",
        border: "#44475a",
      },
      styles: {
        header: chalk.hex("#bd93f9").bold,
        subheader: chalk.hex("#ff79c6"),
        success: chalk.hex("#50fa7b"),
        warning: chalk.hex("#f1fa8c"),
        error: chalk.hex("#ff5555"),
        info: chalk.hex("#8be9fd"),
        muted: chalk.hex("#6272a4"),
        highlight: chalk.hex("#bd93f9").bold,
        code: chalk.hex("#f8f8f2").bgHex("#44475a"),
        prompt: chalk.hex("#bd93f9").bold,
        border: chalk.hex("#44475a"),
      },
    });

    // GitHub theme
    this.themes.set("github", {
      name: "GitHub",
      type: "light",
      colors: {
        primary: "#0969da",
        secondary: "#8250df",
        success: "#1a7f37",
        warning: "#9a6700",
        error: "#cf222e",
        info: "#0969da",
        muted: "#656d76",
        background: "#ffffff",
        foreground: "#24292f",
        accent: "#0969da",
        border: "#d0d7de",
      },
      styles: {
        header: chalk.hex("#0969da").bold,
        subheader: chalk.hex("#8250df"),
        success: chalk.hex("#1a7f37"),
        warning: chalk.hex("#9a6700"),
        error: chalk.hex("#cf222e"),
        info: chalk.hex("#0969da"),
        muted: chalk.hex("#656d76"),
        highlight: chalk.hex("#0969da").bold,
        code: chalk.hex("#24292f").bgHex("#f6f8fa"),
        prompt: chalk.hex("#0969da").bold,
        border: chalk.hex("#d0d7de"),
      },
    });

    // Monokai theme
    this.themes.set("monokai", {
      name: "Monokai",
      type: "dark",
      colors: {
        primary: "#f92672",
        secondary: "#ae81ff",
        success: "#a6e22e",
        warning: "#e6db74",
        error: "#f92672",
        info: "#66d9ef",
        muted: "#75715e",
        background: "#272822",
        foreground: "#f8f8f2",
        accent: "#f92672",
        border: "#49483e",
      },
      styles: {
        header: chalk.hex("#f92672").bold,
        subheader: chalk.hex("#ae81ff"),
        success: chalk.hex("#a6e22e"),
        warning: chalk.hex("#e6db74"),
        error: chalk.hex("#f92672"),
        info: chalk.hex("#66d9ef"),
        muted: chalk.hex("#75715e"),
        highlight: chalk.hex("#f92672").bold,
        code: chalk.hex("#f8f8f2").bgHex("#49483e"),
        prompt: chalk.hex("#f92672").bold,
        border: chalk.hex("#49483e"),
      },
    });
  }

  /**
   * Load user's preferred theme from preferences
   */
  private async loadUserTheme(): Promise<void> {
    try {
      await this.preferencesManager.initialize();
      const cliPrefs = this.preferencesManager.getCLIPreferences();
      const themeName = cliPrefs.theme;

      if (themeName && this.themes.has(themeName)) {
        this.currentTheme = this.themes.get(themeName)!;
      }
    } catch (error) {
      // Use default theme if preferences loading fails
      console.debug("Failed to load user theme preferences:", error);
    }
  }

  /**
   * Set the current theme
   */
  async setTheme(themeName: string): Promise<boolean> {
    const theme = this.themes.get(themeName);
    if (!theme) return false;

    this.currentTheme = theme;

    // Save to user preferences
    try {
      await this.preferencesManager.updateCLIPreferences({ theme: themeName });
    } catch (error) {
      console.debug("Failed to save theme preference:", error);
    }

    // Also save to config for backward compatibility
    if (this.configStore) {
      try {
        const config = await this.configStore.getConfig();
        config.cli = config.cli || {};
        (config.cli as any).theme = themeName;
        await this.configStore.saveConfig();
      } catch (error) {
        // Ignore config save errors
      }
    }

    return true;
  }

  /**
   * Get the current theme
   */
  getCurrentTheme(): CLITheme {
    return this.currentTheme;
  }

  /**
   * Get all available themes
   */
  getAvailableThemes(): CLITheme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get theme by name
   */
  getTheme(name: string): CLITheme | undefined {
    return this.themes.get(name);
  }

  /**
   * Create a styled banner
   */
  createBanner(title: string, subtitle?: string): string {
    const theme = this.currentTheme;
    let banner = "";

    // Title
    banner += theme.styles.header(`🦙 ${title}\n`);

    // Subtitle
    if (subtitle) {
      banner += theme.styles.muted(`   ${subtitle}\n`);
    }

    return banner;
  }

  /**
   * Create a styled section header
   */
  createSectionHeader(title: string): string {
    const theme = this.currentTheme;
    const border = "─".repeat(title.length + 4);

    return (
      `${theme.styles.border("┌" + border + "┐")}\n` +
      `${theme.styles.border("│")} ${theme.styles.header(title)} ${theme.styles.border("│")}\n` +
      `${theme.styles.border("└" + border + "┘")}`
    );
  }

  /**
   * Create a styled list item
   */
  createListItem(text: string, type: "info" | "success" | "warning" | "error" = "info"): string {
    const theme = this.currentTheme;
    const icons = {
      info: "•",
      success: "✓",
      warning: "⚠",
      error: "✗",
    };

    const icon = theme.styles[type](icons[type]);
    return `${icon} ${text}`;
  }

  /**
   * Create a styled progress bar
   */
  createProgressBar(current: number, total: number, width: number = 20): string {
    const theme = this.currentTheme;
    const percentage = Math.min(current / total, 1);
    const filled = Math.floor(percentage * width);
    const empty = width - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    const percent = Math.floor(percentage * 100);

    return `${theme.styles.border("[")}${theme.styles.success(bar)}${theme.styles.border("]")} ${percent}%`;
  }

  /**
   * Create a styled table
   */
  createTable(headers: string[], rows: string[][]): string {
    const theme = this.currentTheme;
    const colWidths = headers.map((header, i) =>
      Math.max(header.length, ...rows.map((row) => (row[i] || "").length))
    );

    let table = "";

    // Header
    const headerRow = headers
      .map((header, i) => theme.styles.header(header.padEnd(colWidths[i])))
      .join(" │ ");
    table += `│ ${headerRow} │\n`;

    // Separator
    const separator = colWidths.map((width) => "─".repeat(width)).join("─┼─");
    table += `├─${separator}─┤\n`;

    // Rows
    for (const row of rows) {
      const tableRow = row.map((cell, i) => (cell || "").padEnd(colWidths[i])).join(" │ ");
      table += `│ ${tableRow} │\n`;
    }

    return table;
  }

  /**
   * Auto-detect theme based on terminal background
   */
  autoDetectTheme(): string {
    // Simple heuristic: check if terminal supports colors
    if (!(chalk as any).supportsColor) {
      return "default";
    }

    // Check environment variables for theme hints
    const colorTerm = process.env.COLORTERM;
    const term = process.env.TERM;

    if (colorTerm === "truecolor" || term?.includes("256")) {
      // Terminal supports full colors, use default theme
      return "default";
    }

    return "default";
  }
}

// Export singleton instance
export const themeManager = new ThemeManager();
