import { ToolDefinition } from "../../types/context.js";
import * as fs from "fs/promises";
import * as path from "path";
import inquirer from "inquirer";
import chalk from "chalk";

export const delete_file_tool: ToolDefinition = {
  type: "native",
  name: "delete_file",
  description:
    "Deletes a specified file from the local filesystem. This is a destructive operation that requires user confirmation. The file path must be an absolute path.",
  parameters: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description:
          "The absolute path to the file to delete (e.g., '/home/user/project/file.txt'). Relative paths are not supported.",
      },
      force: {
        type: "boolean",
        description:
          "Optional: Skip confirmation prompt if set to true. Use with extreme caution. Default: false.",
        default: false,
      },
    },
    required: ["file_path"],
  },
  invoke: async (args: { file_path: string; force?: boolean }) => {
    const { file_path, force = false } = args;

    if (!path.isAbsolute(file_path)) {
      throw new Error("file_path must be an absolute path.");
    }

    try {
      // Check if file exists
      const stats = await fs.stat(file_path);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${file_path}`);
      }

      // Get file info for confirmation
      const fileName = path.basename(file_path);
      const fileSize = Math.round(stats.size / 1024);
      const lastModified = stats.mtime.toLocaleString();

      // Security check: Don't allow deletion of critical system files or directories
      const criticalPaths = [
        "/etc",
        "/bin",
        "/sbin",
        "/usr/bin",
        "/usr/sbin",
        "/boot",
        "/sys",
        "/proc",
        "/dev",
      ];

      const normalizedPath = path.normalize(file_path);
      for (const criticalPath of criticalPaths) {
        if (normalizedPath.startsWith(criticalPath)) {
          throw new Error(`Cannot delete files in critical system directory: ${criticalPath}`);
        }
      }

      // Additional safety check for important files
      const dangerousPatterns = [
        /^\.env$/i,
        /^\.env\./i,
        /package\.json$/i,
        /package-lock\.json$/i,
        /yarn\.lock$/i,
        /Cargo\.toml$/i,
        /Cargo\.lock$/i,
        /go\.mod$/i,
        /go\.sum$/i,
        /requirements\.txt$/i,
        /Pipfile$/i,
        /Pipfile\.lock$/i,
        /composer\.json$/i,
        /composer\.lock$/i,
        /\.gitignore$/i,
        /\.git/i,
        /node_modules/i,
      ];

      const isDangerous = dangerousPatterns.some(
        (pattern) => pattern.test(fileName) || pattern.test(file_path)
      );

      if (!force) {
        // Show file information
        console.log(chalk.yellow("\n⚠️  DESTRUCTIVE OPERATION WARNING"));
        console.log(chalk.gray("You are about to delete a file. This action cannot be undone."));
        console.log();
        console.log(chalk.cyan("File Information:"));
        console.log(chalk.gray(`  Path: ${file_path}`));
        console.log(chalk.gray(`  Name: ${fileName}`));
        console.log(chalk.gray(`  Size: ${fileSize}KB`));
        console.log(chalk.gray(`  Last Modified: ${lastModified}`));

        if (isDangerous) {
          console.log();
          console.log(chalk.red("🚨 WARNING: This appears to be an important file!"));
          console.log(chalk.red("   Deleting this file may break your project or system."));
        }

        console.log();

        // Ask for confirmation
        const { confirmed } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmed",
            message: isDangerous
              ? "Are you absolutely sure you want to delete this important file?"
              : "Are you sure you want to delete this file?",
            default: false,
          },
        ]);

        if (!confirmed) {
          return "File deletion cancelled by user.";
        }

        // Double confirmation for dangerous files
        if (isDangerous) {
          const { doubleConfirmed } = await inquirer.prompt([
            {
              type: "confirm",
              name: "doubleConfirmed",
              message: "This is your final warning. Really delete this important file?",
              default: false,
            },
          ]);

          if (!doubleConfirmed) {
            return "File deletion cancelled by user (double confirmation).";
          }
        }
      }

      // Perform the deletion
      await fs.unlink(file_path);

      const message = `Successfully deleted file: ${file_path}`;
      console.log(chalk.green(`✅ ${message}`));
      return message;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return `Error: File not found: ${file_path}`;
      } else if (error.code === "EACCES") {
        return `Error: Permission denied when trying to delete: ${file_path}`;
      } else {
        return `Error deleting file ${file_path}: ${(error as Error).message}`;
      }
    }
  },
};
