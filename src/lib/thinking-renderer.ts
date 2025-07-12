// src/lib/thinking-renderer.ts

import chalk from "chalk";

export interface ThinkingBlock {
  id: string;
  content: string;
  timestamp: Date;
  collapsed: boolean;
}

/**
 * ThinkingRenderer 负责处理和显示模型的思维内容
 * 支持折叠/展开功能，提供美观的终端显示
 */
export class ThinkingRenderer {
  private thinkingHistory: ThinkingBlock[] = [];
  private currentThinkingId: string | null = null;
  private showThinking: boolean = true; // 用户可配置是否显示思维内容

  constructor(showThinking: boolean = true) {
    this.showThinking = showThinking;
  }

  /**
   * 开始一个新的思维块
   */
  public startThinking(): string {
    const id = this.generateId();
    this.currentThinkingId = id;

    if (this.showThinking) {
      // 显示思考开始的提示
      console.log(chalk.dim.cyan("💭 [思考] 模型正在分析问题... (输入 /think 查看详情)"));
    }

    return id;
  }

  /**
   * 结束当前的思维块
   */
  public endThinking(content: string): void {
    if (!this.currentThinkingId) return;

    const thinkingBlock: ThinkingBlock = {
      id: this.currentThinkingId,
      content: content.trim(),
      timestamp: new Date(),
      collapsed: true, // 默认折叠
    };

    this.thinkingHistory.push(thinkingBlock);
    this.currentThinkingId = null;

    if (this.showThinking) {
      // 显示思考完成的提示
      console.log(chalk.dim.green("✨ [思考完成] 输入 /think 查看思考过程"));
    }
  }

  /**
   * 显示指定的思维块
   */
  public displayThinking(id?: string): void {
    if (!this.showThinking) {
      console.log(chalk.yellow("💡 思维显示已关闭，使用 /think on 开启"));
      return;
    }

    let targetBlock: ThinkingBlock | undefined;

    if (id) {
      targetBlock = this.thinkingHistory.find((block) => block.id === id);
      if (!targetBlock) {
        console.log(chalk.red(`❌ 未找到思维块 ID: ${id}`));
        return;
      }
    } else {
      // 显示最近的思维块
      targetBlock = this.thinkingHistory[this.thinkingHistory.length - 1];
      if (!targetBlock) {
        console.log(chalk.yellow("💭 暂无思维内容"));
        return;
      }
    }

    this.renderThinkingBlock(targetBlock);
  }

  /**
   * 按索引显示思维块
   */
  public displayThinkingByIndex(index: number): void {
    if (!this.showThinking) {
      console.log(chalk.yellow("💡 思维显示已关闭，使用 /think on 开启"));
      return;
    }

    if (index < 0 || index >= this.thinkingHistory.length) {
      console.log(chalk.red(`❌ 思维记录 ${index + 1} 不存在`));
      console.log(chalk.blue("💡 使用 /think list 查看所有思维记录"));
      return;
    }

    const targetBlock = this.thinkingHistory[index];
    this.renderThinkingBlock(targetBlock);
  }

  /**
   * 列出所有思维块
   */
  public listThinking(): void {
    if (!this.showThinking) {
      console.log(chalk.yellow("💡 思维显示已关闭，使用 /think on 开启"));
      return;
    }

    if (this.thinkingHistory.length === 0) {
      console.log(chalk.yellow("💭 暂无思维历史"));
      return;
    }

    console.log(chalk.bold.cyan("🧠 思维历史:"));
    console.log();

    this.thinkingHistory.forEach((block, index) => {
      const timeStr = block.timestamp.toLocaleTimeString();
      const preview = block.content.substring(0, 50).replace(/\n/g, " ");
      const status = block.collapsed ? "折叠" : "展开";

      console.log(
        chalk.cyan(`  ${index + 1}. [${timeStr}] ${status}`) +
          chalk.gray(` - ${preview}${block.content.length > 50 ? "..." : ""}`)
      );
    });

    console.log();
    console.log(chalk.gray("💡 使用 /think <序号> 查看具体内容"));
  }

  /**
   * 切换思维显示开关
   */
  public toggleThinking(enable?: boolean): void {
    if (enable !== undefined) {
      this.showThinking = enable;
    } else {
      this.showThinking = !this.showThinking;
    }

    const status = this.showThinking ? "开启" : "关闭";
    const icon = this.showThinking ? "✅" : "❌";
    console.log(chalk.green(`${icon} 思维显示已${status}`));
  }

  /**
   * 清空思维历史
   */
  public clearThinking(): void {
    const count = this.thinkingHistory.length;
    this.thinkingHistory = [];
    this.currentThinkingId = null;

    console.log(chalk.green(`✅ 已清空 ${count} 条思维记录`));
  }

  /**
   * 渲染思维块内容
   */
  private renderThinkingBlock(block: ThinkingBlock): void {
    const timeStr = block.timestamp.toLocaleTimeString();

    console.log();
    console.log(chalk.bold.cyan(`💭 思维内容 [${timeStr}]:`));
    console.log(chalk.cyan("─".repeat(50)));

    // 将思维内容按行分割并添加缩进
    const lines = block.content.split("\n");
    lines.forEach((line) => {
      console.log(chalk.dim.white(`  ${line}`));
    });

    console.log(chalk.cyan("─".repeat(50)));
    console.log();
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `think_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取思维历史数量
   */
  public getThinkingCount(): number {
    return this.thinkingHistory.length;
  }

  /**
   * 检查是否启用思维显示
   */
  public isThinkingEnabled(): boolean {
    return this.showThinking;
  }
}
