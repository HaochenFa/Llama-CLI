/**
 * Configuration store implementation for LlamaCLI
 * Handles loading, saving, and managing configuration data
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { LlamaCLIConfig, DEFAULT_CONFIG, validateConfig, mergeConfigs } from "./config.js";

export class ConfigStore {
  private configPath: string;
  private dataDir: string;
  private config: LlamaCLIConfig;
  private watchers: Set<(config: LlamaCLIConfig) => void> = new Set();

  constructor() {
    this.dataDir = path.join(os.homedir(), ".llamacli");
    this.configPath = path.join(this.dataDir, "config.json");
    this.config = DEFAULT_CONFIG;
  }

  async initialize(): Promise<void> {
    await this.ensureDataDir();
    await this.loadConfig();
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, "utf8");
      const parsed = JSON.parse(data);

      // Validate the loaded config
      const validation = validateConfig(parsed);
      if (!validation.valid) {
        console.warn("Configuration validation failed:", validation.errors);
        // Use default config with any valid parts merged in
        this.config = mergeConfigs(DEFAULT_CONFIG, parsed);
      } else {
        this.config = mergeConfigs(DEFAULT_CONFIG, parsed);
      }
    } catch (error) {
      // Configuration file doesn't exist or is corrupted, use default
      console.log("Using default configuration");
      await this.saveConfig();
    }
  }

  async saveConfig(): Promise<void> {
    const data = JSON.stringify(this.config, null, 2);
    await fs.writeFile(this.configPath, data, "utf8");
    this.notifyWatchers();
  }

  // Profile management
  addProfile(profile: any): void {
    this.config.llm.profiles.push(profile);
  }

  removeProfile(id: string): void {
    // Check if profile exists
    const profileExists = this.config.llm.profiles.some((p) => p.id === id);
    if (!profileExists) {
      throw new Error(`Profile '${id}' not found`);
    }

    // Remove the profile
    this.config.llm.profiles = this.config.llm.profiles.filter((p) => p.id !== id);

    // If we removed the active profile, we need to handle defaultProfile
    if (id === this.config.llm.defaultProfile) {
      if (this.config.llm.profiles.length > 0) {
        // Set the first remaining profile as active
        this.config.llm.defaultProfile = this.config.llm.profiles[0].id;
      } else {
        // No profiles left, clear the default
        this.config.llm.defaultProfile = "";
      }
    }
  }

  setActiveProfile(id: string): void {
    const profile = this.config.llm.profiles.find((p) => p.id === id);
    if (!profile) {
      throw new Error(`Profile '${id}' not found`);
    }
    this.config.llm.defaultProfile = id;
  }

  getActiveProfile(): any | null {
    const activeId = this.config.llm.defaultProfile;
    return this.config.llm.profiles.find((p) => p.id === activeId) || null;
  }

  getAllProfiles(): any[] {
    return this.config.llm.profiles;
  }

  // Configuration watching
  onConfigChange(callback: (config: LlamaCLIConfig) => void): () => void {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }

  private notifyWatchers(): void {
    this.watchers.forEach((callback) => callback(this.config));
  }

  // Getter methods
  getConfig(): LlamaCLIConfig {
    return { ...this.config };
  }

  getDataDir(): string {
    return this.dataDir;
  }
}
