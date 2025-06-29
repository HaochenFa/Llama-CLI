import * as fs from 'fs';
import * as path from 'path';
import {homedir} from 'os'; // 用于获取用户主目录

// 定义配置文件的类型结构
export interface LLMProfile {
  type: 'ollama' | 'vllm';
  name: string;
  endpoint: string;
  // 可以在后续添加更多配置项，例如 API Key 等
}

export interface LlamaCLIConfig {
  currentProfile?: string; // 当前激活的 LLM profile 名称
  profiles: { [key: string]: LLMProfile }; // 存储所有 LLM profile
  // 可以在后续添加其他全局配置
}

export class ConfigStore {
  private configPath: string;
  private configDir: string;

  constructor() {
    this.configDir = path.join(homedir(), '.llama-cli');
    this.configPath = path.join(this.configDir, 'config.json');
  }

  /**
   * 确保配置目录存在。如果不存在则创建。
   */
  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, {recursive: true});
    }
  }

  /**
   * 读取配置文件内容。
   * 如果文件不存在或内容无效，则返回一个默认的空配置。
   */
  public readConfig(): LlamaCLIConfig {
    this.ensureConfigDir();
    if (!fs.existsSync(this.configPath)) {
      return {profiles: {}}; // 返回默认空配置
    }
    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(content) as LlamaCLIConfig;
    } catch (error) {
      console.error(`Error reading config file: ${(error as Error).message}`);
      return {profiles: {}}; // 读取失败时返回默认空配置
    }
  }

  /**
   * 将配置内容写入文件。
   * @param config 要写入的配置对象。
   */
  public writeConfig(config: LlamaCLIConfig): void {
    this.ensureConfigDir();
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error writing config file: ${(error as Error).message}`);
    }
  }

  /**
   * 获取指定名称的 LLM profile。
   * @param name profile 名称。
   * @returns 对应的 LLMProfile 对象，如果不存在则返回 undefined。
   */
  public getProfile(name: string): LLMProfile | undefined {
    const config = this.readConfig();
    return config.profiles[name];
  }

  /**
   * 添加或更新一个 LLM profile。
   * @param profile 要添加或更新的 LLMProfile 对象。
   */
  public setProfile(profile: LLMProfile): void {
    const config = this.readConfig();
    config.profiles[profile.name] = profile;
    this.writeConfig(config);
  }

  /**
   * 删除指定名称的 LLM profile。
   * @param name profile 名称。
   * @returns 删除是否成功。
   */
  public deleteProfile(name: string): boolean {
    const config = this.readConfig();
    if (config.profiles[name]) {
      delete config.profiles[name];
      this.writeConfig(config);
      return true;
    }
    return false;
  }

  /**
   * 列出所有已配置的 LLM profile 名称。
   * @returns profile 名称数组。
   */
  public listProfiles(): string[] {
    const config = this.readConfig();
    return Object.keys(config.profiles);
  }

  /**
   * 设置当前激活的 LLM profile。
   * @param name 要激活的 profile 名称。
   * @returns 设置是否成功。
   */
  public setCurrentProfile(name: string): boolean {
    const config = this.readConfig();
    if (config.profiles[name]) {
      config.currentProfile = name;
      this.writeConfig(config);
      return true;
    }
    return false;
  }

  /**
   * 获取当前激活的 LLM profile。
   * @returns 当前激活的 LLMProfile 对象，如果未设置则返回 undefined。
   */
  public getCurrentProfile(): LLMProfile | undefined {
    const config = this.readConfig();
    if (config.currentProfile && config.profiles[config.currentProfile]) {
      return config.profiles[config.currentProfile];
    }
    return undefined;
  }
}
