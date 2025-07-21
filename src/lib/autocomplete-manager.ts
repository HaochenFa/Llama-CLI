import autocomplete from "inquirer-autocomplete-standalone";
import { FileContextManager } from "./file-context-manager.js";
import { TriggerContext } from "./special-char-detector.js";
import chalk from "chalk";
import * as path from "path";
import fs from "fs";

export interface AutocompleteChoice {
  name: string;
  value: string;
  description?: string;
}

export interface AutocompleteResult {
  selected: string;
  cancelled: boolean;
}

/**
 * 自动完成管理器，集成命令和文件选择逻辑
 */
export class AutocompleteManager {
  private fileContextManager: FileContextManager;

  constructor() {
    this.fileContextManager = new FileContextManager();
  }

  /**
   * 处理命令自动完成
   */
  public async handleCommandAutocomplete(context: TriggerContext): Promise<AutocompleteResult> {
    const commands = this.getCommandChoices();

    try {
      const selected = await autocomplete({
        message: "⚡ 选择命令:",
        source: async (input) => {
          if (!input) return commands;

          const filtered = commands.filter(
            (cmd) =>
              cmd.name.toLowerCase().includes(input.toLowerCase()) ||
              cmd.value.toLowerCase().includes(input.toLowerCase())
          );

          return filtered.length > 0
            ? filtered
            : [
                {
                  name: chalk.gray("没有找到匹配的命令"),
                  value: "",
                  description: "请尝试其他关键词",
                },
              ];
        },
        pageSize: 10,
        searchText: "搜索命令...",
        emptyText: "没有可用的命令",
      });

      return {
        selected,
        cancelled: false,
      };
    } catch (error) {
      return {
        selected: "",
        cancelled: true,
      };
    }
  }

  /**
   * 处理文件自动完成
   */
  public async handleFileAutocomplete(context: TriggerContext): Promise<AutocompleteResult> {
    try {
      const selected = await autocomplete({
        message: "📁 选择文件:",
        source: async (input) => {
          const searchPath = input || context.searchText || "";
          return this.getFileChoices(searchPath);
        },
        pageSize: 15,
        searchText: "搜索文件...",
        emptyText: "没有找到文件",
      });

      return {
        selected,
        cancelled: false,
      };
    } catch (error) {
      return {
        selected: "",
        cancelled: true,
      };
    }
  }

  /**
   * 获取命令选择项
   */
  private getCommandChoices(): AutocompleteChoice[] {
    return [
      {
        name: "📚 /help - 显示帮助信息",
        value: "/help",
        description: "查看所有可用命令的详细说明",
      },
      {
        name: "📋 /context view - 查看当前上下文",
        value: "/context view",
        description: "显示当前聊天上下文和加载的文件",
      },
      {
        name: "🗑️ /context clear - 清除上下文",
        value: "/context clear",
        description: "清除所有聊天历史和上下文信息",
      },
      {
        name: "📄 /files list - 列出已加载文件",
        value: "/files list",
        description: "显示当前已加载到上下文中的所有文件",
      },
      {
        name: "🗑️ /files clear - 清除已加载文件",
        value: "/files clear",
        description: "从上下文中移除所有已加载的文件",
      },
      {
        name: "🔧 /mode agent - 切换到代理模式",
        value: "/mode agent",
        description: "启用工具和函数调用功能",
      },
      {
        name: "💬 /mode pure - 切换到纯聊天模式",
        value: "/mode pure",
        description: "禁用所有工具，仅进行文本对话",
      },
      {
        name: "🧠 /memory add - 添加长期记忆",
        value: "/memory add",
        description: "添加重要信息到长期记忆中",
      },
      {
        name: "📝 /memory list - 查看长期记忆",
        value: "/memory list",
        description: "显示所有已保存的长期记忆",
      },
      {
        name: "🗑️ /memory clear - 清除长期记忆",
        value: "/memory clear",
        description: "删除所有长期记忆信息",
      },
      {
        name: "🗜️ /compress - 压缩上下文",
        value: "/compress",
        description: "压缩聊天历史以节省 token",
      },
      {
        name: "🤔 /think - 启用思考模式",
        value: "/think",
        description: "让 AI 显示详细的思考过程",
      },
      {
        name: "🚪 /exit - 退出程序",
        value: "/exit",
        description: "安全退出 LlamaCLI",
      },
    ];
  }

