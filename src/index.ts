import { Command } from 'commander';
import { ConfigStore, LLMProfile } from './lib/config-store.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { registerChatCommand } from './commands/chat.js';
import { registerGetCommand } from './commands/get.js';
import { registerMcpCommand } from './commands/mcp.js';
import { InteractiveChatSession } from './commands/interactive-chat.js';
import { AdapterFactory } from './lib/adapters/adapter-factory.js';
import { initializeMcp } from './lib/mcp-init.js';

const program = new Command();
const configStore = new ConfigStore();

program
  .name('llama-cli')
  .description('LlamaCLI - Your AI-powered development companion.')
  .version('0.0.1');

// Register config commands
program
  .command('config')
  .description('Manage LLM backend configurations.')
  .addCommand(
    new Command('list')
      .description('List all configured LLM profiles.')
      .action(() => {
        try {
          const profiles = configStore.listProfiles();
          if (profiles.length === 0) {
            console.log(chalk.yellow('📝 No LLM profiles configured yet.'));
            console.log(chalk.blue('💡 Tip: Use "llama-cli config add <name> <type> <endpoint>" to add a new profile.'));
            return;
          }

          console.log(chalk.bold('📋 Configured LLM Profiles:'));
          profiles.forEach(profileName => {
            const profile = configStore.getProfile(profileName);
            const currentIndicator = profileName === configStore.getCurrentProfile()?.name ? chalk.green(' (current)') : '';
            console.log(`  ${chalk.cyan(profileName)} (${profile?.type} - ${profile?.endpoint})${currentIndicator}`);
          });
        } catch (error) {
          console.error(chalk.red(`❌ Error reading profiles: ${(error as Error).message}`));
          console.log(chalk.blue('💡 Tip: Please check your configuration file permissions.'));
        }
      })
  )
  .addCommand(
    new Command('add')
      .description('Add a new LLM profile.')
      .argument('<name>', 'Name of the new profile')
      .argument('<type>', 'Type of the LLM (e.g., ollama, vllm)')
      .argument('<endpoint>', 'Endpoint URL of the LLM (e.g., http://localhost:11434)')
      .action((name: string, type: 'ollama' | 'vllm', endpoint: string) => {
        try {
          // Validate inputs
          if (!name.trim()) {
            console.error(chalk.red('❌ Error: Profile name cannot be empty.'));
            return;
          }

          if (!['ollama', 'vllm'].includes(type)) {
            console.error(chalk.red(`❌ Error: Unsupported LLM type: ${type}`));
            console.log(chalk.blue('💡 Tip: Supported types are: ollama, vllm'));
            return;
          }



          try {
            new URL(endpoint);
          } catch {
            console.error(chalk.red('❌ Error: Invalid endpoint URL.'));
            console.log(chalk.blue('💡 Tip: Use a valid URL like http://localhost:11434'));
            return;
          }

          if (configStore.getProfile(name.trim())) {
            console.error(chalk.red(`❌ Error: Profile "${name}" already exists.`));
            console.log(chalk.blue('💡 Tip: Use a different name or remove the existing profile first.'));
            return;
          }

          const newProfile: LLMProfile = { name: name.trim(), type, endpoint: endpoint.trim() };
          configStore.setProfile(newProfile);
          console.log(chalk.green(`✅ Profile "${name}" added successfully.`));

          if (!configStore.getCurrentProfile()) {
            configStore.setCurrentProfile(name);
            console.log(chalk.blue(`🎯 Profile "${name}" set as current profile.`));
          }
        } catch (error) {
          console.error(chalk.red(`❌ Error adding profile: ${(error as Error).message}`));
          console.log(chalk.blue('💡 Tip: Please check your file permissions and try again.'));
        }
      })
  )
  .addCommand(
    new Command('use')
      .description('Set the current active LLM profile.')
      .argument('<name>', 'Name of the profile to use')
      .action((name: string) => {
        try {
          if (configStore.setCurrentProfile(name.trim())) {
            console.log(chalk.green(`✅ Profile "${name}" set as current profile.`));
          } else {
            console.error(chalk.red(`❌ Error: Profile "${name}" not found.`));
            console.log(chalk.blue('💡 Tip: Use "llama-cli config list" to see available profiles.'));
          }
        } catch (error) {
          console.error(chalk.red(`❌ Error setting current profile: ${(error as Error).message}`));
          console.log(chalk.blue('💡 Tip: Please check your configuration file permissions.'));
        }
      })
  )
  .addCommand(
    new Command('remove')
      .description('Remove an LLM profile.')
      .argument('<name>', 'Name of the profile to remove')
      .action((name: string) => {
        try {
          if (configStore.deleteProfile(name.trim())) {
            console.log(chalk.green(`✅ Profile "${name}" removed successfully.`));

            if (configStore.getCurrentProfile()?.name === name) {
              const config = configStore.readConfig();
              delete config.currentProfile;
              configStore.writeConfig(config);
              console.log(chalk.yellow('⚠️  Current profile unset as it was removed.'));
              console.log(chalk.blue('💡 Tip: Use "llama-cli config use <name>" to set a new current profile.'));
            }
          } else {
            console.error(chalk.red(`❌ Error: Profile "${name}" not found.`));
            console.log(chalk.blue('💡 Tip: Use "llama-cli config list" to see available profiles.'));
          }
        } catch (error) {
          console.error(chalk.red(`❌ Error removing profile: ${(error as Error).message}`));
          console.log(chalk.blue('💡 Tip: Please check your configuration file permissions.'));
        }
      })
  );

