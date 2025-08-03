#!/usr/bin/env node

/**
 * Enhanced Test Runner Script
 *
 * Provides various test execution modes with proper environment setup
 */

import { execSync, spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(title) {
  console.log("\n" + colorize("=".repeat(60), "cyan"));
  console.log(colorize(`🧪 ${title}`, "bright"));
  console.log(colorize("=".repeat(60), "cyan") + "\n");
}

function printSection(title) {
  console.log(colorize(`\n📋 ${title}`, "yellow"));
  console.log(colorize("-".repeat(40), "yellow"));
}

// Test execution functions
function runAllTests() {
  printHeader("Running All Tests");

  try {
    execSync("npm test -- --run", {
      cwd: rootDir,
      stdio: "inherit",
    });
    console.log(colorize("\n✅ All tests completed successfully!", "green"));
  } catch (error) {
    console.log(colorize("\n❌ Some tests failed. Check output above.", "red"));
    process.exit(1);
  }
}

function runTestsWithCoverage() {
  printHeader("Running Tests with Coverage");

  try {
    execSync("npm run test:coverage", {
      cwd: rootDir,
      stdio: "inherit",
    });
    console.log(colorize("\n✅ Coverage report generated successfully!", "green"));
  } catch (error) {
    console.log(colorize("\n❌ Coverage generation failed.", "red"));
    process.exit(1);
  }
}

function runCoreTests() {
  printHeader("Running Core Package Tests");

  try {
    execSync("npm test --workspace=@llamacli/core -- --run", {
      cwd: rootDir,
      stdio: "inherit",
    });
    console.log(colorize("\n✅ Core tests completed successfully!", "green"));
  } catch (error) {
    console.log(colorize("\n❌ Core tests failed.", "red"));
    process.exit(1);
  }
}

function runCliTests() {
  printHeader("Running CLI Package Tests");

  try {
    execSync("npm test --workspace=@llamacli/cli -- --run", {
      cwd: rootDir,
      stdio: "inherit",
    });
    console.log(colorize("\n✅ CLI tests completed successfully!", "green"));
  } catch (error) {
    console.log(colorize("\n❌ CLI tests failed.", "red"));
    process.exit(1);
  }
}

function runWatchMode() {
  printHeader("Running Tests in Watch Mode");

  console.log(colorize("Press Ctrl+C to exit watch mode\n", "yellow"));

  const child = spawn("npm", ["test"], {
    cwd: rootDir,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    console.log(colorize(`\nWatch mode exited with code ${code}`, "blue"));
  });
}

function runSpecificTest(testPattern) {
  printHeader(`Running Tests Matching: ${testPattern}`);

  try {
    execSync(`npm test -- --run "${testPattern}"`, {
      cwd: rootDir,
      stdio: "inherit",
    });
    console.log(colorize("\n✅ Specific tests completed successfully!", "green"));
  } catch (error) {
    console.log(colorize("\n❌ Specific tests failed.", "red"));
    process.exit(1);
  }
}

function validateInfrastructure() {
  printHeader("Validating Testing Infrastructure");

  try {
    execSync("npm run test:validate", {
      cwd: rootDir,
      stdio: "inherit",
    });
  } catch (error) {
    console.log(colorize("\n❌ Infrastructure validation failed.", "red"));
    process.exit(1);
  }
}

function showHelp() {
  printHeader("Test Runner Help");

  console.log(colorize("Available commands:", "bright"));
  console.log("");
  console.log(colorize("  all", "green") + "           Run all tests");
  console.log(colorize("  coverage", "green") + "      Run tests with coverage report");
  console.log(colorize("  core", "green") + "          Run core package tests only");
  console.log(colorize("  cli", "green") + "           Run CLI package tests only");
  console.log(colorize("  watch", "green") + "         Run tests in watch mode");
  console.log(colorize("  validate", "green") + "      Validate testing infrastructure");
  console.log(colorize("  help", "green") + "          Show this help message");
  console.log("");
  console.log(colorize("Examples:", "bright"));
  console.log("  node scripts/run-tests.js all");
  console.log("  node scripts/run-tests.js coverage");
  console.log("  node scripts/run-tests.js core");
  console.log('  node scripts/run-tests.js "config.test.ts"');
  console.log("");
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  switch (command) {
    case "all":
      runAllTests();
      break;
    case "coverage":
      runTestsWithCoverage();
      break;
    case "core":
      runCoreTests();
      break;
    case "cli":
      runCliTests();
      break;
    case "watch":
      runWatchMode();
      break;
    case "validate":
      validateInfrastructure();
      break;
    case "help":
    case "--help":
    case "-h":
      showHelp();
      break;
    default:
      // Treat as test pattern
      runSpecificTest(command);
      break;
  }
}

main();