  /**
   * 获取文件选择项
   */
  private getFileChoices(searchPath: string): AutocompleteChoice[] {
    const choices: AutocompleteChoice[] = [];

    try {
      // 获取文件补全建议
      const files = this.fileContextManager.getFileCompletions(searchPath);

      // 处理目录导航
      if (searchPath && !searchPath.endsWith("/")) {
        const parentDir = path.dirname(searchPath);
        if (parentDir !== "." && parentDir !== searchPath) {
          choices.push({
            name: `📁 .. (返回 ${parentDir})`,
            value: parentDir + "/",
            description: "返回上级目录",
          });
        }
      }

      // 添加文件和目录
      files.forEach((file) => {
        if (file.endsWith("/")) {
          // 目录
          choices.push({
            name: `📁 ${file}`,
            value: searchPath ? path.join(searchPath, file) : file,
            description: "目录 - 按回车进入",
          });
        } else {
          // 文件
          const icon = this.getFileIcon(file);
          const fullPath = searchPath ? path.join(searchPath, file) : file;

          choices.push({
            name: `${icon} ${file}`,
            value: fullPath,
            description: `文件 - ${this.getFileSize(fullPath)}`,
          });
        }
      });

      // 如果没有找到文件，显示提示
      if (choices.length === 0) {
        choices.push({
          name: chalk.gray("没有找到文件"),
          value: "",
          description: "请检查路径或尝试其他搜索词",
        });
      }

      // 添加取消选项
      if (choices.length > 0 && choices[0].value !== "") {
        choices.push({
          name: "❌ 取消",
          value: "",
          description: "取消文件选择",
        });
      }
    } catch (error) {
      choices.push({
        name: chalk.red("读取文件时出错"),
        value: "",
        description: (error as Error).message,
      });
    }

    return choices;
  }

  /**
   * 获取文件图标
   */
  private getFileIcon(filename: string): string {
    const ext = path.extname(filename).toLowerCase();

    const iconMap: { [key: string]: string } = {
      ".js": "🟨",
      ".ts": "🔷",
      ".jsx": "⚛️",
      ".tsx": "⚛️",
      ".json": "📊",
      ".md": "📝",
      ".html": "🌐",
      ".css": "🎨",
      ".scss": "🎨",
      ".less": "🎨",
      ".py": "🐍",
      ".java": "☕",
      ".cpp": "⚙️",
      ".c": "⚙️",
      ".go": "🐹",
      ".rs": "🦀",
      ".php": "🐘",
      ".rb": "💎",
      ".png": "🖼️",
      ".jpg": "🖼️",
      ".jpeg": "🖼️",
      ".gif": "🖼️",
      ".svg": "🎨",
      ".pdf": "📄",
      ".txt": "📄",
      ".log": "📋",
      ".xml": "📄",
      ".yaml": "⚙️",
      ".yml": "⚙️",
      ".env": "🔧",
      ".gitignore": "🚫",
      ".dockerfile": "🐳",
    };

    return iconMap[ext] || "📄";
  }

  /**
   * 获取文件大小信息
   */
  private getFileSize(filePath: string): string {
    try {
      const stats = fs.statSync(filePath);
      const size = stats.size;

      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    } catch {
      return "未知大小";
    }
  }

  /**
   * 检查选择的值是否为目录
   */
  public isDirectory(value: string): boolean {
    return value.endsWith("/");
  }

  /**
   * 检查选择的值是否为取消操作
   */
  public isCancelled(value: string): boolean {
    return value === "" || value === null;
  }

  /**
   * 格式化文件路径用于显示
   */
  public formatFilePath(filePath: string): string {
    // 移除当前工作目录前缀，使路径更简洁
    const cwd = process.cwd();
    if (filePath.startsWith(cwd)) {
      return filePath.slice(cwd.length + 1);
    }
    return filePath;
  }
}