// Register commands
registerChatCommand(program);
registerGetCommand(program);
registerMcpCommand(program);

async function runCli() {
  // Initialize MCP system (non-blocking, runs in background)
  initializeMcp().catch(error => {
    // Silently handle MCP initialization errors to not disrupt CLI startup
    console.debug('MCP initialization error:', error);
  });

  // Check if no arguments provided - should enter interactive chat mode
  if (process.argv.slice(2).length === 0) {
    // Check if we have a current profile
    const currentProfile = configStore.getCurrentProfile();

    if (!currentProfile) {
      // First-run experience
      await runFirstTimeSetup();
      return;
    }

    // Enter interactive chat mode
    const chatSession = new InteractiveChatSession();
    await chatSession.start();
    return;
  }

  program.parse(process.argv);
}

async function runFirstTimeSetup() {
  console.log(chalk.bold.blue('🎉 Welcome to LlamaCLI!'));
  console.log(chalk.gray('It looks like you\'re new here. Let\'s set up your first LLM connection.'));
  console.log();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'profileName',
      message: 'Enter a name for your new LLM profile:',
      default: 'default-ollama',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Profile name cannot be empty';
        }
        if (configStore.getProfile(input.trim())) {
          return 'A profile with this name already exists';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'llmType',
      message: 'Select the type of your LLM:',
      choices: [
        { name: 'Ollama (Local LLM runtime)', value: 'ollama' },
        { name: 'vLLM (High-performance inference server)', value: 'vllm' }
      ],
      default: 'ollama',
    },
    {
      type: 'input',
      name: 'endpoint',
      message: 'Enter the endpoint URL for your LLM:',
      default: 'http://localhost:11434',
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL (e.g., http://localhost:11434)';
        }
      }
    },
  ]);

  const newProfile: LLMProfile = {
    name: answers.profileName.trim(),
    type: answers.llmType as 'ollama' | 'vllm',
    endpoint: answers.endpoint.trim(),
  };

  try {
    configStore.setProfile(newProfile);
    configStore.setCurrentProfile(newProfile.name);

    console.log();
    console.log(chalk.green(`✅ Profile "${newProfile.name}" created and set as current.`));

    // Test connection
    console.log();
    const spinner = ora('Testing connection to your LLM backend...').start();

    try {
      const connectionResult = await AdapterFactory.testConnection(newProfile);

      if (connectionResult.success) {
        spinner.succeed(chalk.green('Connection successful!'));

        if (connectionResult.models && connectionResult.models.length > 0) {
          console.log(chalk.blue(`📦 Available models: ${connectionResult.models.slice(0, 3).join(', ')}${connectionResult.models.length > 3 ? '...' : ''}`));
        }

        console.log();
        console.log(chalk.blue('🚀 Setup complete! You can now use LlamaCLI.'));
        console.log();
        console.log(chalk.bold('Quick start:'));
        console.log(chalk.gray('  llama-cli get "Hello, how are you?"  # One-shot query'));
        console.log(chalk.gray('  llama-cli                           # Interactive chat (coming soon)'));
        console.log();

      } else {
        spinner.fail(chalk.red('Connection failed!'));
        console.log(chalk.red(`❌ Error: ${connectionResult.error}`));
        console.log();
        console.log(chalk.yellow('⚠️  Your profile has been saved, but the connection test failed.'));
        console.log(chalk.blue('💡 Tips to fix this:'));
        console.log(chalk.gray('  • Make sure Ollama is running: ollama serve'));
        console.log(chalk.gray('  • Check the endpoint URL is correct'));
        console.log(chalk.gray('  • Try: llama-cli config list to verify your settings'));
        console.log();
      }

    } catch (testError) {
      spinner.fail(chalk.red('Connection test failed!'));
      console.log(chalk.red(`❌ Error: ${(testError as Error).message}`));
      console.log(chalk.yellow('⚠️  Your profile has been saved, but we couldn\'t test the connection.'));
      console.log(chalk.blue('💡 Tip: You can test it later with: llama-cli get "test"'));
      console.log();
    }

  } catch (error) {
    console.error(chalk.red(`❌ Error saving configuration: ${(error as Error).message}`));
    console.log(chalk.blue('💡 Tip: Please check your file permissions and try again.'));
    process.exit(1);
  }
}

runCli();