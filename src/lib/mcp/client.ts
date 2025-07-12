// src/lib/mcp/client.ts
// Model Context Protocol (MCP) client implementation

import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import {
  IMcpClient,
  McpServerConfig,
  McpConnectionStatus,
  McpTool,
  McpResource,
  McpPrompt,
  CallToolRequest,
  CallToolResult,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  InitializeRequest,
  InitializeResponse,
  MCP_VERSION,
  McpErrorCode,
  McpEvents,
} from "./types.js";

export class McpClient extends EventEmitter implements IMcpClient {
  private serverConfig: McpServerConfig;
  private process: ChildProcess | null = null;
  private status: McpConnectionStatus = "disconnected";
  private requestId = 0;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
    }
  >();
  private serverCapabilities: any = {};
  private tools: McpTool[] = [];
  private resources: McpResource[] = [];
  private prompts: McpPrompt[] = [];
  private debugMode: boolean = false;
  private serverName: string;

  constructor(serverConfig: McpServerConfig, serverName?: string, debugMode: boolean = false) {
    super();
    this.serverConfig = serverConfig;
    this.serverName = serverName || "Unknown";
    this.debugMode = debugMode;
  }

  private log(level: "debug" | "info" | "warn" | "error", message: string, ...args: any[]): void {
    const prefix = `[MCP:${this.serverName}]`;

    switch (level) {
      case "debug":
        if (this.debugMode) {
          console.debug(`${prefix} ${message}`, ...args);
        }
        break;
      case "info":
        console.log(`${prefix} ${message}`, ...args);
        break;
      case "warn":
        console.warn(`${prefix} ${message}`, ...args);
        break;
      case "error":
        console.error(`${prefix} ${message}`, ...args);
        break;
    }
  }

  public async connect(): Promise<void> {
    if (this.status === "connected" || this.status === "connecting") {
      this.log("debug", "Already connected or connecting, skipping");
      return;
    }

    this.log(
      "info",
      `Connecting to MCP server with command: ${this.serverConfig.command} ${(
        this.serverConfig.args || []
      ).join(" ")}`
    );
    this.setStatus("connecting");

    try {
      // Validate server configuration
      if (!this.serverConfig.command) {
        throw new Error("Server command is required");
      }

      // Spawn the MCP server process
      this.process = spawn(this.serverConfig.command, this.serverConfig.args || [], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...this.serverConfig.env },
        cwd: this.serverConfig.cwd || process.cwd(),
      });

      // Set up process event handlers
      this.process.on("error", (error) => {
        this.log("error", `Failed to start server process: ${error.message}`);
        this.handleError(new Error(`Failed to start MCP server: ${error.message}`));
      });

      this.process.on("exit", (code, signal) => {
        this.log("warn", `Server process exited with code ${code}, signal ${signal}`);
        this.handleDisconnection(`Server exited with code ${code}, signal ${signal}`);
      });

      // Set up stdin/stdout communication
      if (this.process.stdout) {
        let buffer = "";
        this.process.stdout.on("data", (data) => {
          buffer += data.toString();
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.substring(0, newlineIndex).trim();
            buffer = buffer.substring(newlineIndex + 1);
            if (line) {
              this.handleMessage(line);
            }
          }
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on("data", (data) => {
          console.error("MCP Server stderr:", data.toString());
        });
      }

      // Initialize the connection
      await this.initialize();

      // Load initial data
      await this.loadInitialData();

      this.setStatus("connected");
    } catch (error) {
      this.setStatus("error");
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.setStatus("disconnected");
    this.pendingRequests.clear();
  }

  public isConnected(): boolean {
    return this.status === "connected";
  }

  public getStatus(): McpConnectionStatus {
    return this.status;
  }

  public async listTools(): Promise<McpTool[]> {
    if (!this.isConnected()) {
      throw new Error("Not connected to MCP server");
    }

    const response = await this.sendRequest("tools/list", {});
    this.tools = response.tools || [];
    return this.tools;
  }

  public async callTool(request: CallToolRequest): Promise<CallToolResult> {
    if (!this.isConnected()) {
      throw new Error("Not connected to MCP server");
    }

    const response = await this.sendRequest("tools/call", {
      name: request.name,
      arguments: request.arguments || {},
    });

    return response;
  }

  public async listResources(): Promise<McpResource[]> {
    if (!this.isConnected()) {
      throw new Error("Not connected to MCP server");
    }

    const response = await this.sendRequest("resources/list", {});
    this.resources = response.resources || [];
    return this.resources;
  }

  public async readResource(uri: string): Promise<any> {
    if (!this.isConnected()) {
      throw new Error("Not connected to MCP server");
    }

    const response = await this.sendRequest("resources/read", { uri });
    return response;
  }

  public async listPrompts(): Promise<McpPrompt[]> {
    if (!this.isConnected()) {
      throw new Error("Not connected to MCP server");
    }

    const response = await this.sendRequest("prompts/list", {});
    this.prompts = response.prompts || [];
    return this.prompts;
  }

  public async getPrompt(name: string, args?: Record<string, any>): Promise<any> {
    if (!this.isConnected()) {
      throw new Error("Not connected to MCP server");
    }

    const response = await this.sendRequest("prompts/get", {
      name,
      arguments: args || {},
    });
    return response;
  }

  private async initialize(): Promise<void> {
    const initRequest: InitializeRequest = {
      protocolVersion: MCP_VERSION,
      capabilities: {
        sampling: {},
      },
      clientInfo: {
        name: "LlamaCLI",
        version: "1.0.0",
      },
    };

    const response: InitializeResponse = await this.sendRequest("initialize", initRequest);
    this.serverCapabilities = response.capabilities;

    // Send initialized notification
    this.sendNotification("notifications/initialized", {});
  }

  private async loadInitialData(): Promise<void> {
    try {
      // Load tools if supported
      if (this.serverCapabilities.tools) {
        await this.listTools();
      }

      // Load resources if supported
      if (this.serverCapabilities.resources) {
        await this.listResources();
      }

      // Load prompts if supported
      if (this.serverCapabilities.prompts) {
        await this.listPrompts();
      }
    } catch (error) {
      console.warn("Failed to load initial MCP data:", error);
    }
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      if (this.process && this.process.stdin) {
        this.process.stdin.write(JSON.stringify(request) + "\n");
      } else {
        reject(new Error("No connection to MCP server"));
      }

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for method: ${method}`));
        }
      }, 30000); // 30 second timeout
    });
  }

  private sendNotification(method: string, params: any): void {
    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    if (this.process && this.process.stdin) {
      this.process.stdin.write(JSON.stringify(notification) + "\n");
    }
  }

  private handleMessage(message: string): void {
    try {
      const parsed = JSON.parse(message);

      if ("id" in parsed) {
        // This is a response
        this.handleResponse(parsed as JsonRpcResponse);
      } else {
        // This is a notification
        this.handleNotification(parsed);
      }
    } catch (error) {
      console.error("Failed to parse MCP message:", error, "Message:", message);
    }
  }

  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);

      if (response.error) {
        pending.reject(new Error(`MCP Error: ${response.error.message}`));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  private handleNotification(notification: any): void {
    switch (notification.method) {
      case "notifications/tools/list_changed":
        this.listTools().catch(console.error);
        break;
      case "notifications/resources/list_changed":
        this.listResources().catch(console.error);
        break;
      case "notifications/prompts/list_changed":
        this.listPrompts().catch(console.error);
        break;
      default:
        console.log("Unhandled MCP notification:", notification.method);
    }
  }

  private setStatus(status: McpConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit("connection-status", status);
    }
  }

  private handleError(error: Error): void {
    this.setStatus("error");
    this.emit("error", error);
  }

  private handleDisconnection(reason: string): void {
    this.setStatus("disconnected");
    this.process = null;
    this.pendingRequests.clear();
    console.log("MCP server disconnected:", reason);
  }
}
