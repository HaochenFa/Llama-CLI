/**
 * Session management command for LlamaCLI
 */

import { Command } from "commander";
import { promises as fs } from "fs";
import path from "path";
import chalk from "chalk";

import {
  SessionManager,
  SessionHistoryManager,
  FileStorageBackend,
  SessionStatus,
  SessionPriority,
  SessionExportFormat,
  formatSessionDuration,
  getSessionStatusColor,
  getSessionPrioritySymbol,
  exportSession,
  importSession,
} from "@llamacli/core";
import type { SessionMetadata } from "@llamacli/core";

import { BaseCommand, BaseCommandOptions } from "./base.js";

/**
 * Session command options
 */
interface SessionCommandOptions extends BaseCommandOptions {
  format?: "table" | "json" | "yaml";
  status?: string[];
  priority?: string[];
  tags?: string[];
  limit?: number;
  export?: string;
  import?: string;
  output?: string;
  compress?: boolean;
  includeHistory?: boolean;
  includeContext?: boolean;
  includeMemories?: boolean;
}

/**
 * Session management command
 */
export class SessionCommand extends BaseCommand {
  private sessionManager: SessionManager | null = null;
  private historyManager: SessionHistoryManager | null = null;

  constructor() {
    super("session", "Manage chat sessions");
  }

  protected setupCommand(): void {
    // List sessions subcommand
    this.command
      .command("list")
      .alias("ls")
      .description("List all sessions")
      .option("-f, --format <format>", "output format (table, json, yaml)", "table")
      .option("-s, --status <status...>", "filter by status")
      .option("-p, --priority <priority...>", "filter by priority")
      .option("-t, --tags <tags...>", "filter by tags")
      .option("-l, --limit <number>", "limit number of results", parseInt)
      .action(this.createHandler(this.listSessions.bind(this)));

    // Show session details
    this.command
      .command("show <sessionId>")
      .description("Show detailed session information")
      .option("-f, --format <format>", "output format (table, json, yaml)", "table")
      .action(this.createHandler(this.showSession.bind(this)));

    // Switch to session
    this.command
      .command("switch <sessionId>")
      .alias("use")
      .description("Switch to a different session")
      .action(this.createHandler(this.switchSession.bind(this)));

    // Delete session
    this.command
      .command("delete <sessionId>")
      .alias("rm")
      .description("Delete a session")
      .option("-f, --force", "force deletion without confirmation")
      .action(this.createHandler(this.deleteSession.bind(this)));

    // Export session
    this.command
      .command("export <sessionId>")
      .description("Export session data")
      .option("-o, --output <file>", "output file path")
      .option("-f, --format <format>", "export format (json, yaml, markdown)", "json")
      .option("--compress", "compress exported data")
      .option("--no-history", "exclude chat history")
      .option("--no-context", "exclude context data")
      .option("--no-memories", "exclude memories")
      .action(this.createHandler(this.exportSession.bind(this)));

    // Import session
    this.command
      .command("import <file>")
      .description("Import session data")
      .option("-n, --name <name>", "session name")
      .option("--encryption-key <key>", "decryption key if data is encrypted")
      .action(this.createHandler(this.importSession.bind(this)));

    // Archive session
    this.command
      .command("archive <sessionId>")
      .description("Archive a session")
      .action(this.createHandler(this.archiveSession.bind(this)));

    // Restore session
    this.command
      .command("restore <sessionId>")
      .description("Restore an archived session")
      .action(this.createHandler(this.restoreSession.bind(this)));

    // Session statistics
    this.command
      .command("stats")
      .description("Show session statistics")
      .option("-f, --format <format>", "output format (table, json)", "table")
      .action(this.createHandler(this.showStats.bind(this)));

    // Clean up old sessions
    this.command
      .command("cleanup")
      .description("Clean up old and unused sessions")
      .option("--max-age <days>", "maximum age in days", parseInt)
      .option("--max-sessions <number>", "maximum number of sessions to keep", parseInt)
      .option("--dry-run", "show what would be deleted without actually deleting")
      .action(this.createHandler(this.cleanupSessions.bind(this)));

    // Create session branch
    this.command
      .command("branch <sessionId> <branchName>")
      .description("Create a branch from an existing session")
      .option("-d, --description <desc>", "branch description")
      .option("-m, --message-index <index>", "branch from specific message index", parseInt)
      .option("--copy-context", "copy context to branch")
      .option("--copy-memories", "copy memories to branch")
      .action(this.createHandler(this.createBranch.bind(this)));

    // List session branches
    this.command
      .command("branches <sessionId>")
      .description("List branches for a session")
      .option("-f, --format <format>", "output format (table, json)", "table")
      .action(this.createHandler(this.listBranches.bind(this)));
  }

