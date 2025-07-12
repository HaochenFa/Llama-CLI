// src/lib/stream-processor.ts

import { ThinkingRenderer } from "./thinking-renderer.js";

/**
 * StreamProcessor 处理流式输出，识别和处理思维标签
 * 将思维内容与普通内容分离，提供优化的显示体验
 */
export class StreamProcessor {
  private buffer: string = "";
  private inThinking: boolean = false;
  private thinkingContent: string = "";
  private currentThinkingId: string | null = null;
  private thinkingRenderer: ThinkingRenderer;

  // 正则表达式匹配思维标签
  private readonly THINK_START_REGEX = /<think>/gi;
  private readonly THINK_END_REGEX = /<\/think>/gi;

  constructor(thinkingRenderer: ThinkingRenderer) {
    this.thinkingRenderer = thinkingRenderer;
  }

  /**
   * 处理流式输入的文本块
   * @param chunk 输入的文本块
   */
  public processChunk(chunk: string): void {
    this.buffer += chunk;
    this.processBuffer();
  }

  /**
   * 完成处理，输出剩余内容
   */
  public finalize(): void {
    if (this.buffer.trim()) {
      // 如果还在思维模式中，结束思维
      if (this.inThinking) {
        this.endThinking();
      } else {
        // 输出剩余的普通内容
        process.stdout.write(this.buffer);
      }
    }
    this.reset();
  }

  /**
   * 处理缓冲区内容
   */
  private processBuffer(): void {
    let processed = false;
    
    do {
      processed = false;
      
      if (!this.inThinking) {
        // 查找思维开始标签
        const startMatch = this.THINK_START_REGEX.exec(this.buffer);
        if (startMatch) {
          // 输出思维标签之前的内容
          const beforeThink = this.buffer.substring(0, startMatch.index);
          if (beforeThink) {
            process.stdout.write(beforeThink);
          }
          
          // 开始思维模式
          this.startThinking();
          
          // 更新缓冲区
          this.buffer = this.buffer.substring(startMatch.index + startMatch[0].length);
          processed = true;
        }
      } else {
        // 查找思维结束标签
        const endMatch = this.THINK_END_REGEX.exec(this.buffer);
        if (endMatch) {
          // 添加思维内容
          const thinkContent = this.buffer.substring(0, endMatch.index);
          this.thinkingContent += thinkContent;
          
          // 结束思维模式
          this.endThinking();
          
          // 更新缓冲区
          this.buffer = this.buffer.substring(endMatch.index + endMatch[0].length);
          processed = true;
        }
      }
      
      // 重置正则表达式的lastIndex
      this.THINK_START_REGEX.lastIndex = 0;
      this.THINK_END_REGEX.lastIndex = 0;
      
    } while (processed);
    
    // 如果在思维模式中，将缓冲区内容添加到思维内容
    if (this.inThinking) {
      this.thinkingContent += this.buffer;
      this.buffer = "";
    } else if (!processed && this.buffer) {
      // 如果没有找到标签且不在思维模式中，检查是否有完整的行可以输出
      const lines = this.buffer.split('\n');
      if (lines.length > 1) {
        // 输出除最后一行外的所有行（最后一行可能不完整）
        const completeLines = lines.slice(0, -1).join('\n') + '\n';
        process.stdout.write(completeLines);
        this.buffer = lines[lines.length - 1];
      }
    }
  }

  /**
   * 开始思维模式
   */
  private startThinking(): void {
    this.inThinking = true;
    this.thinkingContent = "";
    this.currentThinkingId = this.thinkingRenderer.startThinking();
  }

  /**
   * 结束思维模式
   */
  private endThinking(): void {
    if (this.currentThinkingId && this.thinkingContent.trim()) {
      this.thinkingRenderer.endThinking(this.thinkingContent);
    }
    
    this.inThinking = false;
    this.thinkingContent = "";
    this.currentThinkingId = null;
  }

  /**
   * 重置处理器状态
   */
  private reset(): void {
    this.buffer = "";
    this.inThinking = false;
    this.thinkingContent = "";
    this.currentThinkingId = null;
  }

  /**
   * 检查是否正在思维中
   */
  public isThinking(): boolean {
    return this.inThinking;
  }

  /**
   * 获取当前缓冲区内容（用于调试）
   */
  public getBuffer(): string {
    return this.buffer;
  }

  /**
   * 强制输出缓冲区内容（紧急情况使用）
   */
  public flushBuffer(): void {
    if (this.buffer) {
      process.stdout.write(this.buffer);
      this.buffer = "";
    }
  }
}
