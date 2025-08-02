/**
 * Non-Interactive Mode Processor for LlamaCLI
 * Handles stdin input, command-line prompts, and output formatting
 */

import * as fs from "fs/promises";
import { ConfigStore } from "@llamacli/core";
import { processFileReferences } from "../ui/file-reference/index.js";

export interface NonInteractiveOptions {
  prompt?: string;
  format?: "text" | "json" | "markdown";
  output?: string;
  profile?: string;
  file?: string;
  directory?: string;
  noTools?: boolean;
  yolo?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

export interface NonInteractiveResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    model?: string;
    profile?: string;
  };
}

export class NonInteractiveProcessor {
  private configStore: ConfigStore;
  private workingDirectory: string;

  constructor(configStore: ConfigStore, workingDirectory: string = process.cwd()) {
    this.configStore = configStore;
    this.workingDirectory = workingDirectory;
  }

  /**
   * Check if we should run in non-interactive mode
   */
  static shouldRunNonInteractive(): boolean {
    // Run non-interactive if:
    // 1. Not a TTY (piped input)
    // 2. Has --prompt/-p argument
    // 3. Has stdin input
    const hasPromptArg = process.argv.some(
      (arg) => arg === "--prompt" || arg === "-p" || arg.startsWith("--prompt=")
    );

    const hasNonInteractiveFlags = process.argv.some(
      (arg) =>
        arg === "--format" ||
        arg === "--output" ||
        arg.startsWith("--format=") ||
        arg.startsWith("--output=")
    );

    return !process.stdin.isTTY || hasPromptArg || hasNonInteractiveFlags;
  }

  /**
   * Read input from stdin
   */
  async readStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = "";

      // Set encoding to handle text properly
      process.stdin.setEncoding("utf8");

      const onReadable = () => {
        let chunk;
        while ((chunk = process.stdin.read()) !== null) {
          data += chunk;
        }
      };

      const onEnd = () => {
        cleanup();
        resolve(data.trim());
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        process.stdin.removeListener("readable", onReadable);
        process.stdin.removeListener("end", onEnd);
        process.stdin.removeListener("error", onError);
      };

