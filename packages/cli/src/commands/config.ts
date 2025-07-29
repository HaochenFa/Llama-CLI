/**
 * Configuration command implementation
 * Manages LLM profiles and settings
 */

import { ConfigStore, LLMProfile } from "@llamacli/core";
import chalk from "chalk";
import inquirer from "inquirer";
import { getErrorMessage } from "../utils/error-utils.js";

export interface AddProfileOptions {
  type?: string;
  endpoint?: string;
  model?: string;
  apiKey?: string;
}

export class ConfigCommand {
  constructor(private configStore: ConfigStore) {}

  /**
   * Setup wizard for first-time users or when no profiles exist
   */
  async setupWizard(): Promise<void> {
    console.log(chalk.blue("🚀 Welcome to LlamaCLI!"));
    console.log("It looks like you don't have any profiles configured yet.");
    console.log("Let's create your first profile to get started.\n");

    const { shouldSetup } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldSetup",
        message: "Would you like to create a profile now?",
        default: true,
      },
    ]);

    if (!shouldSetup) {
      console.log(chalk.yellow("You can create a profile later with: llamacli config add <name>"));
      process.exit(0);
    }

    const { profileName } = await inquirer.prompt([
      {
        type: "input",
        name: "profileName",
        message: "Enter a name for your first profile:",
        default: "My First Profile",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Profile name cannot be empty";
          }
          return true;
        },
      },
    ]);

    try {
      await this.addProfile(profileName.trim(), {});
      console.log(chalk.green("\n🎉 Setup complete! You can now use LlamaCLI."));
    } catch (error) {
      console.error(chalk.red("Failed to create profile:"), getErrorMessage(error));
      process.exit(1);
    }
  }

  async listProfiles(): Promise<void> {
    const profiles = this.configStore.getAllProfiles();
    const activeProfile = this.configStore.getActiveProfile();

    if (profiles.length === 0) {
      console.log(chalk.yellow("No profiles configured."));
      console.log("Run 'llamacli config add <name>' to create your first profile.");
      return;
    }

    console.log(chalk.bold("Available Profiles:"));
    console.log();

    profiles.forEach((profile: LLMProfile) => {
      const isActive = activeProfile && profile.id === activeProfile.id;
      const marker = isActive ? chalk.green("●") : chalk.gray("○");
      const name = isActive ? chalk.green.bold(profile.name) : profile.name;

      console.log(`${marker} ${name}`);
      console.log(`  ID: ${profile.id}`);
      console.log(`  Type: ${profile.adapter}`);
      console.log(`  Model: ${profile.model}`);
      if (profile.description) {
        console.log(`  Description: ${profile.description}`);
      }
      console.log();
    });
  }

  async addProfile(name: string, options: AddProfileOptions): Promise<void> {
    try {
      // Interactive prompts for missing options
      const answers = await inquirer.prompt([
        {
          type: "list",
          name: "type",
          message: "Select LLM type:",
          choices: ["ollama", "openai", "claude", "vllm"],
          when: !options.type,
        },
        {
          type: "input",
          name: "endpoint",
          message: "Enter API endpoint:",
          default: (answers: any) => {
            switch (answers.type || options.type) {
              case "ollama":
                return "http://localhost:11434";
              case "openai":
                return "https://api.openai.com/v1";
              default:
                return "";
            }
          },
          when: !options.endpoint,
        },
        {
          type: "input",
          name: "model",
          message: "Enter model name:",
          default: (answers: any) => {
            switch (answers.type || options.type) {
              case "ollama":
                return "llama3.2";
              case "openai":
                return "gpt-4";
              default:
                return "";
            }
          },
          when: !options.model,
        },
        {
          type: "password",
          name: "apiKey",
          message: "Enter API key (optional):",
          when: (answers: any) => {
            if (options.apiKey) return false;
            const type = answers.type || options.type;
            return type !== "ollama";
          },
        },
      ]);

      const profile = {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        description: `${name} profile`,
        adapter: options.type || answers.type,
        model: options.model || answers.model,
        parameters: {
          temperature: 0.7,
          max_tokens: 2048,
          top_p: 0.9,
        },
        enabled: true,
      };

      // Add endpoint and API key if provided
      if (options.endpoint || answers.endpoint) {
        (profile as any).endpoint = options.endpoint || answers.endpoint;
      }
      if (options.apiKey || answers.apiKey) {
        (profile as any).apiKey = options.apiKey || answers.apiKey;
      }

      this.configStore.addProfile(profile);
      await this.configStore.saveConfig();

      console.log(chalk.green(`✓ Profile '${name}' added successfully!`));

      // Ask if they want to make it active
      if (this.configStore.getAllProfiles().length === 1) {
        this.configStore.setActiveProfile(profile.id);
        await this.configStore.saveConfig();
        console.log(chalk.green(`✓ Set '${name}' as active profile`));
      } else {
        const { makeActive } = await inquirer.prompt([
          {
            type: "confirm",
            name: "makeActive",
            message: "Make this the active profile?",
            default: false,
          },
        ]);

        if (makeActive) {
          this.configStore.setActiveProfile(profile.id);
          await this.configStore.saveConfig();
          console.log(chalk.green(`✓ Set '${name}' as active profile`));
        }
      }
    } catch (error) {
      console.error(chalk.red("Failed to add profile:"), getErrorMessage(error));
      process.exit(1);
    }
  }

  async setActiveProfile(name: string): Promise<void> {
    try {
      // Find profile by name or ID
      const profiles = this.configStore.getAllProfiles();
      const profile = profiles.find((p: LLMProfile) => p.name === name || p.id === name);

      if (!profile) {
        console.error(chalk.red(`Profile '${name}' not found.`));
        console.log("Available profiles:");
        profiles.forEach((p: LLMProfile) => console.log(`  - ${p.name} (${p.id})`));
        process.exit(1);
      }

      this.configStore.setActiveProfile(profile.id);
      await this.configStore.saveConfig();

      console.log(chalk.green(`✓ Set '${profile.name}' as active profile`));
    } catch (error) {
      console.error(chalk.red("Failed to set active profile:"), getErrorMessage(error));
      process.exit(1);
    }
  }

  async removeProfile(name: string): Promise<void> {
    try {
      // Find profile by name or ID
      const profiles = this.configStore.getAllProfiles();
      const profile = profiles.find((p: LLMProfile) => p.name === name || p.id === name);

      if (!profile) {
        console.error(chalk.red(`Profile '${name}' not found.`));
        process.exit(1);
      }

      // Check if this is the last profile
      const isLastProfile = profiles.length === 1;
      const isActiveProfile = profile.id === this.configStore.getConfig().llm.defaultProfile;

      // Prepare confirmation message
      let confirmMessage = `Are you sure you want to remove profile '${profile.name}'?`;
      if (isLastProfile) {
        confirmMessage += chalk.yellow(
          "\n⚠️  This is your last profile. After removal, you'll need to create a new profile to use LlamaCLI."
        );
      } else if (isActiveProfile) {
        confirmMessage += chalk.yellow(
          "\n⚠️  This is your active profile. Another profile will be automatically activated."
        );
      }

      // Confirm deletion
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: confirmMessage,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log("Cancelled.");
        return;
      }

      this.configStore.removeProfile(profile.id);
      await this.configStore.saveConfig();

      console.log(chalk.green(`✓ Profile '${profile.name}' removed successfully!`));

      // Show next steps if this was the last profile
      if (isLastProfile) {
        console.log(chalk.yellow("💡 To create a new profile, run: llamacli config add <name>"));
      } else if (isActiveProfile) {
        const newActiveProfile = this.configStore.getActiveProfile();
        if (newActiveProfile) {
          console.log(chalk.green(`✓ '${newActiveProfile.name}' is now the active profile`));
        }
      }
    } catch (error) {
      console.error(chalk.red("Failed to remove profile:"), getErrorMessage(error));
      process.exit(1);
    }
  }
}
