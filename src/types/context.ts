// src/types/context.ts

/**
 * 定义工具的结构。
 * 参考 dev.md 中关于 ToolDefinition 的描述。
 */
export interface ToolDefinition {
  type: "native" | "openapi" | "mcp";
  name: string;
  description: string;
  schema?: any; // 工具参数的 JSON Schema，例如 OpenAPI Schema
  parameters?: any; // 兼容旧的 parameters 字段，与 schema 作用相同
  endpoint?: string; // 针对 openapi & mcp 工具的端点
  invoke?: (args: any) => Promise<string | any>; // native 工具的执行函数
}

/**
 * 定义文件上下文的结构。
 * 用于存储加载到上下文中的文件信息。
 */
export interface FileContext {
  path: string; // 文件的绝对路径
  content: string; // 文件内容
}

/**
 * 定义单个工具调用的结构。
 */
export interface ToolCall {
  id?: string; // The ID of the tool call (optional, as not all backends provide it).
  type: "function";
  function: {
    name: string;
    arguments: any; // The arguments to pass to the function, already parsed as an object.
  };
}

/**
 * 定义从 LLM 返回的工具调用负载。
 */
export interface ToolCallPayload {
  type: "tool_calls";
  tool_calls: ToolCall[];
}

/**
 * 定义聊天消息的结构。
 * 用于构建和管理与 LLM 的对话历史。
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string; // 用于关联工具调用的结果
  tool_calls?: ToolCall[]; // Assistant message can have tool calls
}

/**
 * 定义 LlamaCLI 内部上下文的核心结构。
 * 包含了会话所需的所有状态信息。
 * 参考 dev.md 中关于 InternalContext 的描述。
 */
export interface InternalContext {
  long_term_memory: string[]; // 长期记忆列表
  available_tools: ToolDefinition[]; // 当前可用的工具列表
  file_context: FileContext[]; // 加载到上下文中的文件列表
  chat_history: ChatMessage[]; // 聊天历史记录
  current_working_directory: string; // The current working directory of the user.
  // 可以在后续根据需求添加更多上下文信息，例如：
  // active_llm_profile: string;
}
