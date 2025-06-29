import {Command} from 'commander'; // 引入 commander 库
import {ConfigStore, LLMProfile} from './lib/config-store.js'; // 引入 ConfigStore

const program = new Command();
const configStore = new ConfigStore();

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

// 解析命令行参数
program.parse(process.argv);

// 如果没有指定命令，则显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}