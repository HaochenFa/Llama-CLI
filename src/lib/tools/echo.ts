import {ToolDefinition} from '../../types/context.js';

export const echo_tool: ToolDefinition = {
  type: 'native',
  name: 'echo',
  description: 'Echoes back the message provided.',
  parameters: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
      },
    },
    required: ['message'],
  },
  invoke: async (args: { message: string }) => {
    return `Echo: ${args.message}`;
  },
};