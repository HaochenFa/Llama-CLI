# LlamaCLI 技术实现规范

## 1. 核心架构技术规范

### 1.1 项目配置文件

#### 根目录 package.json

```json
{
  "name": "llamacli",
  "version": "1.0.0",
  "description": "AI-powered command line development partner",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev": "npm run dev --workspace=@llamacli/cli",
    "test": "vitest",
    "lint": "eslint packages/*/src/**/*.ts",
    "format": "prettier --write packages/*/src/**/*.ts"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "esbuild": "^0.19.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

#### esbuild.config.js

```javascript
const esbuild = require("esbuild");
const path = require("path");

const buildPackage = async (packageName, entryPoint, outfile) => {
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile,
    platform: "node",
    target: "node18",
    format: "cjs",
    external: ["react", "ink"],
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV !== "production",
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    },
  });
};

const main = async () => {
  // Build core package
  await buildPackage("core", "packages/core/src/index.ts", "packages/core/dist/index.js");

  // Build CLI package
  await buildPackage("cli", "packages/cli/src/index.ts", "packages/cli/dist/index.js");

  console.log("Build completed!");
};

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { buildPackage };
```

### 1.2 TypeScript 配置

#### 根目录 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@llamacli/core": ["./packages/core/src"],
      "@llamacli/cli": ["./packages/cli/src"]
    }
  },
  "references": [{ "path": "./packages/core" }, { "path": "./packages/cli" }],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## 2. 核心包 (packages/core) 技术实现

### 2.1 类型定义系统

#### packages/core/src/types/context.ts

```typescript
export interface LLMProfile {
  name: string;
  type: "ollama" | "vllm" | "openai" | "claude";
  endpoint: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ToolDefinition {
  type: "native" | "mcp";
  name: string;
  description: string;
  schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  endpoint?: string;
  serverId?: string;
}

export interface FileContext {
  path: string;
  content: string;
  lastModified: number;
  size: number;
  encoding: "utf8" | "binary";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  timestamp: number;
  id: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface InternalContext {
  sessionId: string;
  activeProfile: string;
  longTermMemory: string[];
  availableTools: ToolDefinition[];
  fileContext: FileContext[];
  chatHistory: ChatMessage[];
  sessionMetadata: {
    createdAt: number;
    lastActivity: number;
    messageCount: number;
    toolCallCount: number;
  };
  settings: {
    maxHistoryLength: number;
    maxFileContextSize: number;
    autoSaveInterval: number;
    confirmDestructiveActions: boolean;
  };
}
```

#### packages/core/src/types/adapters.ts

```typescript
export interface LLMAdapter {
  name: string;
  type: string;

  // 连接管理
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // 配置验证
  validateConfig(config: any): Promise<boolean>;

  // 聊天接口
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatStreamChunk>;

  // 工具调用支持
  supportsToolCalls(): boolean;

  // 模型信息
  getAvailableModels(): Promise<string[]>;
  getCurrentModel(): string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
}

export interface ChatStreamChunk {
  type: "content" | "tool_call" | "done" | "error";
  content?: string;
  toolCall?: ToolCall;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AdapterConfig {
  type: string;
  endpoint: string;
  model: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  customHeaders?: Record<string, string>;
}
```

### 2.2 配置管理系统

#### packages/core/src/config/config.ts

```typescript
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { LLMProfile, InternalContext } from "../types/context.js";

export interface ConfigData {
  version: string;
  profiles: Record<string, LLMProfile>;
  activeProfile: string;
  globalSettings: {
    dataDir: string;
    logLevel: "debug" | "info" | "warn" | "error";
    telemetry: boolean;
    autoUpdate: boolean;
    theme: "dark" | "light" | "auto";
  };
  mcpServers: MCPServerConfig[];
  toolSettings: {
    enabledTools: string[];
    disabledTools: string[];
    toolTimeout: number;
    confirmDestructive: boolean;
  };
}

export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
  enabled: boolean;
}

export class ConfigStore {
  private configPath: string;
  private dataDir: string;
  private config: ConfigData;
  private watchers: Set<(config: ConfigData) => void> = new Set();

