import {Command} from 'commander';
import {ConfigStore, LLMProfile} from './lib/config-store.js';
import {ContextCompiler} from './lib/context-compiler.js';
import {OllamaAdapter} from './lib/adapters/ollama.adapter.js';
import {ToolDispatcher} from './lib/tool-dispatcher.js';
import inquirer from 'inquirer';
import {InternalContext, ChatMessage, ToolCallPayload, ToolCall} from './types/context.js';
import chalk from 'chalk';
import * as crypto from 'crypto';

const program = new Command();
const configStore = new ConfigStore();
const contextCompiler = new ContextCompiler();
const toolDispatcher = new ToolDispatcher([]);

program
  .name('llama-cli')
  .description('LlamaCLI - Your AI-powered development companion.')
  .version('0.0.1');

program
  .command('config')
  .description('Manage LLM backend configurations.')
  .addCommand(
    new Command('list')
      .description('List all configured LLM profiles.')
      .action(() => {
        const profiles = configStore.listProfiles();
        if (profiles.length === 0) {
          console.log('No LLM profiles configured yet.');
          console.log('Use "llama-cli config add" to add a new profile.');
          return;
        }
        console.log('Configured LLM Profiles:');
        profiles.forEach(profileName => {
          const profile = configStore.getProfile(profileName);
          const currentIndicator = profileName === configStore.getCurrentProfile()?.name ? ' (current)' : '';
          console.log(`- ${profileName} (${profile?.type} - ${profile?.endpoint})${currentIndicator}`);
        });
      })
  )
  .addCommand(
    new Command('add')
      .description('Add a new LLM profile.')
      .argument('<name>', 'Name of the new profile')
      .argument('<type>', 'Type of the LLM (e.g., ollama, vllm)')
      .argument('<endpoint>', 'Endpoint URL of the LLM (e.g., http://localhost:11434)')
      .action((name: string, type: 'ollama' | 'vllm', endpoint: string) => {
        const newProfile: LLMProfile = {name, type, endpoint};
        configStore.setProfile(newProfile);
        console.log(`Profile "${name}" added successfully.`);
        if (!configStore.getCurrentProfile()) {
          configStore.setCurrentProfile(name);
          console.log(`Profile "${name}" set as current profile.`);
        }
      })
  )
  .addCommand(
    new Command('use')
      .description('Set the current active LLM profile.')
      .argument('<name>', 'Name of the profile to use')
      .action((name: string) => {
        if (configStore.setCurrentProfile(name)) {
          console.log(`Profile "${name}" set as current profile.`);
        } else {
          console.error(`Error: Profile "${name}" not found.`);
        }
      })
  )
  .addCommand(
    new Command('remove')
      .description('Remove an LLM profile.')
      .argument('<name>', 'Name of the profile to remove')
      .action((name: string) => {
        if (configStore.deleteProfile(name)) {
          console.log(`Profile "${name}" removed successfully.`);
          if (configStore.getCurrentProfile()?.name === name) {
            const config = configStore.readConfig();
            delete config.currentProfile;
            configStore.writeConfig(config);
            console.log('Current profile unset as it was removed.');
          }
        } else {
          console.error(`Error: Profile "${name}" not found.`);
        }
      })
  );

program
  .command('chat')
  .description('Start an interactive chat session with the LLM.')
  .argument('<prompt>', 'Your message to the LLM.')
  .option('--debug', 'Enable debug logging for LLM interactions', false)
  .action(async (prompt: string, options: { debug: boolean }) => {
    const currentProfile = configStore.getCurrentProfile();
    if (!currentProfile) {
      console.error('Error: No LLM profile is currently active. Please use "llama-cli config add" to add a profile and "llama-cli config use" to set it as current.');
      return;
    }

    let llmAdapter;
    switch (currentProfile.type) {
      case 'ollama':
        llmAdapter = new OllamaAdapter(currentProfile.endpoint, options.debug);
        break;
      case 'vllm':
        console.error('Error: vLLM adapter is not yet implemented.');
        return;
      default:
        console.error(`Error: Unsupported LLM type: ${currentProfile.type}`);
        return;
    }

    const internalContext: InternalContext = {
      long_term_memory: [],
      available_tools: toolDispatcher.availableTools,
      file_context: [],
      chat_history: [],
    };

    const systemPrompt = contextCompiler.compile(internalContext);

    let messages: ChatMessage[] = [
      {role: 'system', content: systemPrompt},
      {role: 'user', content: prompt},
    ];

    let currentMessages = [...messages];
    let loopCount = 0;
    const MAX_LOOP_COUNT = 10;

    while (loopCount < MAX_LOOP_COUNT) {
      console.log(chalk.blue('LlamaCLI is thinking...'));
      let assistantResponseContent = '';
      let toolCallPayload: ToolCallPayload | null = null;

      try {
        for await (const chunk of llmAdapter.chatStream(currentMessages, internalContext.available_tools)) {
          if (typeof chunk === 'string') {
            assistantResponseContent += chunk;
            process.stdout.write(chunk);
          } else if (typeof chunk === 'object' && chunk.type === 'tool_calls') {
            toolCallPayload = chunk;
          }
        }
        process.stdout.write('\n');

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: assistantResponseContent,
        };

        if (toolCallPayload) {
          // Assign a client-side ID if the backend didn't provide one
          toolCallPayload.tool_calls.forEach(tc => {
            if (!tc.id) {
              tc.id = `call_${crypto.randomUUID()}`;
            }
          });
          assistantMessage.tool_calls = toolCallPayload.tool_calls;
        }

        currentMessages.push(assistantMessage);

        if (toolCallPayload) {
          console.log(chalk.yellow(`\nTool calls detected: ${toolCallPayload.tool_calls.map(t => t.function.name).join(', ')}`));

          const toolPromises = toolCallPayload.tool_calls.map(toolCall => {
            // The arguments are already an object, no need to parse
            return toolDispatcher.dispatch({ name: toolCall.function.name, arguments: toolCall.function.arguments }, toolCall.id!);;
          });

          const toolResults = await Promise.all(toolPromises);

          toolResults.forEach(toolResult => {
            console.log(chalk.green(`Tool result for ${toolResult.tool_call_id}: ${toolResult.content}`));
            currentMessages.push(toolResult);
          });

          loopCount++;
          continue;
        } else {
          break;
        }
      } catch (error) {
        console.error('\nError during chat session:', (error as Error).message);
        break;
      }
    }
  });

async function runCli() {
  if (process.argv.slice(2).length === 0 && !configStore.getCurrentProfile()) {
    console.log(chalk.bold('Welcome to LlamaCLI! It looks like you\'re new here. Let\'s set up your first LLM connection.'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'profileName',
        message: 'Enter a name for your new LLM profile:',
        default: 'default-ollama',
      },
      {
        type: 'list',
        name: 'llmType',
        message: 'Select the type of your LLM:',
        choices: ['ollama', 'vllm'],
        default: 'ollama',
      },
      {
        type: 'input',
        name: 'endpoint',
        message: 'Enter the endpoint URL for your LLM (e.g., http://localhost:11434):',
        default: 'http://localhost:11434',
      },
    ]);

    const newProfile: LLMProfile = {
      name: answers.profileName,
      type: answers.llmType as 'ollama' | 'vllm',
      endpoint: answers.endpoint,
    };

    configStore.setProfile(newProfile);
    configStore.setCurrentProfile(newProfile.name);

    console.log(chalk.green(`\nProfile "${newProfile.name}" created and set as current.`));
    console.log('You can now start chatting with your LLM. Try: llama-cli chat "Hello!"');
    return;
  }

  program.parse(process.argv);
}

runCli();
