/**
 * Theme command for LlamaCLI slash commands
 */

import { SlashCommand, CommandContext, SlashCommandResult, CommandKind } from "./types.js";
import { themeManager } from "../theme-manager.js";

export const themeCommand: SlashCommand = {
  name: "theme",
  altNames: ["t"],
  description: "Manage CLI themes",
  kind: CommandKind.BUILT_IN,

  action: async (context: CommandContext, args: string): Promise<SlashCommandResult> => {
    const { cli } = context;
    const trimmedArgs = args.trim();

    if (!trimmedArgs) {
      // Show current theme and available themes
      const currentTheme = themeManager.getCurrentTheme();
      const availableThemes = themeManager.getAvailableThemes();

      cli.displayMessage(`\n🎨 Current theme: ${currentTheme.name}`, "info");
      cli.displayMessage("\n📋 Available themes:", "info");

      for (const theme of availableThemes) {
        const isActive = theme.name === currentTheme.name;
        const indicator = isActive ? "●" : "○";
        const style = isActive ? "success" : "info";
        cli.displayMessage(`  ${indicator} ${theme.name}`, style);
      }

      cli.displayMessage("\n💡 Usage: /theme <name> to switch themes", "info");

      return {
        type: "message",
        content: "",
        messageType: "info",
      };
    }

    // Switch to specified theme
    const themeName = trimmedArgs;
    const availableThemes = themeManager.getAvailableThemes();
    const themeNames = availableThemes.map((t) => t.name);

    if (!themeNames.includes(themeName)) {
      return {
        type: "error",
        content: `Theme '${themeName}' not found. Available themes: ${themeNames.join(", ")}`,
        messageType: "error",
      };
    }

    try {
      const success = await themeManager.setTheme(themeName);

      if (success) {
        cli.displayMessage(`✅ Theme switched to '${themeName}'`, "success");

        // Update CLI theme
        if (cli.setTheme) {
          await cli.setTheme(themeName);
        }

        return {
          type: "message",
          content: "",
          messageType: "success",
        };
      } else {
        return {
          type: "error",
          content: `Failed to switch to theme '${themeName}'`,
          messageType: "error",
        };
      }
    } catch (error) {
      return {
        type: "error",
        content: `Error switching theme: ${error instanceof Error ? error.message : String(error)}`,
        messageType: "error",
      };
    }
  },

  completion: async (context: CommandContext, partialArg: string): Promise<string[]> => {
    const availableThemes = themeManager.getAvailableThemes();
    return availableThemes
      .map((theme) => theme.name)
      .filter((themeName) => themeName.toLowerCase().startsWith(partialArg.toLowerCase()));
  },
};