  constructor() {
    this.dataDir = path.join(os.homedir(), ".llama-cli");
    this.configPath = path.join(this.dataDir, "config.json");
    this.config = this.getDefaultConfig();
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

  private getDefaultConfig(): ConfigData {
    return {
      version: "1.0.0",
      profiles: {
        "ollama-default": {
          name: "Ollama Default",
          type: "ollama",
          endpoint: "http://localhost:11434",
          model: "llama3.2",
          temperature: 0.7,
          maxTokens: 4096,
        },
      },
      activeProfile: "ollama-default",
      globalSettings: {
        dataDir: this.dataDir,
        logLevel: "info",
        telemetry: false,
        autoUpdate: true,
        theme: "auto",
      },
      mcpServers: [],
      toolSettings: {
        enabledTools: ["filesystem", "web", "shell"],
        disabledTools: [],
        toolTimeout: 30000,
        confirmDestructive: true,
      },
    };
  }

  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, "utf8");
      const parsed = JSON.parse(data);
      this.config = { ...this.getDefaultConfig(), ...parsed };
    } catch (error) {
      // 配置文件不存在或损坏，使用默认配置
      await this.saveConfig();
    }
  }

  async saveConfig(): Promise<void> {
    const data = JSON.stringify(this.config, null, 2);
    await fs.writeFile(this.configPath, data, "utf8");
    this.notifyWatchers();
  }

  // Profile 管理
  addProfile(profile: LLMProfile): void {
    this.config.profiles[profile.name] = profile;
  }

  removeProfile(name: string): void {
    if (name === this.config.activeProfile) {
      throw new Error("Cannot remove active profile");
    }
    delete this.config.profiles[name];
  }

  setActiveProfile(name: string): void {
    if (!this.config.profiles[name]) {
      throw new Error(`Profile '${name}' not found`);
    }
    this.config.activeProfile = name;
  }

  getActiveProfile(): LLMProfile | null {
    return this.config.profiles[this.config.activeProfile] || null;
  }

  getAllProfiles(): LLMProfile[] {
    return Object.values(this.config.profiles);
  }

  // MCP 服务器管理
  addMCPServer(server: MCPServerConfig): void {
    const existing = this.config.mcpServers.findIndex((s) => s.id === server.id);
    if (existing >= 0) {
      this.config.mcpServers[existing] = server;
    } else {
      this.config.mcpServers.push(server);
    }
  }

  removeMCPServer(id: string): void {
    this.config.mcpServers = this.config.mcpServers.filter((s) => s.id !== id);
  }

  getMCPServers(): MCPServerConfig[] {
    return this.config.mcpServers.filter((s) => s.enabled);
  }

  // 配置监听
  onConfigChange(callback: (config: ConfigData) => void): () => void {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }

  private notifyWatchers(): void {
    this.watchers.forEach((callback) => callback(this.config));
  }

  // Getter 方法
  getConfig(): ConfigData {
    return { ...this.config };
  }

  getDataDir(): string {
    return this.dataDir;
  }
}
```

### 2.3 LLM 适配器实现

#### packages/core/src/adapters/base.ts

```typescript
import { LLMAdapter, ChatOptions, ChatStreamChunk, AdapterConfig } from "../types/adapters.js";
import { ChatMessage, ToolDefinition } from "../types/context.js";

export abstract class BaseLLMAdapter implements LLMAdapter {
  abstract name: string;
  abstract type: string;

  protected config: AdapterConfig;
  protected connected: boolean = false;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract validateConfig(config: any): Promise<boolean>;
  abstract chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<ChatStreamChunk>;
  abstract getAvailableModels(): Promise<string[]>;

  isConnected(): boolean {
    return this.connected;
  }

  getCurrentModel(): string {
    return this.config.model;
  }

  supportsToolCalls(): boolean {
    return true; // 大多数现代模型都支持工具调用
  }

  protected async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const headers = {
      "Content-Type": "application/json",
      ...this.config.customHeaders,
      ...options.headers,
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  protected formatMessages(messages: ChatMessage[]): any[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
    }));
  }

  protected formatTools(tools: ToolDefinition[]): any[] {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema,
      },
    }));
  }
}
```

#### packages/core/src/adapters/ollama.ts

```typescript
import { BaseLLMAdapter } from "./base.js";
import { ChatMessage, ToolCall } from "../types/context.js";
import { ChatOptions, ChatStreamChunk, AdapterConfig } from "../types/adapters.js";

export class OllamaAdapter extends BaseLLMAdapter {
  name = "Ollama";
  type = "ollama";

