import {Command} from 'commander';
import {ConfigStore, LLMProfile} from './lib/config-store.js';
import {ContextCompiler} from './lib/context-compiler.js'; // 引入 ContextCompiler
import {OllamaAdapter} from './lib/adapters/ollama.adapter.js'; // 引入 OllamaAdapter
import {ToolDispatcher} from './lib/tool-dispatcher.js'; // 引入 ToolDispatcher
import inquirer from 'inquirer'; // 引入 inquirer
import {InternalContext, ChatMessage} from './types/context.js'; // 引入 InternalContext 和 ChatMessage
import chalk from 'chalk'; // 引入 chalk 库

const program = new Command();
const configStore = new ConfigStore();
const contextCompiler = new ContextCompiler(); // 实例化 ContextCompiler
const toolDispatcher = new ToolDispatcher([]); // 实例化 ToolDispatcher，初始工具列表为空


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

    // 示例：添加一个 native 工具到 ToolDispatcher
    toolDispatcher.availableTools.push({
      type: 'native',
      name: 'echo',
      description: 'Echoes a message back.',
      schema: {type: 'object', properties: {message: {type: 'string'}}}
    });

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
    let messages: ChatMessage[] = [
      {role: 'system', content: systemPrompt},
      {role: 'user', content: prompt},
    ];

    // Agentic Loop
    let currentMessages = [...messages]; // 复制消息数组，以便在循环中修改
    let loopCount = 0;
    const MAX_LOOP_COUNT = 5; // 防止无限循环，可以根据需要调整

    while (loopCount < MAX_LOOP_COUNT) {
      console.log('LlamaCLI is thinking...');
      let inThinkBlock = false; // 标记是否在思考块内部
      let fullResponse = ''; // 收集完整的 LLM 响应

      try {
        for await (const chunk of llmAdapter.chatStream(currentMessages, internalContext.available_tools)) { // 传递 available_tools
          fullResponse += chunk; // 收集所有 chunk
          // 检查是否进入或退出思考块
          if (chunk.includes('<think>')) {
            inThinkBlock = true;
            const content = chunk.replace('<think>', '');
            process.stdout.write(chalk.grey(content));
          } else if (chunk.includes('</think>')) {
            inThinkBlock = false;
            const content = chunk.replace('</think>', '');
            process.stdout.write(chalk.grey(content));
          } else if (inThinkBlock) {
            process.stdout.write(chalk.grey(chunk));
          } else {
            process.stdout.write(chunk);
          }
        }
        process.stdout.write('\n'); // 确保最后换行

        // 检查 LLM 响应是否包含工具调用指令
        const toolCallMatch = fullResponse.match(/<tool_code>(.*?)<\/tool_code>/s);
        if (toolCallMatch && toolCallMatch[1]) {
          const toolCallString = toolCallMatch[1];
          console.log(chalk.yellow(`\nTool call detected: ${toolCallString}`));
          try {
            const toolCall = JSON.parse(toolCallString);
            const toolResult = await toolDispatcher.dispatch(toolCall);
            console.log(chalk.green(`Tool result: ${toolResult.content}`));
            currentMessages.push({role: 'assistant', content: fullResponse}); // 将 LLM 的响应（包含工具调用）添加到历史
            currentMessages.push(toolResult); // 将工具结果添加到历史
            loopCount++; // 增加循环计数
            continue; // 继续 Agentic Loop
          } catch (parseError) {
            console.error(chalk.red(`Error parsing tool call JSON: ${(parseError as Error).message}`));
            currentMessages.push({role: 'assistant', content: fullResponse}); // 将 LLM 的响应添加到历史
            currentMessages.push({
              role: 'tool',
              content: `Error parsing tool call JSON: ${(parseError as Error).message}`
            });
            break; // 退出循环
          }
        } else {
          // 如果没有工具调用，则 LLM 提供了最终答案
          currentMessages.push({role: 'assistant', content: fullResponse}); // 将 LLM 的响应添加到历史
          break; // 退出循环
        }
      } catch (error) {
        console.error('\nError during chat session:', (error as Error).message);
        break; // 退出循环
      }
    }
  });

// 在解析命令行参数之前，检查并处理首次运行/配置向导
async function runCli() {
  // 如果没有指定任何命令，并且没有激活的 profile，则启动配置向导
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
        choices: ['ollama', 'vllm'], // 暂时只支持这两种
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
    return; // 配置完成后退出
  }

  // 解析命令行参数
  program.parse(process.argv);
}

runCli();
