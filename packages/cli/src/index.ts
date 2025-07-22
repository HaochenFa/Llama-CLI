#!/usr/bin/env node

/**
 * LlamaCLI - AI-powered command line development partner
 * Main entry point for the CLI application
 */

import { Command } from "commander";
import { ChatCommand } from "./commands/chat.js";
import { ConfigCommand } from "./commands/config.js";
import { GetCommand } from "./commands/get.js";
import { ConfigStore } from "@llamacli/core";
import { getErrorMessage } from "./utils/error-utils.js";

const program = new Command();

program
  .name("llamacli")
  .description("AI-powered command line development partner")
  .version("1.0.0");

// Initialize configuration store
let configStore: ConfigStore;

async function initializeConfig() {
  try {
    configStore = new ConfigStore();
    await configStore.initialize();
  } catch (error) {
    console.error("Failed to initialize configuration:", getErrorMessage(error));
    process.exit(1);
  }
}

// Chat command (default)
program
  .command("chat", { isDefault: true })
  .description("Start an interactive chat session")
  .option("-p, --profile <name>", "Use specific LLM profile")
  .option("-f, --file <path>", "Include file in context")
  .option("-d, --directory <path>", "Set working directory")
  .option("--no-tools", "Disable tool usage")
  .option("--yolo", "Auto-approve all tool calls")
  .action(async (options) => {
    await initializeConfig();
    const chatCommand = new ChatCommand(configStore);
    await chatCommand.run(options);
  });

// Quick query command
program
  .command("get <query>")
  .description("Quick query without interactive session")
  .option("-p, --profile <name>", "Use specific LLM profile")
  .option("-f, --file <path>", "Include file in context")
  .action(async (query, options) => {
    await initializeConfig();
    const getCommand = new GetCommand(configStore);
    await getCommand.run(query, options);
  });

// Configuration commands
const configCmd = program.command("config").description("Manage configuration");

configCmd
  .command("list")
  .description("List all profiles")
  .action(async () => {
    await initializeConfig();
    const configCommand = new ConfigCommand(configStore);
    await configCommand.listProfiles();
  });

configCmd
  .command("add <name>")
  .description("Add a new profile")
  .option("-t, --type <type>", "LLM type (ollama, openai, claude, vllm)")
  .option("-e, --endpoint <url>", "API endpoint")
  .option("-m, --model <name>", "Model name")
  .option("-k, --api-key <key>", "API key")
  .action(async (name, options) => {
    await initializeConfig();
    const configCommand = new ConfigCommand(configStore);
    await configCommand.addProfile(name, options);
  });

configCmd
  .command("use <name>")
  .description("Set active profile")
  .action(async (name) => {
    await initializeConfig();
    const configCommand = new ConfigCommand(configStore);
    await configCommand.setActiveProfile(name);
  });

configCmd
  .command("remove <name>")
  .description("Remove a profile")
  .action(async (name) => {
    await initializeConfig();
    const configCommand = new ConfigCommand(configStore);
    await configCommand.removeProfile(name);
  });

// Error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();