  async connect(): Promise<void> {
    try {
      const response = await this.makeRequest(`${this.config.endpoint}/api/tags`, {
        method: "GET",
      });

      const data = await response.json();
      const models = data.models || [];

      if (!models.some((m: any) => m.name === this.config.model)) {
        throw new Error(`Model '${this.config.model}' not found`);
      }

      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to Ollama: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async validateConfig(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${config.endpoint}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncIterable<ChatStreamChunk> {
    const payload = {
      model: this.config.model,
      messages: this.formatMessages(messages),
      stream: true,
      options: {
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        num_predict: options.maxTokens ?? this.config.maxTokens ?? 4096,
      },
      ...(options.tools && { tools: this.formatTools(options.tools) }),
    };

    try {
      const response = await this.makeRequest(`${this.config.endpoint}/api/chat`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);

                if (data.error) {
                  yield { type: "error", error: data.error };
                  return;
                }

                if (data.message?.content) {
                  yield { type: "content", content: data.message.content };
                }

                if (data.message?.tool_calls) {
                  for (const toolCall of data.message.tool_calls) {
                    yield { type: "tool_call", toolCall };
                  }
                }

                if (data.done) {
                  yield { type: "done" };
                  return;
                }
              } catch (parseError) {
                console.warn("Failed to parse Ollama response:", parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      yield { type: "error", error: error.message };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.makeRequest(`${this.config.endpoint}/api/tags`, {
        method: "GET",
      });

      const data = await response.json();
      return (data.models || []).map((m: any) => m.name);
    } catch {
      return [];
    }
  }
}
```

### 2.4 MCP 协议实现

#### packages/core/src/mcp/types.ts

```typescript
export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: {
    name: string;
    description?: string;
    required?: boolean;
  }[];
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
}

export interface MCPClientCapabilities {
  roots?: {
    listChanged?: boolean;
  };
  sampling?: {};
}

export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: MCPClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}
```

#### packages/core/src/mcp/client.ts

```typescript
import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPTool,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPServerCapabilities,
} from "./types.js";
import { MCPServerConfig } from "../config/config.js";

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private initialized = false;
  private capabilities: MCPServerCapabilities = {};
  private serverInfo: { name: string; version: string } | null = null;

  constructor(private config: MCPServerConfig) {
    super();
  }

  async connect(): Promise<void> {
    if (this.process) {
      throw new Error("Already connected");
    }

    this.process = spawn(this.config.command, this.config.args, {
      cwd: this.config.cwd,
      env: { ...process.env, ...this.config.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.setupProcessHandlers();
    await this.initialize();
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.initialized = false;
    this.clearPendingRequests();
  }

  private setupProcessHandlers(): void {
    if (!this.process) return;

    let buffer = "";

    this.process.stdout?.on("data", (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.handleMessage(message);
          } catch (error) {
            console.warn("Failed to parse MCP message:", error);
          }
        }
      }
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      console.error("MCP Server Error:", data.toString());
    });

    this.process.on("exit", (code) => {
      console.log(`MCP Server exited with code ${code}`);
      this.emit("disconnect");
    });

    this.process.on("error", (error) => {
      console.error("MCP Server Process Error:", error);
      this.emit("error", error);
    });
  }

  private handleMessage(message: MCPResponse | MCPNotification): void {
    if ("id" in message) {
      // Response
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    } else {
      // Notification
      this.emit("notification", message);
    }
  }

  private async initialize(): Promise<void> {
    const params: MCPInitializeParams = {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
      },
      clientInfo: {
        name: "LlamaCLI",
        version: "1.0.0",
      },
    };

    const result: MCPInitializeResult = await this.sendRequest("initialize", params);

    this.capabilities = result.capabilities;
    this.serverInfo = result.serverInfo;
    this.initialized = true;

    // Send initialized notification
    await this.sendNotification("notifications/initialized");
  }

  async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process) {
      throw new Error("Not connected");
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: "2.0",
      id,
      method,
      ...(params && { params }),
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const message = JSON.stringify(request) + "\n";
      this.process!.stdin?.write(message);
    });
  }

  async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.process) {
      throw new Error("Not connected");
    }

    const notification: MCPNotification = {
      jsonrpc: "2.0",
      method,
      ...(params && { params }),
    };

    const message = JSON.stringify(notification) + "\n";
    this.process.stdin?.write(message);
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.initialized) {
      throw new Error("Not initialized");
    }

    const result = await this.sendRequest("tools/list");
    return result.tools || [];
  }

  async callTool(name: string, arguments_: any): Promise<any> {
    if (!this.initialized) {
      throw new Error("Not initialized");
    }

    return await this.sendRequest("tools/call", {
      name,
      arguments: arguments_,
    });
  }

  private clearPendingRequests(): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();
  }

  isConnected(): boolean {
    return this.process !== null && !this.process.killed;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getCapabilities(): MCPServerCapabilities {
    return this.capabilities;
  }

  getServerInfo(): { name: string; version: string } | null {
    return this.serverInfo;
  }
}
```

### 2.5 工具系统实现

#### packages/core/src/tools/base.ts

```typescript
import { ToolDefinition, ToolResult } from "../types/context.js";

