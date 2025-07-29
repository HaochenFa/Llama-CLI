/**
 * Get command implementation
 * Provides quick query functionality without interactive session
 */

import { ConfigStore, LLMProfile } from "@llamacli/core";
import { createAdapter } from "../utils/adapter-factory.js";
import { createContext } from "../utils/context-factory.js";
import chalk from "chalk";
import ora from "ora";
import { getErrorMessage, getErrorStack } from "../utils/error-utils.js";
import { ConfigCommand } from "./config.js";

export interface GetOptions {
  profile?: string;
  file?: string;
}

export class GetCommand {
  constructor(private configStore: ConfigStore) {}

  async run(query: string, options: GetOptions): Promise<void> {
    let spinner = ora("Initializing...").start();

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
          spinner.stop();
          const configCommand = new ConfigCommand(this.configStore);
          await configCommand.setupWizard();

          // After setup, try to get the profile again
          const updatedConfig = this.configStore.getConfig();
          const updatedProfileId = options.profile || updatedConfig.llm.defaultProfile;
          const updatedProfile = this.configStore
            .getAllProfiles()
            .find((p: LLMProfile) => p.id === updatedProfileId);

          if (!updatedProfile) {
            console.error("Setup was cancelled or failed. Cannot process query.");
            process.exit(1);
          }

          // Use the newly created profile and restart spinner
          profile = updatedProfile;
          spinner = ora("Initializing...").start();
        } else {
          // Profiles exist but the specified one wasn't found
          spinner.fail(`Profile '${profileId}' not found.`);
          console.error("Available profiles:");
          allProfiles.forEach((p: LLMProfile) => console.error(`  - ${p.name} (${p.id})`));
          process.exit(1);
        }
      }

      spinner.text = `Connecting to ${profile.name}...`;

      // Create adapter
      const adapter = await createAdapter(profile, config);
      await adapter.connect();

      spinner.text = "Processing query...";

      // Create context
      const context = await createContext({
        includeFiles: options.file ? [options.file] : [],
        enableTools: false, // Disable tools for quick queries
      });

      // Add user message to context
      const userMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content: query,
        timestamp: Date.now(),
      };

      context.chatHistory.push(userMessage);

      spinner.text = "Getting response...";

      // Get response from LLM
      let response = "";
      const messages = context.chatHistory;

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
      } catch (streamError) {
        spinner.fail("Failed to get response from LLM");
        console.error(chalk.red("Error:"), getErrorMessage(streamError));
        process.exit(1);
      }

      spinner.stop();

      // Display the response
      console.log();
      console.log(chalk.bold("Query:"), query);
      console.log();
      console.log(chalk.bold("Response:"));
      console.log(response.trim());
      console.log();

      // Add assistant message to context for potential follow-up
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: response,
        timestamp: Date.now(),
      };

      context.chatHistory?.push(assistantMessage);

      // Disconnect
      await adapter.disconnect();
    } catch (error) {
      spinner.fail("Failed to process query");
      console.error(chalk.red("Error:"), getErrorMessage(error));
      const stack = getErrorStack(error);
      if (stack) {
        console.error("Stack trace:", stack);
      }
      process.exit(1);
    }
  }
}
