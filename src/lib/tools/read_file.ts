import { ToolDefinition } from "../../types/context.js";
import * as fs from "fs/promises";
import * as path from "path";

export const read_file_tool: ToolDefinition = {
  type: "native",
  name: "read_file",
  description:
    "Reads and returns the content of a specified text file from the local filesystem. The file path must be an absolute path.",
  parameters: {
    type: "object",
    properties: {
      absolute_path: {
        type: "string",
        description:
          "The absolute path to the file to read (e.g., '/home/user/project/file.txt'). Relative paths are not supported.",
      },
      limit: {
        type: "number",
        description: "Optional: Maximum number of lines to read. Use with 'offset' to paginate.",
      },
      offset: {
        type: "number",
        description: "Optional: The 0-based line number to start reading from. Requires 'limit'.",
      },
    },
    required: ["absolute_path"],
  },
  invoke: async (args: { absolute_path: string; limit?: number; offset?: number }) => {
    const { absolute_path, limit, offset } = args;

    if (!path.isAbsolute(absolute_path)) {
      throw new Error("absolute_path must be an absolute path.");
    }

    try {
      const stats = await fs.stat(absolute_path);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${absolute_path}`);
      }

      let content = await fs.readFile(absolute_path, { encoding: "utf-8" });

      if (typeof limit === "number" && typeof offset === "number") {
        const lines = content.split("\n");
        const start = offset;
        const end = offset + limit;
        content = lines.slice(start, end).join("\n");
      } else if (limit !== undefined || offset !== undefined) {
        throw new Error("Both limit and offset must be provided for paginated reading.");
      }

      return content;
    } catch (error: any) {
      return `Error reading file ${absolute_path}: ${(error as Error).message}`;
    }
  },
};
