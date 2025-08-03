#!/usr/bin/env node

/**
 * Interactive Demo for Enhanced CLI Features
 * Allows users to test the new CLI interface with all features enabled
 */

import { InteractiveCLI } from "../packages/cli/dist/ui/interactive-cli.js";

class CLIDemo {
  constructor() {
    this.cli = new InteractiveCLI({
      prompt: "demo> ",
      enableCompletion: true,
      enableSyntaxHighlighting: true,
      theme: "default",
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.cli.on("command", (command) => {
      this.handleCommand(command);
    });

    this.cli.on("exit", () => {
      console.log("\nGoodbye! 👋");
      process.exit(0);
    });
  }

  async handleCommand(command) {
    const { command: cmd, args, raw } = command;

    switch (cmd.toLowerCase()) {
      case "help":
        this.cli.showHelp();
        break;

      case "theme":
        await this.handleThemeCommand(args);
        break;

      case "highlight":
        this.handleHighlightCommand(args);
        break;

      case "demo":
        await this.handleDemoCommand(args);
        break;

      case "clear":
        this.cli.clearScreen();
        break;

      case "history":
        this.showHistory();
        break;

      case "features":
        this.showFeatures();
        break;

      case "exit":
      case "quit":
        this.cli.close();
        break;

      default:
        if (cmd) {
          this.cli.displayMessage(`Unknown command: ${cmd}`, "warning");
          this.cli.displayMessage('Type "help" for available commands', "info");
        }
        break;
    }

    this.cli.showPrompt();
  }

  async handleThemeCommand(args) {
    if (args.length === 0) {
      const themes = this.cli.getAvailableThemes();
      this.cli.displayMessage("Available themes:", "info");
      themes.forEach((theme) => {
        this.cli.displayMessage(`  - ${theme}`, "info");
      });
      return;
    }

    const themeName = args[0].toLowerCase();
    const success = await this.cli.setTheme(themeName);

    if (success) {
      this.cli.displayMessage(`Theme changed to: ${themeName}`, "success");
    } else {
      this.cli.displayMessage(`Theme not found: ${themeName}`, "error");
    }
  }

  handleHighlightCommand(args) {
    if (args.length === 0) {
      this.cli.displayMessage("Usage: highlight <language> [title]", "info");
      this.cli.displayMessage('Example: highlight javascript "My Code"', "info");
      return;
    }

    const language = args[0];
    const title = args.slice(1).join(" ") || `${language} code`;

    // Sample code for different languages
    const samples = {
      javascript: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));`,

      python: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

print(quicksort([3,6,8,10,1,2,1]))`,

      json: `{
  "name": "llamacli-demo",
  "version": "1.0.0",
  "features": {
    "autoCompletion": true,
    "syntaxHighlighting": true,
    "themes": ["default", "light", "dark"]
  }
}`,

      shell: `#!/bin/bash
for file in *.txt; do
    if [ -f "$file" ]; then
        echo "Processing $file"
        wc -l "$file"
    fi
done`,
    };

    const code = samples[language] || `// Sample ${language} code\nconsole.log("Hello, World!");`;
    this.cli.displayCode(code, language, title);
  }

  async handleDemoCommand(args) {
    const demoType = args[0] || "all";

    switch (demoType) {
      case "table":
        this.demoTable();
        break;
      case "list":
        this.demoList();
        break;
      case "progress":
        await this.demoProgress();
        break;
      case "all":
      default:
        this.demoTable();
        console.log();
        this.demoList();
        console.log();
        await this.demoProgress();
        break;
    }
  }

  demoTable() {
    this.cli.displayMessage("Table Demo:", "info");
    this.cli.displayTable(
      ["Command", "Description", "Status"],
      [
        ["chat", "Start interactive chat", "✅ Ready"],
        ["config", "Manage configuration", "✅ Ready"],
        ["session", "Manage sessions", "✅ Ready"],
        ["theme", "Change color theme", "🆕 New"],
        ["highlight", "Show syntax highlighting", "🆕 New"],
      ]
    );
  }

  demoList() {
    this.cli.displayMessage("List Demo:", "info");
    this.cli.displayList([
      { text: "Auto-completion is working", type: "success" },
      { text: "Syntax highlighting is enabled", type: "success" },
      { text: "Multiple themes available", type: "info" },
      { text: "Some features still in development", type: "warning" },
    ]);
  }

  async demoProgress() {
    this.cli.displayMessage("Progress Demo:", "info");

    for (let i = 0; i <= 20; i++) {
      this.cli.displayProgress(i, 20, "Loading");
      await this.sleep(100);
    }

    console.log();
  }

  showHistory() {
    const history = this.cli.getHistory();
    if (history.length === 0) {
      this.cli.displayMessage("No command history", "info");
      return;
    }

    this.cli.displayMessage("Command History:", "info");
    history.slice(-10).forEach((cmd, index) => {
      this.cli.displayMessage(`  ${index + 1}. ${cmd}`, "muted");
    });
  }

  showFeatures() {
    this.cli.displayMessage("Enhanced CLI Features:", "info");
    console.log();

    const features = [
      "🔤 Command Auto-completion",
      "  - Tab to complete commands, options, and file paths",
      "  - Context-aware suggestions",
      "  - Profile name completion",
      "",
      "🎨 Syntax Highlighting",
      "  - JavaScript, TypeScript, Python, JSON, Shell",
      "  - Customizable color themes",
      "  - Code block formatting",
      "",
      "🌈 Theme Support",
      "  - Multiple built-in themes (default, light, dracula, github, monokai)",
      "  - Automatic theme detection",
      "  - Persistent theme preferences",
      "",
      "⌨️  Keyboard Shortcuts",
      "  - Ctrl+L: Clear screen",
      "  - Ctrl+D: Exit",
      "  - Tab: Auto-complete",
      "  - ↑/↓: Command history",
      "",
      "📊 Enhanced UI Components",
      "  - Styled tables and lists",
      "  - Progress bars",
      "  - Section headers and banners",
    ];

    features.forEach((feature) => {
      if (feature.startsWith("  ")) {
        this.cli.displayMessage(feature, "muted");
      } else if (feature === "") {
        console.log();
      } else {
        this.cli.displayMessage(feature, "info");
      }
    });
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  start() {
    console.log("🚀 LlamaCLI Enhanced Features Interactive Demo");
    console.log("");
    console.log("Available demo commands:");
    console.log("  help      - Show all commands");
    console.log("  theme     - List/change themes");
    console.log("  highlight - Show syntax highlighting");
    console.log("  demo      - Show UI components");
    console.log("  features  - List all new features");
    console.log("  clear     - Clear screen");
    console.log("  history   - Show command history");
    console.log("  exit      - Exit demo");
    console.log("");
    console.log('Try typing "th" and press Tab for auto-completion!');
    console.log("");

    this.cli.start();
  }
}

// Start the demo
const demo = new CLIDemo();
demo.start();