export interface ToolHandler {
  name: string;
  description: string;
  schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };

  execute(params: any, signal: AbortSignal): Promise<ToolResult>;
  shouldConfirm?(params: any): Promise<boolean>;
  validateParams?(params: any): Promise<boolean>;
}

export abstract class BaseTool implements ToolHandler {
  abstract name: string;
  abstract description: string;
  abstract schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };

  abstract execute(params: any, signal: AbortSignal): Promise<ToolResult>;

  async shouldConfirm(params: any): Promise<boolean> {
    return false; // 默认不需要确认
  }

  async validateParams(params: any): Promise<boolean> {
    // 基础参数验证
    if (!params || typeof params !== "object") {
      return false;
    }

    // 检查必需参数
    if (this.schema.required) {
      for (const required of this.schema.required) {
        if (!(required in params)) {
          return false;
        }
      }
    }

    return true;
  }

  protected createSuccessResult(
    toolCallId: string,
    content: string,
    metadata?: Record<string, any>
  ): ToolResult {
    return {
      tool_call_id: toolCallId,
      content,
      success: true,
      metadata,
    };
  }

  protected createErrorResult(
    toolCallId: string,
    error: string,
    metadata?: Record<string, any>
  ): ToolResult {
    return {
      tool_call_id: toolCallId,
      content: `Error: ${error}`,
      success: false,
      error,
      metadata,
    };
  }

  toDefinition(): ToolDefinition {
    return {
      type: "native",
      name: this.name,
      description: this.description,
      schema: this.schema,
    };
  }
}
```

#### packages/core/src/tools/filesystem/read-file.ts

```typescript
import * as fs from "fs/promises";
import * as path from "path";
import { BaseTool } from "../base.js";
import { ToolResult } from "../../types/context.js";

export class ReadFileTool extends BaseTool {
  name = "read_file";
  description = "Read the contents of a file";
  schema = {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "The path to the file to read",
      },
      encoding: {
        type: "string",
        enum: ["utf8", "base64"],
        default: "utf8",
        description: "The encoding to use when reading the file",
      },
    },
    required: ["path"],
  };

  async execute(params: any, signal: AbortSignal): Promise<ToolResult> {
    const { path: filePath, encoding = "utf8" } = params;
    const toolCallId = params._toolCallId || "unknown";

    try {
      // 安全检查：确保路径在允许的范围内
      const resolvedPath = path.resolve(filePath);
      const cwd = process.cwd();

      if (!resolvedPath.startsWith(cwd)) {
        return this.createErrorResult(
          toolCallId,
          "Access denied: Path is outside current working directory"
        );
      }

      // 检查文件是否存在
      const stats = await fs.stat(resolvedPath);

      if (!stats.isFile()) {
        return this.createErrorResult(toolCallId, "Path is not a file");
      }

      // 检查文件大小（限制为 10MB）
      if (stats.size > 10 * 1024 * 1024) {
        return this.createErrorResult(toolCallId, "File too large (max 10MB)");
      }

      // 读取文件
      const content = await fs.readFile(resolvedPath, encoding as any);

      return this.createSuccessResult(toolCallId, content, {
        path: resolvedPath,
        size: stats.size,
        encoding,
        lastModified: stats.mtime.toISOString(),
      });
    } catch (error) {
      return this.createErrorResult(toolCallId, `Failed to read file: ${error.message}`);
    }
  }

  async shouldConfirm(params: any): Promise<boolean> {
    // 读取文件通常不需要确认
    return false;
  }
}
```

#### packages/core/src/tools/filesystem/write-file.ts

```typescript
import * as fs from "fs/promises";
import * as path from "path";
import { BaseTool } from "../base.js";
import { ToolResult } from "../../types/context.js";

