import { TriggerContext } from "./special-char-detector.js";

export interface TextPosition {
  line: number;
  column: number;
}

export interface EditOperation {
  type: "insert" | "replace" | "delete";
  position: number;
  length?: number;
  text: string;
}

export interface TextState {
  content: string;
  cursorPosition: number;
  selectionStart?: number;
  selectionEnd?: number;
}

/**
 * 文本编辑器，处理文本的插入、替换和光标位置管理
 */
export class TextEditor {
  private state: TextState;

  constructor(initialText: string = "") {
    this.state = {
      content: initialText,
      cursorPosition: initialText.length,
    };
  }

  /**
   * 获取当前文本状态
   */
  public getState(): TextState {
    return { ...this.state };
  }

  /**
   * 设置文本内容
   */
  public setText(text: string, cursorPosition?: number): void {
    this.state.content = text;
    this.state.cursorPosition = cursorPosition ?? text.length;
    this.state.selectionStart = undefined;
    this.state.selectionEnd = undefined;
  }

  /**
   * 获取当前文本内容
   */
  public getText(): string {
    return this.state.content;
  }

  /**
   * 获取光标位置
   */
  public getCursorPosition(): number {
    return this.state.cursorPosition;
  }

  /**
   * 设置光标位置
   */
  public setCursorPosition(position: number): void {
    this.state.cursorPosition = Math.max(0, Math.min(position, this.state.content.length));
  }

  /**
   * 在当前光标位置插入文本
   */
  public insertText(text: string): void {
    this.insertTextAt(text, this.state.cursorPosition);
  }

  /**
   * 在指定位置插入文本
   */
  public insertTextAt(text: string, position: number): void {
    const validPosition = Math.max(0, Math.min(position, this.state.content.length));
    
    const before = this.state.content.slice(0, validPosition);
    const after = this.state.content.slice(validPosition);
    
    this.state.content = before + text + after;
    this.state.cursorPosition = validPosition + text.length;
  }

  /**
   * 替换指定范围的文本
   */
  public replaceText(startPosition: number, length: number, newText: string): void {
    const validStart = Math.max(0, Math.min(startPosition, this.state.content.length));
    const validEnd = Math.max(validStart, Math.min(validStart + length, this.state.content.length));
    
    const before = this.state.content.slice(0, validStart);
    const after = this.state.content.slice(validEnd);
    
    this.state.content = before + newText + after;
    this.state.cursorPosition = validStart + newText.length;
  }

  /**
   * 删除指定范围的文本
   */
  public deleteText(startPosition: number, length: number): void {
    this.replaceText(startPosition, length, "");
  }

  /**
   * 删除光标前的字符（退格）
   */
  public backspace(): boolean {
    if (this.state.cursorPosition > 0) {
      this.deleteText(this.state.cursorPosition - 1, 1);
      return true;
    }
    return false;
  }

  /**
   * 删除光标后的字符
   */
  public deleteForward(): boolean {
    if (this.state.cursorPosition < this.state.content.length) {
      this.deleteText(this.state.cursorPosition, 1);
      return true;
    }
    return false;
  }

  /**
   * 移动光标到行首
   */
  public moveToLineStart(): void {
    const currentLine = this.getCurrentLineStart();
    this.state.cursorPosition = currentLine;
  }

  /**
   * 移动光标到行尾
   */
  public moveToLineEnd(): void {
    const currentLineEnd = this.getCurrentLineEnd();
    this.state.cursorPosition = currentLineEnd;
  }

  /**
   * 移动光标到文本开头
   */
  public moveToStart(): void {
    this.state.cursorPosition = 0;
  }

  /**
   * 移动光标到文本结尾
   */
  public moveToEnd(): void {
    this.state.cursorPosition = this.state.content.length;
  }

  /**
   * 向左移动光标
   */
  public moveLeft(count: number = 1): void {
    this.state.cursorPosition = Math.max(0, this.state.cursorPosition - count);
  }

  /**
   * 向右移动光标
   */
  public moveRight(count: number = 1): void {
    this.state.cursorPosition = Math.min(
      this.state.content.length, 
      this.state.cursorPosition + count
    );
  }

