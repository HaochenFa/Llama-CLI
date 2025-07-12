// src/lib/mcp/handlers/delete-file-handler.ts
// Delete file tool handler for the unified MCP architecture

import * as fs from "fs/promises";
import * as path from "path";
import { BaseToolHandler } from "../tool-handler.js";

export class DeleteFileHandler extends BaseToolHandler {
  description =
    "Deletes a specified file from the local filesystem. This is a destructive operation that requires user confirmation. The file path must be an absolute path.";

  schema = {
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
  };

  protected async executeImpl(args: { file_path: string; force?: boolean }): Promise<string> {
    const { file_path, force = false } = args;

    // Validate that the path is absolute
    if (!path.isAbsolute(file_path)) {
      throw new Error("file_path must be an absolute path.");
    }

    try {
      // Check if file exists and get its info
      const stats = await fs.stat(file_path);

      if (!stats.isFile()) {
        throw new Error(`Path ${file_path} is not a file.`);
      }

      const fileSize = stats.size;
      const fileName = path.basename(file_path);

      // Safety check: require confirmation for important files unless force is true
      if (!force && this.isImportantFile(fileName)) {
        throw new Error(
          `Refusing to delete important file '${fileName}' without force=true. ` +
            `This appears to be a system or configuration file that should not be deleted accidentally.`
        );
      }

      // Delete the file
      await fs.unlink(file_path);

      // Verify deletion
      try {
        await fs.stat(file_path);
        throw new Error(`File deletion failed: ${file_path} still exists after deletion attempt.`);
      } catch (error: any) {
        if (error.code !== "ENOENT") {
          throw error;
        }
        // File successfully deleted (ENOENT is expected)
      }

      return `File deleted successfully. Path: ${file_path}, Size: ${fileSize} bytes`;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new Error(`File not found: ${file_path}`);
      } else if (error.code === "EACCES") {
        throw new Error(`Permission denied: ${file_path}`);
      } else if (error.code === "EBUSY") {
        throw new Error(`File is busy or locked: ${file_path}`);
      } else if (error.code === "EPERM") {
        throw new Error(`Operation not permitted: ${file_path}`);
      } else {
        throw error;
      }
    }
  }

  private isImportantFile(fileName: string): boolean {
    const importantFiles = [
      // System files
      "passwd",
      "shadow",
      "group",
      "hosts",
      "fstab",
      "sudoers",
      // Package managers
      "package.json",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "requirements.txt",
      "Pipfile",
      "Pipfile.lock",
      "poetry.lock",
      "Cargo.toml",
      "Cargo.lock",
      "go.mod",
      "go.sum",
      "composer.json",
      "composer.lock",
      // Build and config files
      "Makefile",
      "CMakeLists.txt",
      "Dockerfile",
      "docker-compose.yml",
      ".gitignore",
      ".gitattributes",
      "README.md",
      "LICENSE",
      "tsconfig.json",
      "jsconfig.json",
      "webpack.config.js",
      "vite.config.js",
      "rollup.config.js",
      "babel.config.js",
      // Environment and secrets
      ".env",
      ".env.local",
      ".env.production",
      ".env.development",
      "config.json",
      "settings.json",
      "app.config.js",
    ];

    const lowerFileName = fileName.toLowerCase();
    return importantFiles.some(
      (important) =>
        lowerFileName === important.toLowerCase() ||
        lowerFileName.endsWith("." + important.toLowerCase())
    );
  }

  protected validateArgs(args: any): void {
    super.validateArgs(args);

    if (!args.file_path || typeof args.file_path !== "string") {
      throw new Error("file_path is required and must be a string");
    }

    if (args.force !== undefined && typeof args.force !== "boolean") {
      throw new Error("force must be a boolean");
    }

    // Additional safety checks
    const filePath = args.file_path;

    // Prevent deletion of root directory or system directories
    const dangerousPaths = ["/", "/bin", "/sbin", "/usr", "/etc", "/var", "/sys", "/proc", "/dev"];
    if (
      dangerousPaths.some(
        (dangerous) => filePath.startsWith(dangerous + "/") || filePath === dangerous
      )
    ) {
      throw new Error(`Refusing to delete files in system directory: ${filePath}`);
    }

    // Prevent deletion of home directory
    if (filePath === process.env.HOME || filePath === "/home" || filePath === "/Users") {
      throw new Error(`Refusing to delete home directory: ${filePath}`);
    }
  }
}
