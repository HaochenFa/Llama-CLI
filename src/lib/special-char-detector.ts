export interface TriggerContext {
  char: string;
  position: number;
  searchText: string;
  isValid: boolean;
  type: "command" | "file";
}

export interface DetectionResult {
  hasTrigger: boolean;
  context?: TriggerContext;
  shouldTrigger: boolean;
}

/**
 * 特殊字符检测器，用于检测和分析用户输入中的特殊字符
 */
export class SpecialCharDetector {
  private static readonly COMMAND_CHAR = "/";
  private static readonly FILE_CHAR = "@";

  /**
   * 检测输入中的特殊字符
   */
  public static detect(input: string, cursorPosition?: number): DetectionResult {
    const position = cursorPosition ?? input.length;
    
    // 检查命令触发
    const commandContext = this.detectCommandTrigger(input, position);
    if (commandContext.isValid) {
      return {
        hasTrigger: true,
        context: commandContext,
        shouldTrigger: this.shouldTriggerAutocomplete(commandContext),
      };
    }

    // 检查文件触发
    const fileContext = this.detectFileTrigger(input, position);
    if (fileContext.isValid) {
      return {
        hasTrigger: true,
        context: fileContext,
        shouldTrigger: this.shouldTriggerAutocomplete(fileContext),
      };
    }

    return {
      hasTrigger: false,
      shouldTrigger: false,
    };
  }

  /**
   * 检测命令触发字符 /
   */
  private static detectCommandTrigger(input: string, cursorPosition: number): TriggerContext {
    const beforeCursor = input.slice(0, cursorPosition);
    const lastSlashIndex = beforeCursor.lastIndexOf(this.COMMAND_CHAR);

    if (lastSlashIndex === -1) {
      return this.createInvalidContext(this.COMMAND_CHAR, -1, "", "command");
    }

    // 检查 / 是否在有效位置（行首或空格后）
    const isValidPosition = this.isValidCommandPosition(input, lastSlashIndex);
    if (!isValidPosition) {
      return this.createInvalidContext(this.COMMAND_CHAR, lastSlashIndex, "", "command");
    }

    // 提取搜索文本
    const searchText = beforeCursor.slice(lastSlashIndex + 1);
    
    // 检查搜索文本是否有效（不包含空格）
    const isValidSearch = !searchText.includes(" ");

    return {
      char: this.COMMAND_CHAR,
      position: lastSlashIndex,
      searchText: searchText,
      isValid: isValidSearch,
      type: "command",
    };
  }

  /**
   * 检测文件触发字符 @
   */
  private static detectFileTrigger(input: string, cursorPosition: number): TriggerContext {
    const beforeCursor = input.slice(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf(this.FILE_CHAR);

    if (lastAtIndex === -1) {
      return this.createInvalidContext(this.FILE_CHAR, -1, "", "file");
    }

    // 检查 @ 是否在有效位置（单词边界）
    const isValidPosition = this.isValidFilePosition(input, lastAtIndex);
    if (!isValidPosition) {
      return this.createInvalidContext(this.FILE_CHAR, lastAtIndex, "", "file");
    }

    // 提取搜索文本
    const searchText = beforeCursor.slice(lastAtIndex + 1);
    
    // 检查搜索文本是否有效（不包含空格和特殊字符）
    const isValidSearch = this.isValidFileSearchText(searchText);

    return {
      char: this.FILE_CHAR,
      position: lastAtIndex,
      searchText: searchText,
      isValid: isValidSearch,
      type: "file",
    };
  }

  /**
   * 检查命令字符位置是否有效
   */
  private static isValidCommandPosition(input: string, position: number): boolean {
    // / 必须在行首或空格后
    if (position === 0) return true;
    
    const charBefore = input[position - 1];
    return charBefore === " " || charBefore === "\n";
  }

  /**
   * 检查文件字符位置是否有效
   */
  private static isValidFilePosition(input: string, position: number): boolean {
    // @ 可以在单词边界出现
    if (position === 0) return true;
    
    const charBefore = input[position - 1];
    return charBefore === " " || 
           charBefore === "\n" || 
           charBefore === "(" || 
           charBefore === "[" || 
           charBefore === "{" ||
           /\W/.test(charBefore);
  }

  /**
   * 检查文件搜索文本是否有效
   */
  private static isValidFileSearchText(searchText: string): boolean {
    // 文件搜索文本不应包含空格和某些特殊字符
    if (searchText.includes(" ")) return false;
    if (searchText.includes("\n")) return false;
    
    // 允许文件路径中的常见字符
    const validChars = /^[a-zA-Z0-9._\-\/\\]*$/;
    return validChars.test(searchText);
  }

  /**
   * 判断是否应该触发自动完成
   */
  private static shouldTriggerAutocomplete(context: TriggerContext): boolean {
    if (!context.isValid) return false;

    // 对于命令，当搜索文本为空或长度较短时触发
    if (context.type === "command") {
      return context.searchText.length <= 10; // 避免在长文本中误触发
    }

    // 对于文件，当搜索文本为空或看起来像文件路径时触发
    if (context.type === "file") {
      if (context.searchText.length === 0) return true;
      
      // 如果包含路径分隔符，可能是在输入路径
      if (context.searchText.includes("/") || context.searchText.includes("\\")) {
        return true;
      }
      
      // 如果长度适中且看起来像文件名
      return context.searchText.length <= 50 && 
             /^[a-zA-Z0-9._\-\/\\]*$/.test(context.searchText);
    }

    return false;
  }

  /**
   * 创建无效的上下文对象
   */
  private static createInvalidContext(
    char: string, 
    position: number, 
    searchText: string, 
    type: "command" | "file"
  ): TriggerContext {
    return {
      char,
      position,
      searchText,
      isValid: false,
      type,
    };
  }

  /**
   * 检查输入是否包含完整的命令
   */
  public static isCompleteCommand(input: string): boolean {
    const trimmed = input.trim();
    return trimmed.startsWith("/") && 
           !trimmed.includes(" ") && 
           trimmed.length > 1;
  }

  /**
   * 提取输入中的所有文件引用
   */
  public static extractFileReferences(input: string): Array<{ path: string; position: number }> {
    const references: Array<{ path: string; position: number }> = [];
    const regex = /@([^\s]+)/g;
    let match;

    while ((match = regex.exec(input)) !== null) {
      references.push({
        path: match[1],
        position: match.index,
      });
    }

    return references;
  }

  /**
   * 清理输入，移除文件引用语法
   */
  public static cleanInput(input: string): string {
    return input
      .replace(/@([^\s]+)/g, "") // 移除 @文件路径
      .replace(/\s+/g, " ") // 合并多个空格
      .trim();
  }

  /**
   * 在指定位置插入文本
   */
  public static insertTextAtPosition(
    originalText: string, 
    insertText: string, 
    position: number, 
    replaceLength: number = 0
  ): string {
    const before = originalText.slice(0, position);
    const after = originalText.slice(position + replaceLength);
    return before + insertText + after;
  }

  /**
   * 替换触发上下文中的搜索文本
   */
  public static replaceSearchText(
    originalText: string, 
    context: TriggerContext, 
    replacement: string
  ): string {
    const startPos = context.position + 1; // +1 跳过触发字符
    const endPos = startPos + context.searchText.length;
    
    return this.insertTextAtPosition(
      originalText, 
      replacement, 
      startPos, 
      context.searchText.length
    );
  }
}