export class WriteFileTool extends BaseTool {
  name = "write_file";
  description = "Write content to a file";
  schema = {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "The path to the file to write",
      },
      content: {
        type: "string",
        description: "The content to write to the file",
      },
      encoding: {
        type: "string",
        enum: ["utf8", "base64"],
        default: "utf8",
        description: "The encoding to use when writing the file",
      },
      createDirs: {
        type: "boolean",
        default: false,
        description: "Whether to create parent directories if they do not exist",
      },
    },
    required: ["path", "content"],
  };

  async execute(params: any, signal: AbortSignal): Promise<ToolResult> {
    const { path: filePath, content, encoding = "utf8", createDirs = false } = params;
    const toolCallId = params._toolCallId || "unknown";

    try {
      // 安全检查
      const resolvedPath = path.resolve(filePath);
      const cwd = process.cwd();

      if (!resolvedPath.startsWith(cwd)) {
        return this.createErrorResult(
          toolCallId,
          "Access denied: Path is outside current working directory"
        );
      }

      // 创建父目录（如果需要）
      if (createDirs) {
        const dir = path.dirname(resolvedPath);
        await fs.mkdir(dir, { recursive: true });
      }

      // 写入文件
      await fs.writeFile(resolvedPath, content, encoding as any);

      // 获取文件信息
      const stats = await fs.stat(resolvedPath);

      return this.createSuccessResult(toolCallId, `File written successfully: ${resolvedPath}`, {
        path: resolvedPath,
        size: stats.size,
        encoding,
        lastModified: stats.mtime.toISOString(),
      });
    } catch (error) {
      return this.createErrorResult(toolCallId, `Failed to write file: ${error.message}`);
    }
  }

  async shouldConfirm(params: any): Promise<boolean> {
    // 写入文件需要确认，特别是覆盖现有文件时
    try {
      const resolvedPath = path.resolve(params.path);
      await fs.access(resolvedPath);
      return true; // 文件存在，需要确认覆盖
    } catch {
      return false; // 文件不存在，不需要确认
    }
  }
}
```

## 3. CLI 包 (packages/cli) 技术实现

### 3.1 命令行入口

#### packages/cli/src/index.ts

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { ChatCommand } from "./commands/chat.js";
import { ConfigCommand } from "./commands/config.js";
import { GetCommand } from "./commands/get.js";
import { ConfigStore } from "@llamacli/core";

const program = new Command();

program
  .name("llamacli")
  .description("AI-powered command line development partner")
  .version("1.0.0");

// 初始化配置
const configStore = new ConfigStore();
await configStore.initialize();

// 聊天命令（默认）
program
  .command("chat", { isDefault: true })
  .description("Start an interactive chat session")
  .option("-p, --profile <name>", "Use specific LLM profile")
  .option("-f, --file <path>", "Include file in context")
  .option("-d, --directory <path>", "Set working directory")
  .option("--no-tools", "Disable tool usage")
  .option("--yolo", "Auto-approve all tool calls")
  .action(async (options) => {
    const chatCommand = new ChatCommand(configStore);
    await chatCommand.run(options);
  });

// 快速查询命令
program
  .command("get <query>")
  .description("Quick query without interactive session")
  .option("-p, --profile <name>", "Use specific LLM profile")
  .option("-f, --file <path>", "Include file in context")
  .action(async (query, options) => {
    const getCommand = new GetCommand(configStore);
    await getCommand.run(query, options);
  });

// 配置命令
const configCmd = program.command("config").description("Manage configuration");

configCmd
  .command("list")
  .description("List all profiles")
  .action(async () => {
    const configCommand = new ConfigCommand(configStore);
    await configCommand.listProfiles();
  });

configCmd
  .command("add <name>")
  .description("Add a new profile")
  .option("-t, --type <type>", "LLM type (ollama, openai, claude, vllm)")
  .option("-e, --endpoint <url>", "API endpoint")
  .option("-m, --model <name>", "Model name")
  .option("-k, --api-key <key>", "API key")
  .action(async (name, options) => {
    const configCommand = new ConfigCommand(configStore);
    await configCommand.addProfile(name, options);
  });

configCmd
  .command("use <name>")
  .description("Set active profile")
  .action(async (name) => {
    const configCommand = new ConfigCommand(configStore);
    await configCommand.setActiveProfile(name);
  });

configCmd
  .command("remove <name>")
  .description("Remove a profile")
  .action(async (name) => {
    const configCommand = new ConfigCommand(configStore);
    await configCommand.removeProfile(name);
  });

program.parse();
```

### 3.2 聊天命令实现

#### packages/cli/src/commands/chat.ts

