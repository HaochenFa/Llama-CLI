import { Command } from "commander";
import { ConfigStore } from "../lib/config-store.js";
import { ContextCompiler } from "../lib/context-compiler.js";
import { AdapterFactory } from "../lib/adapters/adapter-factory.js";
import { ToolDispatcher } from "../lib/tool-dispatcher.js";
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
import * as crypto from "crypto";

export function registerGetCommand(program: Command) {
  const configStore = new ConfigStore();
  const contextCompiler = new ContextCompiler();
  const toolDispatcher = new ToolDispatcher([]);
  const thinkingRenderer = new ThinkingRenderer();
  const streamProcessor = new StreamProcessor(thinkingRenderer);

  program
    .command("get")
    .description("Get a quick one-shot response from the LLM.")
    .argument("<prompt>", "Your message to the LLM.")
    .option("--debug", "Enable debug logging for LLM interactions", false)
    .action(async (prompt: string, options: { debug: boolean }) => {
      const currentProfile = configStore.getCurrentProfile();
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

      let llmAdapter;
      try {
        llmAdapter = AdapterFactory.createAdapter(currentProfile, options.debug);
      } catch (error) {
        console.error(
          chalk.red(`❌ Error: Failed to initialize LLM adapter: ${(error as Error).message}`)
        );
        console.log(
          chalk.blue(`💡 Tip: Please check your configuration with 'llama-cli config list'.`)
        );
        process.exit(1);
      }

      const internalContext: InternalContext = {
        long_term_memory: [],
        available_tools: toolDispatcher.availableTools,
        file_context: [],
        chat_history: [],
        current_working_directory: process.cwd(),
      };

      const systemPrompt = contextCompiler.compile(internalContext);

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ];

      const currentMessages = [...messages];
      let loopCount = 0;
      const MAX_LOOP_COUNT = 10;

      try {
        while (loopCount < MAX_LOOP_COUNT) {
          let assistantResponseContent = "";
          let toolCallPayload: ToolCallPayload | null = null;
          const streamingToolCalls: StreamingToolCall[] = [];

          // Stream the response
          for await (const chunk of llmAdapter.chatStream(
            currentMessages,
            internalContext.available_tools
          )) {
            if (typeof chunk === "string") {
              assistantResponseContent += chunk;
              // Use stream processor to handle thinking content
              streamProcessor.processChunk(chunk);
            } else if (typeof chunk === "object" && chunk.type === "tool_call") {
              streamingToolCalls.push(chunk);
            }
          }

          // Finalize stream processing
          streamProcessor.finalize();

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
                `\n🔧 Using tools: ${toolCallPayload.tool_calls
                  .map((t) => t.function.name)
                  .join(", ")}`
              )
            );

            const toolPromises = toolCallPayload.tool_calls.map((toolCall) => {
              return toolDispatcher.dispatch(
                { name: toolCall.function.name, arguments: toolCall.function.arguments },
                toolCall.id!
              );
            });

            const toolResults = await Promise.all(toolPromises);

            toolResults.forEach((toolResult) => {
              if (options.debug) {
                console.log(
                  chalk.green(
                    `✅ Tool result for ${toolResult.tool_call_id}: ${toolResult.content}`
                  )
                );
              }
              currentMessages.push(toolResult);
            });

            loopCount++;
            continue;
          } else {
            console.log(); // Add a newline at the end
            break;
          }
        }

        if (loopCount >= MAX_LOOP_COUNT) {
          console.log(chalk.yellow("\n⚠️  Maximum tool call iterations reached."));
        }
      } catch (error) {
        console.error(chalk.red(`\n❌ Error during LLM interaction: ${(error as Error).message}`));
        console.log(chalk.blue("💡 Tip: Please check your LLM backend is running and accessible."));
        process.exit(1);
      }
    });
}
