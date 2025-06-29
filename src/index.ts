import {Command} from 'commander';
import {ConfigStore, LLMProfile} from './lib/config-store.js';
import {ContextCompiler} from './lib/context-compiler.js'; // 引入 ContextCompiler
import {OllamaAdapter} from './lib/adapters/ollama.adapter.js'; // 引入 OllamaAdapter
import {InternalContext, ChatMessage} from './types/context.js'; // 引入 InternalContext 和 ChatMessage
import chalk from 'chalk'; // 引入 chalk 库

const program = new Command();
const configStore = new ConfigStore();
const contextCompiler = new ContextCompiler(); // 实例化 ContextCompiler


// 定义 CLI 的基本信息
program
  .name('llama-cli')
  .description('LlamaCLI - Your AI-powered development companion.')
  .version('0.0.1'); // 初始版本号

// 定义 'config' 命令
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
        // 首次添加后自动设置为当前 profile
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
          // 如果删除的是当前 profile，则清空当前 profile 设置
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

// 定义 'chat' 命令
program
  .command('chat')
  .description('Start an interactive chat session with the LLM.')
  .argument('<prompt>', 'Your message to the LLM.')
  .action(async (prompt: string) => {
    const currentProfile = configStore.getCurrentProfile();
    if (!currentProfile) {
      console.error('Error: No LLM profile is currently active. Please use "llama-cli config add" to add a profile and "llama-cli config use" to set it as current.');
      return;
    }

    let llmAdapter;
    switch (currentProfile.type) {
      case 'ollama':
        llmAdapter = new OllamaAdapter(currentProfile.endpoint);
        break;
      case 'vllm':
        console.error('Error: vLLM adapter is not yet implemented.');
        return;
      default:
        console.error(`Error: Unsupported LLM type: ${currentProfile.type}`);
        return;
    }

    // 构造一个简单的 InternalContext
    const internalContext: InternalContext = {
      long_term_memory: [],
      available_tools: [],
      file_context: [],
      chat_history: [], // 初始聊天历史为空
    };

    // 生成系统提示
    const systemPrompt = contextCompiler.compile(internalContext);

    // 构造聊天消息
    const messages: ChatMessage[] = [
      {role: 'system', content: systemPrompt},
      {role: 'user', content: prompt},
    ];

    console.log('LlamaCLI is thinking...');
    let inThinkBlock = false; // 标记是否在思考块内部
    try {
      for await (const chunk of llmAdapter.chatStream(messages)) {
        // 检查是否进入或退出思考块
        if (chunk.includes('<think>')) {
          inThinkBlock = true;
          // 移除 <think> 标签，只处理其后的内容
          const content = chunk.replace('<think>', '');
          process.stdout.write(chalk.grey(content));
        } else if (chunk.includes('</think>')) {
          inThinkBlock = false;
          // 移除 </think> 标签，只处理其前的内容
          const content = chunk.replace('</think>', '');
          process.stdout.write(chalk.grey(content));
        } else if (inThinkBlock) {
          process.stdout.write(chalk.grey(chunk)); // 思考块内部内容以灰色显示
        } else {
          process.stdout.write(chunk); // 正常内容
        }
      }
      process.stdout.write('\n'); // 确保最后换行
    } catch (error) {
      console.error('\nError during chat session:', (error as Error).message);
    }
  });

// 解析命令行参数
program.parse(process.argv);

// 如果没有指定命令，则显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}