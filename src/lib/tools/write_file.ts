import {ToolDefinition} from '../../types/context.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export const write_file_tool: ToolDefinition = {
  name: 'write_file',
  description: 'Writes content to a specified file in the local filesystem.',
  type: 'native',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
      },
      content: {
        type: 'string',
      },
    },
    required: ['file_path', 'content'],
  },
  invoke: async (args: { file_path: string; content: string }) => {
    const {file_path, content} = args;

    if (!path.isAbsolute(file_path)) {
      throw new Error('file_path must be an absolute path.');
    }

    try {
      await fs.writeFile(file_path, content, {encoding: 'utf-8'});
      return `Successfully wrote to file: ${file_path}`;
    } catch (error: any) {
      return `Error writing to file ${file_path}: ${(error as Error).message}`;
    }
  },
};
