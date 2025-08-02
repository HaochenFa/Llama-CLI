/**
 * Config command for LlamaCLI slash commands
 */

import { SlashCommand, CommandContext, SlashCommandResult, CommandKind } from "./types.js";

const listSubCommand: SlashCommand = {
  name: "list",
  altNames: ["ls"],
  description: "List all LLM profiles",
  kind: CommandKind.BUILT_IN,

  action: async (context: CommandContext, args: string): Promise<SlashCommandResult> => {
    const { cli, configStore } = context;

    if (!configStore) {
      return {
        type: "error",
        content: "Configuration store not available",
        messageType: "error",
      };
    }

    try {
      const profiles = await configStore.listProfiles();
      const activeProfile = await configStore.getActiveProfile();

      cli.displayMessage("\n⚙️  LLM Profiles:", "info");

      if (profiles.length === 0) {
        cli.displayMessage("  No profiles configured. Use /config add to create one.", "warning");
        return {
          type: "message",
          content: "",
          messageType: "info",
        };
      }

      for (const profile of profiles) {
        const isActive = profile.name === activeProfile?.name;
        const indicator = isActive ? "●" : "○";
        const style = isActive ? "success" : "info";

        cli.displayMessage(`  ${indicator} ${profile.name} (${profile.provider})`, style);
        if (profile.description) {
          cli.displayMessage(`    ${profile.description}`, "muted");
        }
      }

      cli.displayMessage("\n💡 Use /config use <name> to switch profiles", "info");

      return {
        type: "message",
        content: "",
        messageType: "info",
      };
    } catch (error) {
      return {
        type: "error",
        content: `Error listing profiles: ${error instanceof Error ? error.message : String(error)}`,
        messageType: "error",
      };
    }
  },
};

const useSubCommand: SlashCommand = {
  name: "use",
  description: "Switch to a specific LLM profile",
  kind: CommandKind.BUILT_IN,

  action: async (context: CommandContext, args: string): Promise<SlashCommandResult> => {
    const { cli, configStore } = context;
    const profileName = args.trim();

    if (!configStore) {
      return {
        type: "error",
        content: "Configuration store not available",
        messageType: "error",
      };
    }

    if (!profileName) {
      return {
        type: "error",
        content: "Profile name required. Usage: /config use <profile-name>",
        messageType: "error",
      };
    }

    try {
      const profiles = await configStore.listProfiles();
      const profile = profiles.find((p: any) => p.name === profileName);

      if (!profile) {
        return {
          type: "error",
          content: `Profile '${profileName}' not found. Use /config list to see available profiles.`,
          messageType: "error",
        };
      }

      await configStore.setActiveProfile(profileName);
      cli.displayMessage(
        `✅ Switched to profile '${profileName}' (${profile.provider})`,
        "success"
      );

      return {
        type: "message",
        content: "",
        messageType: "success",
      };
    } catch (error) {
      return {
        type: "error",
        content: `Error switching profile: ${error instanceof Error ? error.message : String(error)}`,
        messageType: "error",
      };
    }
  },

  completion: async (context: CommandContext, partialArg: string): Promise<string[]> => {
    const { configStore } = context;

    if (!configStore) {
      return [];
    }

    try {
      const profiles = await configStore.listProfiles();
      return profiles
        .map((p: any) => p.name)
        .filter((name: string) => name.toLowerCase().startsWith(partialArg.toLowerCase()));
    } catch {
      return [];
    }
  },
};

const showSubCommand: SlashCommand = {
  name: "show",
  description: "Show details of a specific profile",
  kind: CommandKind.BUILT_IN,

  action: async (context: CommandContext, args: string): Promise<SlashCommandResult> => {
    const { cli, configStore } = context;
    const profileName = args.trim();

    if (!configStore) {
      return {
        type: "error",
        content: "Configuration store not available",
        messageType: "error",
      };
    }

    if (!profileName) {
      // Show active profile if no name provided
      try {
        const activeProfile = await configStore.getActiveProfile();
        if (!activeProfile) {
          return {
            type: "error",
            content: "No active profile set",
            messageType: "error",
          };
        }

        cli.displayMessage(`\n⚙️  Active Profile: ${activeProfile.name}`, "info");
        cli.displayMessage(`Provider: ${activeProfile.provider}`, "info");
        cli.displayMessage(`Model: ${activeProfile.model || "default"}`, "info");
        if (activeProfile.description) {
          cli.displayMessage(`Description: ${activeProfile.description}`, "info");
        }

        return {
          type: "message",
          content: "",
          messageType: "info",
        };
      } catch (error) {
        return {
          type: "error",
          content: `Error showing active profile: ${error instanceof Error ? error.message : String(error)}`,
          messageType: "error",
        };
      }
    }

    try {
      const profiles = await configStore.listProfiles();
      const profile = profiles.find((p: any) => p.name === profileName);

      if (!profile) {
        return {
          type: "error",
          content: `Profile '${profileName}' not found`,
          messageType: "error",
        };
      }

      cli.displayMessage(`\n⚙️  Profile: ${profile.name}`, "info");
      cli.displayMessage(`Provider: ${profile.provider}`, "info");
      cli.displayMessage(`Model: ${profile.model || "default"}`, "info");
      if (profile.description) {
        cli.displayMessage(`Description: ${profile.description}`, "info");
      }

      return {
        type: "message",
        content: "",
        messageType: "info",
      };
    } catch (error) {
      return {
        type: "error",
        content: `Error showing profile: ${error instanceof Error ? error.message : String(error)}`,
        messageType: "error",
      };
    }
  },

  completion: async (context: CommandContext, partialArg: string): Promise<string[]> => {
    return useSubCommand.completion!(context, partialArg);
  },
};

export const configCommand: SlashCommand = {
  name: "config",
  altNames: ["cfg"],
  description: "Manage LLM configuration profiles",
  kind: CommandKind.BUILT_IN,

  subCommands: [listSubCommand, useSubCommand, showSubCommand],

  action: async (context: CommandContext, args: string): Promise<SlashCommandResult> => {
    // Default action is to list profiles
    const result = await listSubCommand.action!(context, args);
    return result || { type: "message", content: "", messageType: "info" };
  },
};