```typescript
import React from "react";
import { render } from "ink";
import { ChatInterface } from "../ui/components/ChatInterface.js";
import { ConfigStore, AgenticLoop, ContextCompiler, ToolScheduler } from "@llamacli/core";
import { createAdapter } from "../utils/adapter-factory.js";
import { createContext } from "../utils/context-factory.js";

export interface ChatOptions {
  profile?: string;
  file?: string;
  directory?: string;
  tools?: boolean;
  yolo?: boolean;
}

export class ChatCommand {
  constructor(private configStore: ConfigStore) {}

  async run(options: ChatOptions): Promise<void> {
    try {
      // 获取配置
      const profileName = options.profile || this.configStore.getConfig().activeProfile;
      const profile = this.configStore.getActiveProfile();

      if (!profile) {
        console.error("No active profile found. Please configure a profile first.");
        process.exit(1);
      }

      // 创建适配器
      const adapter = createAdapter(profile);
      await adapter.connect();

      // 创建上下文
      const context = await createContext({
        workingDirectory: options.directory,
        includeFiles: options.file ? [options.file] : [],
        enableTools: options.tools !== false,
      });

      // 创建核心组件
      const contextCompiler = new ContextCompiler();
      const toolScheduler = new ToolScheduler({
        autoApprove: options.yolo || false,
      });
      const agenticLoop = new AgenticLoop({
        adapter,
        contextCompiler,
        toolScheduler,
      });

      // 渲染 React UI
      const { unmount } = render(
        React.createElement(ChatInterface, {
          agenticLoop,
          context,
          profile,
        })
      );

      // 处理退出信号
      process.on("SIGINT", () => {
        unmount();
        adapter.disconnect();
        process.exit(0);
      });
    } catch (error) {
      console.error("Failed to start chat:", error.message);
      process.exit(1);
    }
  }
}
```

### 3.3 React UI 组件

#### packages/cli/src/ui/components/ChatInterface.tsx