  /**
   * 获取当前行的开始位置
   */
  private getCurrentLineStart(): number {
    const beforeCursor = this.state.content.slice(0, this.state.cursorPosition);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    return lastNewline === -1 ? 0 : lastNewline + 1;
  }

  /**
   * 获取当前行的结束位置
   */
  private getCurrentLineEnd(): number {
    const afterCursor = this.state.content.slice(this.state.cursorPosition);
    const nextNewline = afterCursor.indexOf('\n');
    return nextNewline === -1 ? 
      this.state.content.length : 
      this.state.cursorPosition + nextNewline;
  }

  /**
   * 根据触发上下文替换搜索文本
   */
  public replaceSearchTextInContext(context: TriggerContext, replacement: string): void {
    const startPos = context.position + 1; // +1 跳过触发字符
    const endPos = startPos + context.searchText.length;
    
    this.replaceText(startPos, context.searchText.length, replacement);
  }

  /**
   * 在触发位置插入完整的引用
   */
  public insertReferenceAtContext(context: TriggerContext, reference: string): void {
    // 对于文件引用，保留 @ 符号
    const fullReference = context.type === "file" ? `@${reference}` : reference;
    
    // 替换从触发字符开始的整个搜索文本
    const startPos = context.position;
    const endPos = startPos + 1 + context.searchText.length; // +1 for trigger char
    
    this.replaceText(startPos, endPos - startPos, fullReference);
  }

  /**
   * 清除所有文件引用，返回纯文本
   */
  public getCleanText(): string {
    return this.state.content
      .replace(/@([^\s]+)/g, "") // 移除 @文件路径
      .replace(/\s+/g, " ") // 合并多个空格
      .trim();
  }

  /**
   * 提取所有文件引用
   */
  public extractFileReferences(): Array<{ path: string; position: number }> {
    const references: Array<{ path: string; position: number }> = [];
    const regex = /@([^\s]+)/g;
    let match;

    while ((match = regex.exec(this.state.content)) !== null) {
      references.push({
        path: match[1],
        position: match.index,
      });
    }

    return references;
  }

  /**
   * 检查是否包含完整的命令
   */
  public hasCompleteCommand(): { command: string } | null {
    const trimmed = this.state.content.trim();
    if (trimmed.startsWith("/") && !trimmed.includes(" ") && trimmed.length > 1) {
      return { command: trimmed };
    }
    return null;
  }

  /**
   * 获取光标前的文本
   */
  public getTextBeforeCursor(): string {
    return this.state.content.slice(0, this.state.cursorPosition);
  }

  /**
   * 获取光标后的文本
   */
  public getTextAfterCursor(): string {
    return this.state.content.slice(this.state.cursorPosition);
  }

  /**
   * 获取当前行的文本
   */
  public getCurrentLine(): string {
    const lineStart = this.getCurrentLineStart();
    const lineEnd = this.getCurrentLineEnd();
    return this.state.content.slice(lineStart, lineEnd);
  }

  /**
   * 获取光标在当前行中的位置
   */
  public getCursorPositionInLine(): number {
    return this.state.cursorPosition - this.getCurrentLineStart();
  }

  /**
   * 应用编辑操作
   */
  public applyOperation(operation: EditOperation): void {
    switch (operation.type) {
      case "insert":
        this.insertTextAt(operation.text, operation.position);
        break;
      case "replace":
        this.replaceText(operation.position, operation.length || 0, operation.text);
        break;
      case "delete":
        this.deleteText(operation.position, operation.length || 1);
        break;
    }
  }

  /**
   * 创建编辑操作
   */
  public static createOperation(
    type: EditOperation["type"],
    position: number,
    text: string,
    length?: number
  ): EditOperation {
    return {
      type,
      position,
      text,
      length,
    };
  }

  /**
   * 重置编辑器状态
   */
  public reset(): void {
    this.state = {
      content: "",
      cursorPosition: 0,
    };
  }

  /**
   * 克隆当前编辑器状态
   */
  public clone(): TextEditor {
    const editor = new TextEditor();
    editor.state = { ...this.state };
    return editor;
  }
}
