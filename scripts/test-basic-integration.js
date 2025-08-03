#!/usr/bin/env node

// Ensure we use the correct Node.js version
process.env.PATH = "/opt/homebrew/bin:" + process.env.PATH;

/**
 * Basic Integration Test for CLI Features
 * Tests basic functionality without full build
 */

import { spawn } from "child_process";

async function testBasicIntegration() {
  console.log("🧪 Testing Basic CLI Integration\n");

  // Test 1: Help command
  console.log("Testing help command...");
  try {
    const result = await runCommand(["--help"]);
    if (result.exitCode === 0 && result.stdout.includes("llamacli")) {
      console.log("✅ Help command works");
    } else {
      console.log("❌ Help command failed");
      console.log("STDOUT:", result.stdout);
      console.log("STDERR:", result.stderr);
    }
  } catch (error) {
    console.log("❌ Help command error:", error.message);
  }

  // Test 2: Version command
  console.log("\nTesting version command...");
  try {
    const result = await runCommand(["--version"]);
    if (result.exitCode === 0 && result.stdout.includes("1.0.0")) {
      console.log("✅ Version command works");
    } else {
      console.log("❌ Version command failed");
      console.log("STDOUT:", result.stdout);
      console.log("STDERR:", result.stderr);
    }
  } catch (error) {
    console.log("❌ Version command error:", error.message);
  }

  // Test 3: Check if interactive flag is available
  console.log("\nTesting interactive flag availability...");
  try {
    const result = await runCommand(["--help"]);
    if (result.exitCode === 0 && result.stdout.includes("--interactive")) {
      console.log("✅ Interactive flag is available");
    } else {
      console.log("❌ Interactive flag not found in help");
      // Let's check what's actually in the help output
      console.log("Help output contains:");
      console.log(result.stdout);
    }
  } catch (error) {
    console.log("❌ Interactive flag test error:", error.message);
  }

  console.log("\n🎯 Basic integration test completed!");
}

/**
 * Run a CLI command and return result
 */
function runCommand(args) {
  return new Promise((resolve, reject) => {
    // Use the built JavaScript version if available, otherwise use source
    const commandPath = "packages/cli/dist/index.js";

    const child = spawn("node", [commandPath, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Command timeout after 5 seconds"));
    }, 5000);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// Run the test
testBasicIntegration().catch((error) => {
  console.error("❌ Basic integration test failed:", error);
  process.exit(1);
});
