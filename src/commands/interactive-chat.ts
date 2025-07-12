import { ConfigStore } from "../lib/config-store.js";
import { ContextCompiler } from "../lib/context-compiler.js";
import { AdapterFactory } from "../lib/adapters/adapter-factory.js";
import { ToolDispatcher } from "../lib/tool-dispatcher.js";
import { FileContextManager } from "../lib/file-context-manager.js";
import { ThinkingRenderer } from "../lib/thinking-renderer.js";
import { StreamProcessor } from "../lib/stream-processor.js";
import {
  InternalContext,
  ChatMessage,
  ToolCallPayload,
  StreamingToolCall,
  ToolCall,
} from "../types/context.js";
import chalk from "chalk";
import readline from "readline";
import inquirer from "inquirer";
import * as crypto from "crypto";

export class InteractiveChatSession {
  private configStore: ConfigStore;
  private contextCompiler: ContextCompiler;
  private toolDispatcher: ToolDispatcher;
  private fileContextManager: FileContextManager;
  private thinkingRenderer: ThinkingRenderer;
  private streamProcessor: StreamProcessor;
  private internalContext: InternalContext;
  private rl: readline.Interface;
  private llmAdapter: any;
  private debug: boolean;
  private mode: "agent" | "pure" = "agent"; // Default to agent mode