```typescript
import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { ChatHistory } from "./ChatHistory.js";
import { ChatInput } from "./ChatInput.js";
import { StatusBar } from "./StatusBar.js";
import { ToolConfirmation } from "./ToolConfirmation.js";
import { AgenticLoop, InternalContext, LLMProfile, ChatMessage } from "@llamacli/core";

export interface ChatInterfaceProps {
  agenticLoop: AgenticLoop;
  context: InternalContext;
  profile: LLMProfile;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ agenticLoop, context, profile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(context.chatHistory);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingToolCall, setPendingToolCall] = useState<any>(null);
  const [status, setStatus] = useState(`Connected to ${profile.name}`);

  // 处理用户输入
  const handleSubmit = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      setInput("");
      setIsLoading(true);
      setStatus("Thinking...");

      try {
        // 添加用户消息
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "user",
          content: message,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        context.chatHistory.push(userMessage);

        // 处理响应
        const response = await agenticLoop.processUserInput(message, context);

        // 添加助手响应
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        context.chatHistory.push(assistantMessage);

        setStatus(`Connected to ${profile.name}`);
      } catch (error) {
        setStatus(`Error: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [agenticLoop, context, profile, isLoading]
  );

  // 处理工具确认
  const handleToolConfirm = useCallback(
    async (approved: boolean) => {
      if (!pendingToolCall) return;

      if (approved) {
        // 执行工具调用
        setStatus("Executing tool...");
        // 实现工具执行逻辑
      }

      setPendingToolCall(null);
    },
    [pendingToolCall]
  );

  // 键盘快捷键
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* 标题栏 */}
      <Box borderStyle="single" paddingX={1}>
        <Text bold color="blue">
          🦙 LlamaCLI
        </Text>
        <Text> - {profile.name}</Text>
      </Box>

      {/* 聊天历史 */}
      <Box flexGrow={1} flexDirection="column" paddingX={1}>
        <ChatHistory messages={messages} />
      </Box>

      {/* 工具确认对话框 */}
      {pendingToolCall && (
        <ToolConfirmation toolCall={pendingToolCall} onConfirm={handleToolConfirm} />
      )}

      {/* 输入区域 */}
      <Box flexDirection="column">
        <StatusBar status={status} isLoading={isLoading} />
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isLoading}
          placeholder="Type your message..."
        />
      </Box>
    </Box>
  );
};
```

## 4. 构建和部署配置

### 4.1 包配置文件

#### packages/core/package.json

```json
{
  "name": "@llamacli/core",
  "version": "1.0.0",
  "description": "Core functionality for LlamaCLI",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "node ../../esbuild.config.js && tsc --emitDeclarationOnly",
    "dev": "node ../../esbuild.config.js --watch",
    "test": "vitest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "node-fetch": "^3.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

#### packages/cli/package.json

```json
{
  "name": "@llamacli/cli",
  "version": "1.0.0",
  "description": "Command line interface for LlamaCLI",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "llamacli": "dist/index.js",
    "llama": "dist/index.js"
  },
  "scripts": {
    "build": "node ../../esbuild.config.js",
    "dev": "node ../../esbuild.config.js --watch",
    "test": "vitest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@llamacli/core": "workspace:*",
    "commander": "^11.0.0",
    "ink": "^4.4.0",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

### 4.2 发布配置

#### scripts/publish.js

```javascript
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const packages = ["core", "cli"];

async function publishPackages() {
  console.log("Building packages...");
  execSync("npm run build", { stdio: "inherit" });

  console.log("Running tests...");
  execSync("npm test", { stdio: "inherit" });

  for (const pkg of packages) {
    const packagePath = path.join("packages", pkg);
    console.log(`Publishing ${pkg}...`);

    execSync("npm publish --access public", {
      cwd: packagePath,
      stdio: "inherit",
    });
  }

  console.log("All packages published successfully!");
}

publishPackages().catch(console.error);
```

## 5. 测试策略

### 5.1 单元测试示例

#### packages/core/src/adapters/ollama.test.ts

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { OllamaAdapter } from "./ollama.js";
import { AdapterConfig } from "../types/adapters.js";

// Mock fetch
global.fetch = vi.fn();

describe("OllamaAdapter", () => {
  let adapter: OllamaAdapter;
  let config: AdapterConfig;

  beforeEach(() => {
    config = {
      type: "ollama",
      endpoint: "http://localhost:11434",
      model: "llama3.2",
    };
    adapter = new OllamaAdapter(config);
    vi.clearAllMocks();
  });

  describe("connect", () => {
    it("should connect successfully when model exists", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            models: [{ name: "llama3.2" }],
          }),
      };

      (fetch as any).mockResolvedValueOnce(mockResponse);

      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it("should throw error when model does not exist", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            models: [{ name: "other-model" }],
          }),
      };

      (fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(adapter.connect()).rejects.toThrow("Model 'llama3.2' not found");
    });
  });

  describe("chatStream", () => {
    it("should stream chat responses", async () => {
      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  JSON.stringify({
                    message: { content: "Hello" },
                  }) + "\n"
                ),
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  JSON.stringify({
                    message: { content: " world!" },
                    done: true,
                  }) + "\n"
                ),
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn(),
          }),
        },
      };

      (fetch as any).mockResolvedValueOnce(mockResponse);

      const chunks = [];
      for await (const chunk of adapter.chatStream([])) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ type: "content", content: "Hello" });
      expect(chunks[1]).toEqual({ type: "content", content: " world!" });
      expect(chunks[2]).toEqual({ type: "done" });
    });
  });
});
```

### 5.2 集成测试示例

#### tests/integration/chat-flow.test.ts

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { AgenticLoop, ContextCompiler, ToolScheduler } from "@llamacli/core";
import { MockAdapter } from "../mocks/mock-adapter.js";
import { createTestContext } from "../utils/test-context.js";

describe("Chat Flow Integration", () => {
  let agenticLoop: AgenticLoop;
  let mockAdapter: MockAdapter;
  let context: any;

  beforeEach(async () => {
    mockAdapter = new MockAdapter();
    const contextCompiler = new ContextCompiler();
    const toolScheduler = new ToolScheduler({ autoApprove: true });

    agenticLoop = new AgenticLoop({
      adapter: mockAdapter,
      contextCompiler,
      toolScheduler,
    });

    context = createTestContext();
  });

  it("should handle simple chat without tools", async () => {
    mockAdapter.setResponse("Hello! How can I help you today?");

    const response = await agenticLoop.processUserInput("Hello, how are you?", context);

    expect(response).toBe("Hello! How can I help you today?");
    expect(context.chatHistory).toHaveLength(2); // user + assistant
  });

  it("should handle tool calls", async () => {
    mockAdapter.setResponse({
      content: "I'll read that file for you.",
      toolCalls: [
        {
          id: "call_1",
          type: "function",
          function: {
            name: "read_file",
            arguments: JSON.stringify({ path: "test.txt" }),
          },
        },
      ],
    });

    const response = await agenticLoop.processUserInput("Can you read test.txt?", context);

    expect(response).toContain("file content");
    expect(context.chatHistory).toHaveLength(4); // user + assistant + tool + assistant
  });
});
```

## 6. 开发工具配置

### 6.1 ESLint 配置

#### .eslintrc.js

```javascript
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "@typescript-eslint/recommended", "prettier"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "prefer-const": "error",
    "no-var": "error",
  },
  ignorePatterns: ["dist/", "node_modules/"],
};
```

### 6.2 Prettier 配置

#### .prettierrc

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### 6.3 Vitest 配置

#### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@llamacli/core": path.resolve(__dirname, "./packages/core/src"),
      "@llamacli/cli": path.resolve(__dirname, "./packages/cli/src"),
    },
  },
});
```

## 7. 性能优化策略

### 7.1 内存管理

