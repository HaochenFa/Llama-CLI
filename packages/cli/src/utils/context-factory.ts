/**
 * Context factory for creating internal contexts
 */

import { createDefaultContext, InternalContext } from "@llamacli/core";
import * as fs from "fs/promises";
import * as path from "path";
import { getErrorMessage } from "./error-utils.js";

export interface ContextOptions {
  workingDirectory?: string;
  includeFiles?: string[];
  enableTools?: boolean;
}

export async function createContext(options: ContextOptions = {}): Promise<InternalContext> {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const activeProfile = "default"; // Will be set properly later

  const context = createDefaultContext(sessionId, activeProfile);

  // Set working directory
  if (options.workingDirectory) {
    context.workingDirectory = path.resolve(options.workingDirectory);
    process.chdir(context.workingDirectory);
  } else {
    context.workingDirectory = process.cwd();
  }

  // Include files in context
  if (options.includeFiles && options.includeFiles.length > 0) {
    for (const filePath of options.includeFiles) {
      try {
        const resolvedPath = path.resolve(filePath);
        const stats = await fs.stat(resolvedPath);

        if (stats.isFile()) {
          const content = await fs.readFile(resolvedPath, "utf8");
          context.fileContext.push({
            path: resolvedPath,
            content,
            lastModified: stats.mtime.getTime(),
            size: stats.size,
            encoding: "utf8",
          });
        }
      } catch (error) {
        console.warn(`Warning: Could not include file ${filePath}:`, getErrorMessage(error));
      }
    }
  }

  // Configure tool settings
  context.settings.enableToolCalls = options.enableTools !== false;

  return context;
}
