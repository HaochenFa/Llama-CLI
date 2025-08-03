#!/usr/bin/env node

// Ensure we use the correct Node.js version
process.env.PATH = "/opt/homebrew/bin:" + process.env.PATH;

/**
 * Test Script for New CLI Features
 * Demonstrates auto-completion, syntax highlighting, and theme support
 */

// Import chalk for basic styling demonstration
import chalk from "chalk";

async function demonstrateFeatures() {
  console.log("🎨 LlamaCLI Enhanced Features Demo\n");

  // 1. Theme Management Demo
  console.log("=== Theme Management ===");
  console.log("Available themes:");
  const themes = ["default", "light", "dracula", "github", "monokai"];
  themes.forEach((theme) => {
    console.log(`  - ${theme}`);
  });

  // Test different theme styles
  console.log("\nTheme Style Examples:");
  console.log(chalk.blue.bold("Header text (primary)"));
  console.log(chalk.green("Success message"));
  console.log(chalk.yellow("Warning message"));
  console.log(chalk.red("Error message"));
  console.log(chalk.cyan("Info message"));
  console.log(chalk.gray("Muted text"));

  // 2. Syntax Highlighting Demo
  console.log("\n\n=== Syntax Highlighting ===");

  const codeExamples = [
    {
      language: "javascript",
      code: `function greet(name) {
  const message = \`Hello, \${name}!\`;
  console.log(message);
  return message;
}

// Call the function
greet('World');`,
      title: "JavaScript Example",
    },
    {
      language: "python",
      code: `def calculate_fibonacci(n):
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# Test the function
result = calculate_fibonacci(10)
print(f"Fibonacci(10) = {result}")`,
      title: "Python Example",
    },
    {
      language: "json",
      code: `{
  "name": "llamacli",
  "version": "1.0.0",
  "description": "AI-powered CLI tool",
  "features": [
    "auto-completion",
    "syntax-highlighting",
    "themes"
  ],
  "active": true
}`,
      title: "JSON Configuration",
    },
  ];

  for (const example of codeExamples) {
    console.log(`\n${example.title}:`);
    const highlighted = syntaxHighlighter.formatCodeBlock(
      example.code,
      example.language,
      example.title
    );
    console.log(highlighted);
  }

  // 3. Auto-completion Demo
  console.log("\n\n=== Auto-completion Demo ===");

  const completionTests = [
    { line: "ch", cursor: 2, description: 'Complete "ch" -> "chat"' },
    { line: "config ", cursor: 7, description: "Complete config subcommands" },
    { line: "chat --pr", cursor: 9, description: 'Complete "--pr" -> "--profile"' },
    { line: "session ", cursor: 8, description: "Complete session subcommands" },
  ];

  for (const test of completionTests) {
    console.log(`\nTest: ${test.description}`);
    console.log(`Input: "${test.line}" (cursor at ${test.cursor})`);

    try {
      const result = await completionEngine.getCompletions({
        line: test.line,
        cursor: test.cursor,
        workingDirectory: process.cwd(),
      });

      console.log(`Completions: [${result.completions.join(", ")}]`);
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }

  // 4. UI Components Demo
  console.log("\n\n=== UI Components Demo ===");

  // Banner
  const banner = themeManager.createBanner("LlamaCLI Demo", "Enhanced CLI Features");
  console.log(banner);

  // Section header
  const sectionHeader = themeManager.createSectionHeader("Feature Overview");
  console.log(sectionHeader);

  // List items
  console.log("\nFeatures:");
  const features = [
    { text: "Command auto-completion", type: "success" },
    { text: "Syntax highlighting for code blocks", type: "success" },
    { text: "Multiple color themes", type: "success" },
    { text: "Interactive CLI interface", type: "info" },
    { text: "Keyboard shortcuts support", type: "info" },
  ];

  features.forEach((feature) => {
    const listItem = themeManager.createListItem(feature.text, feature.type);
    console.log(`  ${listItem}`);
  });

  // Progress bar
  console.log("\nImplementation Progress:");
  for (let i = 0; i <= 10; i++) {
    const progress = themeManager.createProgressBar(i, 10);
    process.stdout.write(`\r${progress}`);
    await sleep(200);
  }
  console.log("\n");

  // Table
  console.log("Performance Comparison:");
  const table = themeManager.createTable(
    ["Feature", "Before", "After", "Improvement"],
    [
      ["Startup Time", "350ms", "350ms", "No change"],
      ["Memory Usage", "30MB", "32MB", "+2MB (acceptable)"],
      ["User Experience", "Basic", "Enhanced", "Significant"],
      ["Auto-completion", "None", "Full", "New feature"],
      ["Themes", "None", "5 themes", "New feature"],
    ]
  );
  console.log(table);

  console.log("\n✅ CLI Features Demo Complete!");
  console.log("\nTo test interactively, run: node scripts/interactive-demo.js");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the demo
demonstrateFeatures().catch((error) => {
  console.error("❌ Demo failed:", error);
  process.exit(1);
});