  protected async execute(options: BaseCommandOptions): Promise<void> {
    // Initialize session manager
    await this.initializeSessionManager();
  }

  private async initializeSessionManager(): Promise<void> {
    const storageBackend = new FileStorageBackend();
    await storageBackend.initialize();

    this.sessionManager = new SessionManager({
      storageBackend,
      autoSaveInterval: 30000,
      maxSessionAge: 30 * 24 * 60 * 60 * 1000,
      maxActiveSessions: 10,
      compressionThreshold: 1024 * 1024,
      enableBranching: true,
      enableAutoCleanup: true,
      backupEnabled: true,
      backupInterval: 60 * 60 * 1000,
    });

    this.historyManager = new SessionHistoryManager(storageBackend);

    await this.sessionManager.initialize();
  }

  private async listSessions(options: SessionCommandOptions): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }

    const filter: any = {};

    if (options.status) {
      filter.status = options.status.map((s) => s.toUpperCase() as SessionStatus);
    }

    if (options.priority) {
      filter.priority = options.priority.map((p) => p.toUpperCase() as SessionPriority);
    }

    if (options.tags) {
      filter.tags = options.tags;
    }

    if (options.limit) {
      filter.limit = options.limit;
    }

    const result = await this.sessionManager.listSessions(filter);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to list sessions");
    }

    const sessions = result.data;

    if (sessions.length === 0) {
      this.logger.info("No sessions found");
      return;
    }

    switch (options.format) {
      case "json":
        console.log(JSON.stringify(sessions, null, 2));
        break;
      case "yaml":
        // Simple YAML output
        console.log("sessions:");
        for (const session of sessions) {
          console.log(`  - id: ${session.id}`);
          console.log(`    name: "${session.name}"`);
          console.log(`    status: ${session.status}`);
          console.log(`    priority: ${session.priority}`);
          console.log(`    created: ${new Date(session.createdAt).toISOString()}`);
        }
        break;
      default:
        this.displaySessionsTable(sessions);
    }
  }

  private async showSession(options: SessionCommandOptions, sessionId: string): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }

    const result = await this.sessionManager.loadSession(sessionId);
    if (!result.success || !result.data) {
      throw new Error(result.error || `Session ${sessionId} not found`);
    }

    const session = result.data;

    switch (options.format) {
      case "json":
        console.log(JSON.stringify(session.metadata, null, 2));
        break;
      case "yaml":
        this.displaySessionYaml(session.metadata);
        break;
      default:
        this.displaySessionDetails(session.metadata);
    }
  }

  private async switchSession(options: SessionCommandOptions, sessionId: string): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }

    const result = await this.sessionManager.switchToSession(sessionId);
    if (!result.success) {
      throw new Error(result.error || `Failed to switch to session ${sessionId}`);
    }

    this.logger.info(`Switched to session: ${chalk.green(sessionId)}`);
  }

  private async deleteSession(
    options: SessionCommandOptions & { force?: boolean },
    sessionId: string
  ): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }

    if (!options.force) {
      const confirmed = await this.confirm(`Delete session ${sessionId}?`, false);
      if (!confirmed) {
        this.logger.info("Deletion cancelled");
        return;
      }
    }

    const result = await this.sessionManager.deleteSession(sessionId);
    if (!result.success) {
      throw new Error(result.error || `Failed to delete session ${sessionId}`);
    }

    this.logger.info(`Session ${chalk.red(sessionId)} deleted`);
  }

  private async exportSession(options: SessionCommandOptions, sessionId: string): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }

    const loadResult = await this.sessionManager.loadSession(sessionId);
    if (!loadResult.success || !loadResult.data) {
      throw new Error(loadResult.error || `Session ${sessionId} not found`);
    }

    const session = loadResult.data;
    const persistedSession = {
      metadata: session.metadata,
      context: session.context,
      chatHistory: session.chatHistory,
      contextItems: session.contextItems,
      memories: session.memories,
      settings: session.settings,
    };

    const exportOptions = {
      format: (options.format as SessionExportFormat) || SessionExportFormat.JSON,
      includeHistory: options.includeHistory !== false,
      includeContext: options.includeContext !== false,
      includeMemories: options.includeMemories !== false,
      compress: options.compress || false,
    };

    const exportedData = await exportSession(persistedSession, exportOptions);

    if (options.output) {
      await fs.writeFile(options.output, exportedData, "utf8");
      this.logger.info(`Session exported to: ${chalk.green(options.output)}`);
    } else {
      console.log(exportedData);
    }
  }

  private async importSession(
    options: SessionCommandOptions & { name?: string; encryptionKey?: string },
    file: string
  ): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }

    const data = await fs.readFile(file, "utf8");
    const importResult = await importSession(data, options.encryptionKey);

    if (!importResult.success) {
      throw new Error(`Import failed: ${importResult.errors.join(", ")}`);
    }

    if (importResult.warnings.length > 0) {
      for (const warning of importResult.warnings) {
        this.logger.warn(warning);
      }
    }

    this.logger.info(`Session imported successfully: ${chalk.green(importResult.sessionId)}`);
  }

  private async archiveSession(options: SessionCommandOptions, sessionId: string): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }

    const result = await this.sessionManager.updateSessionStatus(sessionId, SessionStatus.ARCHIVED);
    if (!result.success) {
      throw new Error(result.error || `Failed to archive session ${sessionId}`);
    }

    this.logger.info(`Session ${chalk.yellow(sessionId)} archived`);
  }

  private async restoreSession(options: SessionCommandOptions, sessionId: string): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }

    const result = await this.sessionManager.updateSessionStatus(sessionId, SessionStatus.ACTIVE);
    if (!result.success) {
      throw new Error(result.error || `Failed to restore session ${sessionId}`);
    }

    this.logger.info(`Session ${chalk.green(sessionId)} restored`);
  }

  private async showStats(options: SessionCommandOptions): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }

    // Get storage stats
    const storageBackend = new FileStorageBackend();
    const stats = await storageBackend.getStorageStats();

    if (options.format === "json") {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    // Display stats table
    console.log(chalk.bold("\n📊 Session Statistics\n"));

    console.log(`Total Sessions: ${chalk.cyan(stats.totalSessions)}`);
    console.log(`Total Size: ${chalk.cyan(this.formatSize(stats.totalSize))}`);
    console.log(`Average Size: ${chalk.cyan(this.formatSize(stats.averageSessionSize))}`);

    if (stats.totalSessions > 0) {
      console.log(
        `Oldest Session: ${chalk.gray(new Date(stats.oldestSession).toLocaleDateString())}`
      );
      console.log(
        `Newest Session: ${chalk.gray(new Date(stats.newestSession).toLocaleDateString())}`
      );
    }

    console.log(chalk.bold("\nBy Status:"));
    for (const [status, count] of Object.entries(stats.sessionsByStatus)) {
      if (count > 0) {
        const color = getSessionStatusColor(status as SessionStatus);
        console.log(`  ${status}: ${chalk.hex(color)(count)}`);
      }
    }

    console.log(chalk.bold("\nBy Priority:"));
    for (const [priority, count] of Object.entries(stats.sessionsByPriority)) {
      if (count > 0) {
        const symbol = getSessionPrioritySymbol(priority as SessionPriority);
        console.log(`  ${symbol} ${priority}: ${chalk.cyan(count)}`);
      }
    }
  }

  private async cleanupSessions(
    options: SessionCommandOptions & { maxAge?: number; maxSessions?: number; dryRun?: boolean }
  ): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }

    const storageBackend = new FileStorageBackend();
    const cleanupOptions: any = {
      dryRun: options.dryRun || false,
    };

    if (options.maxAge) {
      cleanupOptions.maxAge = options.maxAge * 24 * 60 * 60 * 1000; // Convert days to ms
    }

    if (options.maxSessions) {
      cleanupOptions.maxSessions = options.maxSessions;
    }

    const result = await storageBackend.cleanup(cleanupOptions);

    if (options.dryRun) {
      this.logger.info(`Would remove ${chalk.yellow(result.sessionsRemoved)} sessions`);
      this.logger.info(`Would free ${chalk.yellow(this.formatSize(result.spaceFreed))} of space`);
    } else {
      this.logger.info(`Removed ${chalk.red(result.sessionsRemoved)} sessions`);
      this.logger.info(`Freed ${chalk.green(this.formatSize(result.spaceFreed))} of space`);
    }

    if (result.errors.length > 0) {
      this.logger.warn("Cleanup errors:");
      for (const error of result.errors) {
        this.logger.warn(`  ${error}`);
      }
    }
  }

  private async createBranch(
    options: SessionCommandOptions & {
      description?: string;
      messageIndex?: number;
      copyContext?: boolean;
      copyMemories?: boolean;
    },
    sessionId: string,
    branchName: string
  ): Promise<void> {
    if (!this.historyManager) {
      throw new Error("History manager not initialized");
    }

    const branchOptions = {
      name: branchName,
      description: options.description,
      fromMessageIndex: options.messageIndex,
      copyContext: options.copyContext || false,
      copyMemories: options.copyMemories || false,
    };

    const branchSessionId = await this.historyManager.createBranch(sessionId, branchOptions);
    this.logger.info(`Created branch: ${chalk.green(branchSessionId)}`);
  }

  private async listBranches(options: SessionCommandOptions, sessionId: string): Promise<void> {
    if (!this.historyManager) {
      throw new Error("History manager not initialized");
    }

    const branches = await this.historyManager.getSessionBranches(sessionId);

    if (branches.length === 0) {
      this.logger.info("No branches found for this session");
      return;
    }

    if (options.format === "json") {
      console.log(JSON.stringify(branches, null, 2));
      return;
    }

    console.log(chalk.bold(`\n🌿 Branches for session ${sessionId}\n`));

    for (const branch of branches) {
      console.log(`${chalk.green(branch.id)} - ${chalk.bold(branch.name)}`);
      if (branch.description) {
        console.log(`  ${chalk.gray(branch.description)}`);
      }
      console.log(`  Created: ${chalk.gray(new Date(branch.createdAt).toLocaleString())}`);
      console.log(`  Branch point: message ${chalk.cyan(branch.branchPoint)}`);
      console.log();
    }
  }

  // Helper methods for display
  private displaySessionsTable(sessions: SessionMetadata[]): void {
    console.log(chalk.bold("\n📋 Sessions\n"));

    const maxNameLength = Math.max(20, Math.max(...sessions.map((s) => s.name.length)));
    const maxIdLength = Math.max(10, Math.max(...sessions.map((s) => s.id.length)));

    // Header
    console.log(
      chalk.bold(
        `${"ID".padEnd(maxIdLength)} ${"Name".padEnd(maxNameLength)} ${"Status".padEnd(10)} ${"Priority".padEnd(8)} ${"Created".padEnd(12)} ${"Messages".padEnd(8)}`
      )
    );
    console.log("-".repeat(maxIdLength + maxNameLength + 50));

    // Rows
    for (const session of sessions) {
      const statusColor = getSessionStatusColor(session.status);
      const prioritySymbol = getSessionPrioritySymbol(session.priority);
      const createdDate = new Date(session.createdAt).toLocaleDateString();

      console.log(
        `${chalk.cyan(session.id.padEnd(maxIdLength))} ${session.name.padEnd(maxNameLength)} ${chalk.hex(statusColor)(session.status.padEnd(10))} ${prioritySymbol} ${session.priority.padEnd(7)} ${chalk.gray(createdDate.padEnd(12))} ${chalk.yellow(session.stats.messageCount.toString().padEnd(8))}`
      );
    }

    console.log();
  }

  private displaySessionDetails(metadata: SessionMetadata): void {
    console.log(chalk.bold(`\n📄 Session Details\n`));

    console.log(`ID: ${chalk.cyan(metadata.id)}`);
    console.log(`Name: ${chalk.bold(metadata.name)}`);
    if (metadata.description) {
      console.log(`Description: ${metadata.description}`);
    }

    const statusColor = getSessionStatusColor(metadata.status);
    const prioritySymbol = getSessionPrioritySymbol(metadata.priority);

    console.log(`Status: ${chalk.hex(statusColor)(metadata.status)}`);
    console.log(`Priority: ${prioritySymbol} ${metadata.priority}`);

    console.log(`Created: ${chalk.gray(new Date(metadata.createdAt).toLocaleString())}`);
    console.log(`Last Activity: ${chalk.gray(new Date(metadata.lastActivity).toLocaleString())}`);

    if (metadata.completedAt) {
      console.log(`Completed: ${chalk.gray(new Date(metadata.completedAt).toLocaleString())}`);
    }

    const duration = formatSessionDuration(metadata.lastActivity - metadata.createdAt);
    console.log(`Duration: ${chalk.yellow(duration)}`);

    console.log(`Working Directory: ${chalk.gray(metadata.workingDirectory)}`);
    console.log(`Profile: ${chalk.cyan(metadata.activeProfile)}`);

    if (metadata.tags.length > 0) {
      console.log(`Tags: ${metadata.tags.map((tag) => chalk.blue(`#${tag}`)).join(" ")}`);
    }

    console.log(chalk.bold("\nStatistics:"));
    console.log(`  Messages: ${chalk.yellow(metadata.stats.messageCount)}`);
    console.log(`  Tool Calls: ${chalk.yellow(metadata.stats.toolCallCount)}`);
    console.log(`  Tokens Used: ${chalk.yellow(metadata.stats.totalTokensUsed)}`);

    if (metadata.branches.length > 0) {
      console.log(chalk.bold("\nBranches:"));
      for (const branch of metadata.branches) {
        console.log(`  ${chalk.green(branch.name)} (${branch.id})`);
      }
    }

    console.log();
  }

  private displaySessionYaml(metadata: SessionMetadata): void {
    console.log("session:");
    console.log(`  id: ${metadata.id}`);
    console.log(`  name: "${metadata.name}"`);
    if (metadata.description) {
      console.log(`  description: "${metadata.description}"`);
    }
    console.log(`  status: ${metadata.status}`);
    console.log(`  priority: ${metadata.priority}`);
    console.log(`  created: ${new Date(metadata.createdAt).toISOString()}`);
    console.log(`  lastActivity: ${new Date(metadata.lastActivity).toISOString()}`);
    console.log(`  workingDirectory: "${metadata.workingDirectory}"`);
    console.log(`  activeProfile: "${metadata.activeProfile}"`);

    if (metadata.tags.length > 0) {
      console.log("  tags:");
      for (const tag of metadata.tags) {
        console.log(`    - ${tag}`);
      }
    }

    console.log("  stats:");
    console.log(`    messageCount: ${metadata.stats.messageCount}`);
    console.log(`    toolCallCount: ${metadata.stats.toolCallCount}`);
    console.log(`    totalTokensUsed: ${metadata.stats.totalTokensUsed}`);
  }

  protected async cleanup(): Promise<void> {
    if (this.sessionManager) {
      await this.sessionManager.shutdown();
    }
  }
}