      // Handle EPIPE errors gracefully
      process.stdout.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EPIPE") {
          // Exit gracefully if the pipe is closed
          process.exit(0);
        }
      });

      process.stdin.on("readable", onReadable);
      process.stdin.on("end", onEnd);
      process.stdin.on("error", onError);
    });
  }

  /**
   * Process input and prepare for LLM
   */
  async processInput(input: string, options: NonInteractiveOptions): Promise<string> {
    let processedInput = input;

    // Process file references if present
    if (input.includes("@")) {
      const result = await processFileReferences(input, this.workingDirectory);
      if (result.hasFileReferences) {
        processedInput = result.processedInput;

        if (!options.quiet) {
          const successfulFiles = result.fileContents.filter((fc) => !fc.error);
          const failedFiles = result.fileContents.filter((fc) => fc.error);

          if (successfulFiles.length > 0) {
            console.error(`📁 Included ${successfulFiles.length} file(s) in context`);
          }

          if (failedFiles.length > 0) {
            for (const failed of failedFiles) {
              console.error(`❌ ${failed.error}`);
            }
          }
        }
      }
    }

    // Add file content if --file option is provided
    if (options.file) {
      try {
        const fileContent = await fs.readFile(options.file, "utf8");
        processedInput += `\n\n--- File: ${options.file} ---\n${fileContent}\n--- End of File ---`;

        if (!options.quiet) {
          console.error(`📄 Included file: ${options.file}`);
        }
      } catch (error) {
        throw new Error(
          `Failed to read file ${options.file}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return processedInput;
  }

  /**
   * Format output based on specified format
   */
  formatOutput(content: string, format: string, metadata?: any): string {
    switch (format) {
      case "json":
        return JSON.stringify(
          {
            content,
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
          },
          null,
          2
        );

      case "markdown":
        const metadataSection = metadata
          ? `---\nmodel: ${metadata.model || "unknown"}\nprofile: ${metadata.profile || "default"}\ntimestamp: ${new Date().toISOString()}\n---\n\n`
          : "";
        return `${metadataSection}${content}`;

      case "text":
      default:
        return content;
    }
  }

  /**
   * Write output to file or stdout
   */
  async writeOutput(content: string, outputPath?: string): Promise<void> {
    if (outputPath) {
      try {
        await fs.writeFile(outputPath, content, "utf8");
        console.error(`✅ Output written to: ${outputPath}`);
      } catch (error) {
        throw new Error(
          `Failed to write output to ${outputPath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      // Write to stdout
      process.stdout.write(content);

      // Add newline if content doesn't end with one
      if (!content.endsWith("\n")) {
        process.stdout.write("\n");
      }
    }
  }

  /**
   * Run non-interactive mode
   */
  async run(options: NonInteractiveOptions): Promise<NonInteractiveResult> {
    const startTime = Date.now();

    try {
      // Get input from prompt or stdin
      let input = options.prompt || "";

      if (!input && !process.stdin.isTTY) {
        input = await this.readStdin();
      }

      if (!input) {
        throw new Error("No input provided. Use --prompt or pipe input via stdin.");
      }

      // Process input (file references, etc.)
      const processedInput = await this.processInput(input, options);

      // Set working directory if specified
      if (options.directory) {
        this.workingDirectory = options.directory;
        process.chdir(options.directory);
      }

      // TODO: Integrate with LLM processing
      // For now, return a placeholder response
      const mockResponse = `Processed input: ${processedInput.substring(0, 100)}${processedInput.length > 100 ? "..." : ""}`;

      const responseTime = Date.now() - startTime;
      const metadata = {
        responseTime,
        model: "placeholder",
        profile: options.profile || "default",
        tokensUsed: Math.floor(processedInput.length / 4), // Rough estimate
      };

      // Format output
      const formattedOutput = this.formatOutput(
        mockResponse,
        options.format || "text",
        options.verbose ? metadata : undefined
      );

      // Write output
      await this.writeOutput(formattedOutput, options.output);

      return {
        success: true,
        output: formattedOutput,
        metadata,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (!options.quiet) {
        console.error(`❌ Error: ${errorMessage}`);
      }

      return {
        success: false,
        output: "",
        error: errorMessage,
      };
    }
  }

  /**
   * Parse command line arguments for non-interactive options
   */
  static parseNonInteractiveArgs(args: string[]): NonInteractiveOptions {
    const options: NonInteractiveOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case "--prompt":
        case "-p":
          options.prompt = args[++i];
          break;

        case "--format":
        case "-f":
          const format = args[++i];
          if (["text", "json", "markdown"].includes(format)) {
            options.format = format as "text" | "json" | "markdown";
          }
          break;

        case "--output":
        case "-o":
          options.output = args[++i];
          break;

        case "--profile":
          options.profile = args[++i];
          break;

        case "--file":
          options.file = args[++i];
          break;

        case "--directory":
        case "-d":
          options.directory = args[++i];
          break;

        case "--no-tools":
          options.noTools = true;
          break;

        case "--yolo":
          options.yolo = true;
          break;

        case "--quiet":
        case "-q":
          options.quiet = true;
          break;

        case "--verbose":
        case "-v":
          options.verbose = true;
          break;

        default:
          // Handle --prompt=value format
          if (arg.startsWith("--prompt=")) {
            options.prompt = arg.substring(9);
          } else if (arg.startsWith("--format=")) {
            const format = arg.substring(9);
            if (["text", "json", "markdown"].includes(format)) {
              options.format = format as "text" | "json" | "markdown";
            }
          } else if (arg.startsWith("--output=")) {
            options.output = arg.substring(9);
          }
          break;
      }
    }

    return options;
  }
}