  constructor(debug: boolean = false) {
    this.configStore = new ConfigStore();
    this.contextCompiler = new ContextCompiler();
    this.toolDispatcher = new ToolDispatcher([]);
    this.fileContextManager = new FileContextManager();
    this.thinkingRenderer = new ThinkingRenderer();
    this.streamProcessor = new StreamProcessor(this.thinkingRenderer);
    this.debug = debug;

    this.internalContext = {
      long_term_memory: [],
      available_tools: this.toolDispatcher.availableTools,
      file_context: [],
      chat_history: [],
      current_working_directory: process.cwd(),
    };

    // Initialize readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      history: [], // Enable command history
      historySize: 100,
    });
  }

  public async start(): Promise<void> {
    // Check for current profile
    const currentProfile = this.configStore.getCurrentProfile();
    if (!currentProfile) {
      console.error(chalk.red("❌ Error: No LLM profile is currently active."));
      console.log(
        chalk.blue(
          '💡 Tip: Use "llama-cli config add" to add a profile and "llama-cli config use" to set it as current.'
        )
      );
      console.log(chalk.blue('💡 See "llama-cli config templates" for configuration examples.'));
      process.exit(1);
    }

    // Initialize LLM adapter
    try {
      this.llmAdapter = AdapterFactory.createAdapter(currentProfile, this.debug);
    } catch (error) {
      console.error(
        chalk.red(`❌ Error: Failed to initialize LLM adapter: ${(error as Error).message}`)
      );
      console.log(
        chalk.blue(`💡 Tip: Please check your configuration with 'llama-cli config list'.`)
      );
      process.exit(1);
    }

    // Welcome message
    console.log(chalk.bold.blue("🚀 LlamaCLI Interactive Chat Session"));
    console.log(chalk.gray(`Connected to: ${currentProfile.name} (${currentProfile.type})`));
    console.log(chalk.gray("Type your message and press Enter. Use Ctrl+C to exit."));
    console.log(chalk.gray("Commands: /help for available slash commands"));
    console.log();

    // Start the interactive loop
    await this.chatLoop();
  }

  private async chatLoop(): Promise<void> {
    while (true) {
      try {
        const prompt = this.generatePrompt();
        const userInput = await this.getUserInput(prompt);

        if (!userInput.trim()) {
          continue; // Skip empty input
        }

        // Check for slash commands
        if (userInput.startsWith("/")) {
          await this.handleSlashCommand(userInput);
          continue;
        }

        // Process regular chat message
        await this.processUserMessage(userInput);
      } catch (error) {
        if ((error as any).code === "SIGINT") {
          console.log(chalk.blue("\n👋 Goodbye!"));
          break;
        }
        console.error(chalk.red(`❌ Error: ${(error as Error).message}`));
      }
    }

    this.rl.close();
  }

  private generatePrompt(): string {
    let prompt = "❯";

    // Add context indicators
    const indicators = [];

    if (this.internalContext.file_context.length > 0) {
      indicators.push(`@+${this.internalContext.file_context.length}`);
    }

    if (this.internalContext.long_term_memory.length > 0) {
      indicators.push("mem");
    }

    // Add mode indicator
    if (this.mode === "pure") {
      indicators.push("pure");
    }

    if (indicators.length > 0) {
      prompt += ` [${indicators.join(", ")}]`;
    }

    return prompt + " ";
  }

  private getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });

      // Handle Ctrl+C
      this.rl.on("SIGINT", () => {
        reject(new Error("SIGINT"));
      });
    });
  }

  private async handleSlashCommand(command: string): Promise<void> {
    const parts = command.slice(1).split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "help":
        this.showHelp();
        break;
      case "context":
        await this.handleContextCommand(args);
        break;
      case "files":
        await this.handleFilesCommand(args);
        break;
      case "mode":
        await this.handleModeCommand(args);
        break;
      case "memory":
        await this.handleMemoryCommand(args);
        break;
      case "compress":
        await this.handleCompressCommand();
        break;
      case "think":
        await this.handleThinkCommand(args);
        break;
      case "exit":
      case "quit":
        console.log(chalk.blue("👋 Goodbye!"));
        process.exit(0);
      default:
        console.log(chalk.red(`❌ Unknown command: /${cmd}`));
        console.log(chalk.blue("💡 Tip: Use /help to see available commands"));
    }
  }

  private showHelp(): void {
    console.log(chalk.bold("📚 Available Commands:"));
    console.log(chalk.cyan("  /help") + chalk.gray("                    - Show this help message"));
    console.log(
      chalk.cyan("  /context view") + chalk.gray("            - View current context information")
    );
    console.log(
      chalk.cyan("  /context clear") + chalk.gray("           - Clear chat history and context")
    );
    console.log(chalk.cyan("  /files list") + chalk.gray("              - List loaded files"));
    console.log(chalk.cyan("  /files clear") + chalk.gray("             - Clear all loaded files"));
    console.log(
      chalk.cyan("  /mode <agent|pure>") +
        chalk.gray("       - Switch between agent and pure chat modes")
    );
    console.log(
      chalk.cyan("  /memory <add|list|clear>") + chalk.gray("  - Manage long-term memory")
    );
    console.log(chalk.cyan("  /compress") + chalk.gray("               - Compress chat history"));
    console.log(
      chalk.cyan("  /think [list|<num>|on|off|clear]") + chalk.gray(" - Manage thinking display")
    );
    console.log(chalk.cyan("  /exit, /quit") + chalk.gray("             - Exit the chat session"));
    console.log();
    console.log(chalk.bold("💡 Tips:"));
    console.log(chalk.gray("  • Use @filename to load file context (e.g., @src/main.ts)"));
    console.log(chalk.gray('  • Multiple files: @file1.js @file2.ts "analyze these files"'));
    console.log(chalk.gray("  • Press Ctrl+C to exit"));
    console.log();
  }

  private async handleContextCommand(args: string[]): Promise<void> {
    const subCmd = args[0]?.toLowerCase() || "view";

    switch (subCmd) {
      case "view":
        this.showContext();
        break;
      case "clear":
        await this.clearContext();
        break;
      default:
        console.log(chalk.red(`❌ Unknown context command: ${subCmd}`));
        console.log(chalk.blue("💡 Tip: Use /context view or /context clear"));
    }
  }

  private showContext(): void {
    console.log(chalk.bold("📋 Current Context:"));
    console.log();

    console.log(chalk.cyan("Working Directory:"));
    console.log(chalk.gray(`  ${this.internalContext.current_working_directory}`));
    console.log();

    console.log(chalk.cyan("Available Tools:"));
    if (this.internalContext.available_tools.length > 0) {
      this.internalContext.available_tools.forEach((tool) => {
        console.log(chalk.gray(`  • ${tool.name}: ${tool.description}`));
      });
    } else {
      console.log(chalk.gray("  No tools available"));
    }
    console.log();

    console.log(chalk.cyan("File Context:"));
    if (this.internalContext.file_context.length > 0) {
      this.internalContext.file_context.forEach((file) => {
        const displayName = this.fileContextManager.getDisplayName(file);
        const size = Math.round(file.content.length / 1024);
        console.log(chalk.gray(`  • ${displayName} (${size}KB)`));
      });
    } else {
      console.log(chalk.gray("  No files loaded"));
      console.log(chalk.gray("  💡 Use @filename to load files"));
    }
    console.log();

    console.log(chalk.cyan("Chat History:"));
    console.log(chalk.gray(`  ${this.internalContext.chat_history.length} messages`));
    console.log();
  }

  private async handleFilesCommand(args: string[]): Promise<void> {
    const subCmd = args[0]?.toLowerCase() || "list";

    switch (subCmd) {
      case "list":
        this.listLoadedFiles();
        break;
      case "clear":
        this.clearLoadedFiles();
        break;
      default:
        console.log(chalk.red(`❌ Unknown files command: ${subCmd}`));
        console.log(chalk.blue("💡 Tip: Use /files list or /files clear"));
    }
  }

  private listLoadedFiles(): void {
    console.log(chalk.bold("📁 Loaded Files:"));

    if (this.internalContext.file_context.length === 0) {
      console.log(chalk.gray("  No files currently loaded"));
      console.log(chalk.gray("  💡 Use @filename to load files"));
    } else {
      this.internalContext.file_context.forEach((file, index) => {
        const displayName = this.fileContextManager.getDisplayName(file);
        const size = Math.round(file.content.length / 1024);
        console.log(chalk.cyan(`  ${index + 1}. ${displayName}`) + chalk.gray(` (${size}KB)`));
      });

      const totalSize = this.internalContext.file_context.reduce(
        (sum, file) => sum + file.content.length,
        0
      );
      console.log();
      console.log(
        chalk.gray(
          `  Total: ${this.internalContext.file_context.length} files, ${Math.round(
            totalSize / 1024
          )}KB`
        )
      );
    }
    console.log();
  }

  private clearLoadedFiles(): void {
    const count = this.internalContext.file_context.length;
    this.internalContext.file_context = [];

    if (count > 0) {
      console.log(chalk.green(`✅ Cleared ${count} file(s) from context`));
    } else {
      console.log(chalk.yellow("⚠️  No files to clear"));
    }
    console.log();
  }

  private async processUserMessage(userInput: string): Promise<void> {
    // Parse @-syntax for file context loading
    const { filePaths, cleanedInput } = this.fileContextManager.parseAtSyntax(userInput);

    // Load new files if any @-syntax was found
    if (filePaths.length > 0) {
      console.log(chalk.blue(`📂 Loading ${filePaths.length} file(s)...`));
      const newFiles = await this.fileContextManager.loadFiles(filePaths);

      // Add new files to context (avoid duplicates)
      for (const newFile of newFiles) {
        if (
          !this.fileContextManager.isFileInContext(newFile.path, this.internalContext.file_context)
        ) {
          this.internalContext.file_context.push(newFile);
        } else {
          console.log(
            chalk.yellow(
              `⚠️  File already in context: ${this.fileContextManager.getDisplayName(newFile)}`
            )
          );
        }
      }

      if (newFiles.length > 0) {
        console.log(chalk.green(`✅ Added ${newFiles.length} file(s) to context`));
      }
      console.log();
    }

    // Use cleaned input (without @-syntax) as the actual message
    const actualMessage = cleanedInput || userInput;

    // Skip processing if the message is empty after removing @-syntax
    if (!actualMessage.trim()) {
      return;
    }

    // Add user message to history
    const userMessage: ChatMessage = {
      role: "user",
      content: actualMessage,
    };
    this.internalContext.chat_history.push(userMessage);

    // Compile context and create messages
    const systemPrompt = this.contextCompiler.compile(this.internalContext);
    let messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...this.internalContext.chat_history,
    ];

    let currentMessages = [...messages];
    let loopCount = 0;
    const MAX_LOOP_COUNT = 10;

    try {
      while (loopCount < MAX_LOOP_COUNT) {
        if (loopCount === 0) {
          console.log(chalk.blue("🤔 LlamaCLI is thinking..."));
        }

        let assistantResponseContent = "";
        let toolCallPayload: ToolCallPayload | null = null;
        const streamingToolCalls: StreamingToolCall[] = [];

        // Stream the response (pass tools only in agent mode)
        const tools = this.mode === "agent" ? this.internalContext.available_tools : [];
        for await (const chunk of this.llmAdapter.chatStream(currentMessages, tools)) {
          if (typeof chunk === "string") {
            assistantResponseContent += chunk;
            // Use stream processor to handle thinking content
            this.streamProcessor.processChunk(chunk);
          } else if (typeof chunk === "object" && chunk.type === "tool_call") {
            streamingToolCalls.push(chunk);
          }
        }

        // Finalize stream processing
        this.streamProcessor.finalize();

        // Convert streaming tool calls to ToolCallPayload format
        if (streamingToolCalls.length > 0) {
          const toolCalls: ToolCall[] = streamingToolCalls.map((stc) => ({
            id: stc.tool_call_id,
            type: "function" as const,
            function: {
              name: stc.name,
              arguments: stc.arguments,
            },
          }));

          toolCallPayload = {
            type: "tool_calls",
            tool_calls: toolCalls,
          };
        }

        // Add a newline at the end if we had content
        if (assistantResponseContent) {
          console.log(); // Add newline after streaming content
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: assistantResponseContent,
        };

        if (toolCallPayload) {
          // Assign a client-side ID if the backend didn't provide one
          toolCallPayload.tool_calls.forEach((tc) => {
            if (!tc.id) {
              tc.id = `call_${crypto.randomUUID()}`;
            }
          });
          assistantMessage.tool_calls = toolCallPayload.tool_calls;
        }

        currentMessages.push(assistantMessage);

        if (toolCallPayload) {
          console.log(
            chalk.yellow(
              `🔧 Using tools: ${toolCallPayload.tool_calls.map((t) => t.function.name).join(", ")}`
            )
          );

          const toolPromises = toolCallPayload.tool_calls.map((toolCall) => {
            return this.toolDispatcher.dispatch(
              { name: toolCall.function.name, arguments: toolCall.function.arguments },
              toolCall.id!
            );
          });

          const toolResults = await Promise.all(toolPromises);

          toolResults.forEach((toolResult) => {
            if (this.debug) {
              console.log(
                chalk.green(`✅ Tool result for ${toolResult.tool_call_id}: ${toolResult.content}`)
              );
            }
            currentMessages.push(toolResult);
          });

          loopCount++;
          continue;
        } else {
          // Add assistant message to history
          this.internalContext.chat_history.push(assistantMessage);
          break;
        }
      }

      if (loopCount >= MAX_LOOP_COUNT) {
        console.log(chalk.yellow("⚠️  Maximum tool call iterations reached."));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error during chat: ${(error as Error).message}`));
      console.log(chalk.blue("💡 Tip: Please check your LLM backend is running and accessible."));
    }

    console.log(); // Add spacing before next prompt
  }

  private async clearContext(): Promise<void> {
    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: "Are you sure you want to clear all context (chat history, files, memory)?",
        default: false,
      },
    ]);

    if (!confirmed) {
      console.log(chalk.yellow("Context clear cancelled."));
      return;
    }

    this.internalContext.chat_history = [];
    this.internalContext.file_context = [];
    this.internalContext.long_term_memory = [];

    console.log(chalk.green("✅ Context cleared successfully."));
    console.log();
  }

  private async handleModeCommand(args: string[]): Promise<void> {
    const newMode = args[0]?.toLowerCase();

    if (!newMode) {
      console.log(chalk.cyan("Current mode:"), chalk.bold(this.mode));
      console.log();
      console.log(chalk.gray("Available modes:"));
      console.log(chalk.gray("  • agent - AI can use tools and call functions"));
      console.log(chalk.gray("  • pure  - Pure chat mode, no tool usage"));
      console.log();
      console.log(chalk.blue("💡 Usage: /mode <agent|pure>"));
      return;
    }

    if (newMode !== "agent" && newMode !== "pure") {
      console.log(chalk.red(`❌ Invalid mode: ${newMode}`));
      console.log(chalk.blue("💡 Available modes: agent, pure"));
      return;
    }

    this.mode = newMode as "agent" | "pure";
    console.log(chalk.green(`✅ Mode switched to: ${this.mode}`));

    if (this.mode === "pure") {
      console.log(chalk.gray("🔒 Pure chat mode: AI will not use any tools"));
    } else {
      console.log(chalk.gray("🔧 Agent mode: AI can use tools and functions"));
    }
    console.log();
  }

  private async handleMemoryCommand(args: string[]): Promise<void> {
    const subCmd = args[0]?.toLowerCase() || "list";

    switch (subCmd) {
      case "add":
        await this.addMemory();
        break;
      case "list":
        this.listMemory();
        break;
      case "clear":
        await this.clearMemory();
        break;
      default:
        console.log(chalk.red(`❌ Unknown memory command: ${subCmd}`));
        console.log(chalk.blue("💡 Available: /memory <add|list|clear>"));
    }
  }

  private async addMemory(): Promise<void> {
    console.log(chalk.blue("📝 Add to long-term memory:"));
    console.log(chalk.gray("Enter your memory text (press Enter twice to finish):"));
    console.log();

    let memoryText = "";
    let emptyLineCount = 0;

    while (true) {
      const line = await this.getUserInput("> ");

      if (line.trim() === "") {
        emptyLineCount++;
        if (emptyLineCount >= 2) {
          break;
        }
        memoryText += "\n";
      } else {
        emptyLineCount = 0;
        memoryText += line + "\n";
      }
    }

    memoryText = memoryText.trim();

    if (!memoryText) {
      console.log(chalk.yellow("⚠️  No memory text provided."));
      return;
    }

    this.internalContext.long_term_memory.push(memoryText);
    console.log(chalk.green("✅ Memory added successfully."));
    console.log();
  }

  private listMemory(): void {
    console.log(chalk.bold("🧠 Long-term Memory:"));

    if (this.internalContext.long_term_memory.length === 0) {
      console.log(chalk.gray("  No memories stored"));
      console.log(chalk.gray("  💡 Use /memory add to add memories"));
    } else {
      this.internalContext.long_term_memory.forEach((memory, index) => {
        console.log(
          chalk.cyan(
            `  ${index + 1}. ${memory.substring(0, 100)}${memory.length > 100 ? "..." : ""}`
          )
        );
      });
    }
    console.log();
  }

  private async clearMemory(): Promise<void> {
    if (this.internalContext.long_term_memory.length === 0) {
      console.log(chalk.yellow("⚠️  No memories to clear."));
      return;
    }

    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: `Clear all ${this.internalContext.long_term_memory.length} memories?`,
        default: false,
      },
    ]);

    if (!confirmed) {
      console.log(chalk.yellow("Memory clear cancelled."));
      return;
    }

    this.internalContext.long_term_memory = [];
    console.log(chalk.green("✅ All memories cleared."));
    console.log();
  }

  private async handleCompressCommand(): Promise<void> {
    if (this.internalContext.chat_history.length < 5) {
      console.log(
        chalk.yellow("⚠️  Not enough chat history to compress (need at least 5 messages).")
      );
      return;
    }

    console.log(chalk.blue("🗜️  Compressing chat history..."));
    console.log(chalk.gray("This will summarize the conversation and reduce context size."));

    // Create a summary prompt
    const historyText = this.internalContext.chat_history
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const summaryPrompt = `Please provide a concise summary of this conversation, highlighting key points, decisions, and context that should be preserved:

${historyText}

Summary:`;

    try {
      // Use the LLM to create a summary
      const messages = [
        {
          role: "system" as const,
          content: "You are a helpful assistant that creates concise conversation summaries.",
        },
        { role: "user" as const, content: summaryPrompt },
      ];

      let summary = "";
      for await (const chunk of this.llmAdapter.chatStream(messages, [])) {
        if (typeof chunk === "string") {
          summary += chunk;
        }
      }

      if (summary.trim()) {
        // Replace chat history with summary
        this.internalContext.chat_history = [
          {
            role: "system",
            content: `Previous conversation summary: ${summary.trim()}`,
          },
        ];

        console.log(chalk.green("✅ Chat history compressed successfully."));
        console.log(chalk.gray(`Reduced from multiple messages to 1 summary message.`));
      } else {
        console.log(chalk.red("❌ Failed to generate summary."));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error compressing history: ${(error as Error).message}`));
    }

    console.log();
  }

  private async handleThinkCommand(args: string[]): Promise<void> {
    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case "list":
        this.thinkingRenderer.listThinking();
        break;
      case "on":
        this.thinkingRenderer.toggleThinking(true);
        break;
      case "off":
        this.thinkingRenderer.toggleThinking(false);
        break;
      case "clear":
        this.thinkingRenderer.clearThinking();
        break;
      default:
        if (subCommand && /^\d+$/.test(subCommand)) {
          // Show specific thinking by index
          const index = parseInt(subCommand) - 1;
          this.thinkingRenderer.displayThinkingByIndex(index);
        } else {
          // Show latest thinking or help
          if (this.thinkingRenderer.getThinkingCount() > 0) {
            this.thinkingRenderer.displayThinking();
          } else {
            this.showThinkHelp();
          }
        }
        break;
    }
  }

  private showThinkHelp(): void {
    console.log(chalk.bold.cyan("💭 思维管理命令:"));
    console.log(chalk.cyan("  /think") + chalk.gray("          - 显示最新的思维内容"));
    console.log(chalk.cyan("  /think list") + chalk.gray("     - 列出所有思维记录"));
    console.log(chalk.cyan("  /think <数字>") + chalk.gray("   - 显示指定序号的思维内容"));
    console.log(chalk.cyan("  /think on") + chalk.gray("       - 开启思维显示"));
    console.log(chalk.cyan("  /think off") + chalk.gray("      - 关闭思维显示"));
    console.log(chalk.cyan("  /think clear") + chalk.gray("    - 清空所有思维记录"));
    console.log();
    console.log(chalk.gray("💡 当模型使用 <think></think> 标签时，思维内容会被自动处理"));
  }
}
