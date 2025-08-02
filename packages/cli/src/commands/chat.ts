/**
 * Chat command implementation
 * Provides interactive chat functionality with LLM
 */

import React from "react";
import { render } from "ink";
import { AppWithSplash } from "../ui/components/AppWithSplash.js";
import { ConfigStore, LLMProfile } from "@llamacli/core";
import { createAdapter } from "../utils/adapter-factory.js";
import { createContext } from "../utils/context-factory.js";
import { getErrorMessage, getErrorStack } from "../utils/error-utils.js";
import { ConfigCommand } from "./config.js";

export interface ChatOptions {
  profile?: string;
  file?: string;
  directory?: string;
  tools?: boolean;
  yolo?: boolean;
}

export class ChatCommand {
  constructor(private configStore: ConfigStore) {}

  async run(options: ChatOptions): Promise<void> {
    try {
      // Get configuration
      const config = this.configStore.getConfig();
      const profileId = options.profile || config.llm.defaultProfile;
      let profile = this.configStore.getAllProfiles().find((p: LLMProfile) => p.id === profileId);

      if (!profile) {
        // Check if there are any profiles at all
        const allProfiles = this.configStore.getAllProfiles();
        if (allProfiles.length === 0) {
          // No profiles exist, start setup wizard
          const configCommand = new ConfigCommand(this.configStore);
          await configCommand.setupWizard();

          // After setup, try to get the profile again
          const updatedConfig = this.configStore.getConfig();
          const updatedProfileId = options.profile || updatedConfig.llm.defaultProfile;
          const updatedProfile = this.configStore
            .getAllProfiles()
            .find((p: LLMProfile) => p.id === updatedProfileId);

          if (!updatedProfile) {
            console.error("Setup was cancelled or failed. Cannot start chat.");
            process.exit(1);
          }

          // Use the newly created profile
          profile = updatedProfile;
        } else {
          // Profiles exist but the specified one wasn't found
          console.error(`Profile '${profileId}' not found.`);
          console.error("Available profiles:");
          allProfiles.forEach((p: LLMProfile) => console.error(`  - ${p.name} (${p.id})`));
          process.exit(1);
        }
      }

      console.log(`Starting chat with profile: ${profile.name}`);
      console.log(`Model: ${profile.model}`);
      console.log(`Adapter: ${profile.adapter}`);

      // Create adapter
      const adapter = await createAdapter(profile, config);
      await adapter.connect();

      // Create context
      const context = await createContext({
        workingDirectory: options.directory,
        includeFiles: options.file ? [options.file] : [],
        enableTools: options.tools !== false,
      });

      // Create core components with real LLM integration
      const agenticLoop = {
        processUserInput: async (input: string, ctx: any) => {
          // Add user message to context
          const userMessage = {
            id: Date.now().toString(),
            role: "user" as const,
            content: input,
            timestamp: Date.now(),
          };

          ctx.chatHistory = ctx.chatHistory || [];
          ctx.chatHistory.push(userMessage);

          // Get response from LLM
          let response = "";
          const messages = ctx.chatHistory;

          try {
            for await (const chunk of adapter.chatStream(messages)) {
              if (chunk.type === "content" && chunk.content) {
                response += chunk.content;
              } else if (chunk.type === "error") {
                throw new Error(chunk.error || "Unknown error");
              } else if (chunk.type === "done") {
                break;
              }
            }

            // Add assistant message to context
            const assistantMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant" as const,
              content: response,
              timestamp: Date.now(),
            };

            ctx.chatHistory.push(assistantMessage);

            return response.trim();
          } catch (error) {
            throw new Error(
              `Failed to get response from LLM: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
      };

      // Render React UI with splash screen
      const { unmount } = render(
        React.createElement(AppWithSplash, {
          agenticLoop,
          context,
          profile,
          config: this.configStore,
          showSplash: true,
          splashDuration: 2000,
        })
      );

      // Handle exit signals
      process.on("SIGINT", () => {
        console.log("\nGoodbye!");
        unmount();
        adapter.disconnect();
        process.exit(0);
      });

      process.on("SIGTERM", () => {
        unmount();
        adapter.disconnect();
        process.exit(0);
      });
    } catch (error) {
      console.error("Failed to start chat:", getErrorMessage(error));
      const stack = getErrorStack(error);
      if (stack) {
        console.error("Stack trace:", stack);
      }
      process.exit(1);
    }
  }
}
