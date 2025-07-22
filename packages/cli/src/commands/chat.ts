/**
 * Chat command implementation
 * Provides interactive chat functionality with LLM
 */

import React from "react";
import { render } from "ink";
import { ChatInterface } from "../ui/components/ChatInterface.js";
import { ConfigStore } from "@llamacli/core";
import { createAdapter } from "../utils/adapter-factory.js";
import { createContext } from "../utils/context-factory.js";
import { getErrorMessage, getErrorStack } from "../utils/error-utils.js";

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
      const profile = this.configStore.getAllProfiles().find((p) => p.id === profileId);

      if (!profile) {
        console.error("No active profile found. Please configure a profile first.");
        console.error("Run 'llamacli config add <name>' to create a profile.");
        process.exit(1);
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

      // Create core components (simplified for now)
      const agenticLoop = {
        processUserInput: async (input: string, ctx: any) => {
          // Simple echo for now - will be implemented properly later
          return `Echo: ${input}`;
        },
      };

      // Render React UI
      const { unmount } = render(
        React.createElement(ChatInterface, {
          agenticLoop,
          context,
          profile,
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