```typescript
// packages/core/src/utils/memory-manager.ts
export class MemoryManager {
  private maxHistorySize = 100;
  private maxFileContextSize = 50;

  optimizeContext(context: InternalContext): void {
    // 限制聊天历史长度
    if (context.chatHistory.length > this.maxHistorySize) {
      const keepCount = Math.floor(this.maxHistorySize * 0.8);
      context.chatHistory = [
        ...context.chatHistory.slice(0, 5), // 保留前5条
        ...context.chatHistory.slice(-keepCount), // 保留最近的
      ];
    }

    // 限制文件上下文大小
    if (context.fileContext.length > this.maxFileContextSize) {
      context.fileContext = context.fileContext
        .sort((a, b) => b.lastModified - a.lastModified)
        .slice(0, this.maxFileContextSize);
    }

    // 清理过期的长期记忆
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    context.longTermMemory = context.longTermMemory.filter(
      (memory) => memory.timestamp > oneWeekAgo
    );
  }
}
```

### 7.2 缓存策略

```typescript
// packages/core/src/utils/cache.ts
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 移到最后（最近使用）
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最久未使用的项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

## 8. 安全措施

### 8.1 文件访问控制

```typescript
// packages/core/src/security/file-access.ts
import * as path from "path";

export class FileAccessController {
  private allowedPaths: Set<string> = new Set();
  private blockedPaths: Set<string> = new Set();

  constructor() {
    // 默认允许当前工作目录
    this.allowedPaths.add(process.cwd());

    // 默认阻止敏感目录
    this.blockedPaths.add("/etc");
    this.blockedPaths.add("/var");
    this.blockedPaths.add("/usr");
    this.blockedPaths.add("/System");
  }

  isPathAllowed(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);

    // 检查是否在阻止列表中
    for (const blocked of this.blockedPaths) {
      if (resolvedPath.startsWith(blocked)) {
        return false;
      }
    }

    // 检查是否在允许列表中
    for (const allowed of this.allowedPaths) {
      if (resolvedPath.startsWith(allowed)) {
        return true;
      }
    }

    return false;
  }

  addAllowedPath(path: string): void {
    this.allowedPaths.add(path.resolve(path));
  }

  addBlockedPath(path: string): void {
    this.blockedPaths.add(path.resolve(path));
  }
}
```

### 8.2 命令执行安全

```typescript
// packages/core/src/security/command-validator.ts
export class CommandValidator {
  private dangerousCommands = new Set([
    "rm",
    "rmdir",
    "del",
    "format",
    "fdisk",
    "dd",
    "mkfs",
    "sudo",
    "su",
    "chmod 777",
  ]);

  private dangerousPatterns = [/rm\s+-rf\s+\//, /sudo\s+/, /chmod\s+777/, /\|\s*sh/, /\|\s*bash/];

  isCommandSafe(command: string): boolean {
    const lowerCommand = command.toLowerCase().trim();

    // 检查危险命令
    for (const dangerous of this.dangerousCommands) {
      if (lowerCommand.includes(dangerous)) {
        return false;
      }
    }

    // 检查危险模式
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(command)) {
        return false;
      }
    }

    return true;
  }

  sanitizeCommand(command: string): string {
    // 移除潜在的注入字符
    return command.replace(/[;&|`$(){}\[\]]/g, "").trim();
  }
}
```

## 9. 监控和日志

### 9.1 日志系统

```typescript
// packages/core/src/utils/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private level: LogLevel;
  private logFile?: string;

  constructor(level: LogLevel = LogLevel.INFO, logFile?: string) {
    this.level = level;
    this.logFile = logFile;
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const logMessage = `[${timestamp}] ${levelName}: ${message}`;

    if (args.length > 0) {
      console.log(logMessage, ...args);
    } else {
      console.log(logMessage);
    }

    // 写入文件（如果配置了）
    if (this.logFile) {
      // 实现文件写入逻辑
    }
  }
}
```

## 10. 部署和发布

### 10.1 GitHub Actions 工作流

#### .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build packages
        run: npm run build
```

#### .github/workflows/release.yml

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20.x"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build packages
        run: npm run build

      - name: Publish to NPM
        run: npm run publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

## 总结

这个技术规范提供了 LlamaCLI 的完整实现细节，包括：

1. **模块化架构**: 清晰的包结构和依赖关系
2. **类型安全**: 完整的 TypeScript 类型定义
3. **适配器模式**: 支持多种 LLM 后端
4. **统一 MCP 协议**: 简化工具集成
5. **安全措施**: 文件访问控制和命令验证
6. **性能优化**: 内存管理和缓存策略
7. **测试覆盖**: 单元测试和集成测试
8. **CI/CD 流程**: 自动化构建和发布

通过遵循这个技术规范，开发团队可以构建一个高质量、可维护、可扩展的 AI 命令行工具。

```

```
