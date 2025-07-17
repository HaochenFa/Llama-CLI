import inquirer from "inquirer";
import { SpecialCharDetector, TriggerContext } from "./special-char-detector.js";
import { AutocompleteManager } from "./autocomplete-manager.js";
import { TextEditor } from "./text-editor.js";
import chalk from "chalk";

export interface EnhancedInputOptions {
  message: string;
  onCommandExecute?: (command: string) => Promise<void>;
  validate?: (input: string) => boolean | string | Promise<boolean | string>;
}

export interface InputResult {
  text: string;
  fileReferences: string[];
  shouldExecuteCommand: boolean;
  command?: string;
}

/**
 * 增强的输入处理器，支持实时特殊字符检测和自动完成
 */
export class EnhancedInputHandler {
  private options: EnhancedInputOptions;
  private autocompleteManager: AutocompleteManager;
  private textEditor: TextEditor;

  constructor(options: EnhancedInputOptions) {
    this.options = options;
    this.autocompleteManager = new AutocompleteManager();
    this.textEditor = new TextEditor();
  }

  /**
   * 获取用户输入，支持智能特殊字符处理
   */
  public async getInput(): Promise<InputResult> {
    let currentInput = "";
    let processingSpecialChar = false;

    while (true) {
      try {
        // 显示当前状态的提示符
        const prompt = this.formatPrompt(currentInput);
        
        // 使用 inquirer 获取输入
        const { userInput } = await inquirer.prompt([
          {
            type: "input",
            name: "userInput",
            message: prompt,
            default: currentInput,
            prefix: "",
          },
        ]);

        // 更新文本编辑器状态
        this.textEditor.setText(userInput);

        // 检测特殊字符
        const detection = SpecialCharDetector.detect(userInput);
        
        if (detection.shouldTrigger && !processingSpecialChar) {
          processingSpecialChar = true;
          
          try {
            const processedInput = await this.handleSpecialCharacter(userInput, detection.context!);
            
            if (processedInput !== null) {
              currentInput = processedInput;
              processingSpecialChar = false;
              continue; // 继续输入循环
            }
          } catch (error) {
            console.error(chalk.red(`处理特殊字符时出错: ${(error as Error).message}`));
          }
          
          processingSpecialChar = false;
        }

        // 检查是否为完整命令
        const commandCheck = SpecialCharDetector.isCompleteCommand(userInput);
        if (commandCheck && this.options.onCommandExecute) {
          try {
            await this.options.onCommandExecute(userInput);
            currentInput = ""; // 重置输入
            continue; // 继续输入循环
          } catch (error) {
            console.error(chalk.red(`命令执行错误: ${(error as Error).message}`));
            currentInput = userInput;
            continue;
          }
        }

        // 验证输入
        if (this.options.validate) {
          const validation = await this.options.validate(userInput);
          if (validation !== true) {
            console.error(chalk.red(typeof validation === "string" ? validation : "输入无效"));
            currentInput = userInput;
            continue;
          }
        }

        // 返回最终结果
        return this.createInputResult(userInput);

      } catch (error) {
        if (this.isUserCancellation(error)) {
          throw new Error("用户取消输入");
        }
        throw error;
      }
    }
  }

  /**
   * 处理特殊字符触发的自动完成
   */
  private async handleSpecialCharacter(input: string, context: TriggerContext): Promise<string | null> {
    try {
      let result;
      
      if (context.type === "command") {
        result = await this.autocompleteManager.handleCommandAutocomplete(context);
        
        if (!result.cancelled && result.selected) {
          // 对于命令，直接执行而不是插入
          if (this.options.onCommandExecute) {
            await this.options.onCommandExecute(result.selected);
            return ""; // 清空输入
          }
        }
      } else if (context.type === "file") {
        result = await this.autocompleteManager.handleFileAutocomplete(context);
        
        if (!result.cancelled && result.selected) {
          // 检查是否为目录
          if (this.autocompleteManager.isDirectory(result.selected)) {
            // 如果是目录，更新搜索路径并继续
            this.textEditor.setText(input);
            this.textEditor.replaceSearchTextInContext(context, result.selected);
            return this.textEditor.getText();
          } else {
            // 如果是文件，插入文件引用
            this.textEditor.setText(input);
            this.textEditor.insertReferenceAtContext(context, result.selected);
            return this.textEditor.getText();
          }
        }
      }

      // 如果取消或没有选择，返回原始输入
      return input;
      
    } catch (error) {
      console.error(chalk.red(`自动完成处理错误: ${(error as Error).message}`));
      return input;
    }
  }

  /**
   * 创建输入结果对象
   */
  private createInputResult(input: string): InputResult {
    const fileReferences = SpecialCharDetector.extractFileReferences(input);
    const cleanText = SpecialCharDetector.cleanInput(input);
    const commandCheck = SpecialCharDetector.isCompleteCommand(input);

    return {
      text: cleanText,
      fileReferences: fileReferences.map(ref => ref.path),
      shouldExecuteCommand: !!commandCheck,
      command: commandCheck ? input : undefined,
    };
  }

  /**
   * 格式化提示符
   */
  private formatPrompt(currentInput: string): string {
    let prompt = this.options.message;
    
    if (currentInput) {
      // 显示当前输入的简短预览
      const preview = currentInput.length > 50 ? 
        currentInput.slice(0, 47) + "..." : 
        currentInput;
      prompt += chalk.gray(` (当前: ${preview})`);
      
      // 显示文件引用数量
      const fileRefs = SpecialCharDetector.extractFileReferences(currentInput);
      if (fileRefs.length > 0) {
        prompt += chalk.blue(` [${fileRefs.length} 个文件]`);
      }
    }
    
    return prompt;
  }

  /**
   * 检查是否为用户取消操作
   */
  private isUserCancellation(error: any): boolean {
    return (
      error?.isTtyError ||
      error?.message?.includes("cancelled") ||
      error?.message?.includes("canceled") ||
      error?.code === "SIGINT"
    );
  }

  /**
   * 重置输入状态
   */
  public reset(): void {
    this.textEditor.reset();
  }

  /**
   * 获取当前文本编辑器状态
   */
  public getTextEditor(): TextEditor {
    return this.textEditor;
  }

  /**
   * 设置自动完成管理器
   */
  public setAutocompleteManager(manager: AutocompleteManager): void {
    this.autocompleteManager = manager;
  }

  /**
   * 静态工厂方法，创建带有默认配置的输入处理器
   */
  public static create(
    message: string,
    onCommandExecute?: (command: string) => Promise<void>
  ): EnhancedInputHandler {
    return new EnhancedInputHandler({
      message,
      onCommandExecute,
    });
  }

  /**
   * 静态方法，快速获取简单输入
   */
  public static async getSimpleInput(message: string): Promise<string> {
    const handler = EnhancedInputHandler.create(message);
    const result = await handler.getInput();
    return result.text;
  }

  /**
   * 静态方法，获取带文件引用的输入
   */
  public static async getInputWithFiles(
    message: string,
    onCommandExecute?: (command: string) => Promise<void>
  ): Promise<{ text: string; files: string[] }> {
    const handler = EnhancedInputHandler.create(message, onCommandExecute);
    const result = await handler.getInput();
    return {
      text: result.text,
      files: result.fileReferences,
    };
  }
}
