import * as fs from 'fs';
import * as path from 'path';
import { FileContext } from '../types/context.js';
import chalk from 'chalk';

export class FileContextManager {
  private workingDirectory: string;

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
  }

  /**
   * 解析用户输入中的 @-语法，提取文件路径
   * @param input 用户输入的文本
   * @returns 解析后的文件路径数组和清理后的文本
   */
  public parseAtSyntax(input: string): { filePaths: string[], cleanedInput: string } {
    const atPattern = /@([^\s]+)/g;
    const filePaths: string[] = [];
    let match;

    while ((match = atPattern.exec(input)) !== null) {
      filePaths.push(match[1]);
    }

    // 移除 @-语法，保留清理后的文本
    const cleanedInput = input.replace(atPattern, '').trim();

    return { filePaths, cleanedInput };
  }

  /**
   * 加载指定路径的文件内容
   * @param filePath 文件路径（相对或绝对）
   * @returns FileContext 对象或 null（如果文件不存在或无法读取）
   */
  public async loadFile(filePath: string): Promise<FileContext | null> {
    try {
      // 处理相对路径
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(this.workingDirectory, filePath);

      // 检查文件是否存在
      if (!fs.existsSync(absolutePath)) {
        console.log(chalk.yellow(`⚠️  File not found: ${filePath}`));
        return null;
      }

      // 检查是否为文件（不是目录）
      const stats = fs.statSync(absolutePath);
      if (!stats.isFile()) {
        console.log(chalk.yellow(`⚠️  Path is not a file: ${filePath}`));
        return null;
      }

      // 检查文件大小（限制为 1MB）
      const maxSize = 1024 * 1024; // 1MB
      if (stats.size > maxSize) {
        console.log(chalk.yellow(`⚠️  File too large (${Math.round(stats.size / 1024)}KB > 1MB): ${filePath}`));
        return null;
      }

      // 读取文件内容
      const content = fs.readFileSync(absolutePath, 'utf-8');

      return {
        path: absolutePath,
        content: content
      };

    } catch (error) {
      console.log(chalk.red(`❌ Error reading file ${filePath}: ${(error as Error).message}`));
      return null;
    }
  }

  /**
   * 批量加载多个文件
   * @param filePaths 文件路径数组
   * @returns 成功加载的 FileContext 数组
   */
  public async loadFiles(filePaths: string[]): Promise<FileContext[]> {
    const loadedFiles: FileContext[] = [];

    for (const filePath of filePaths) {
      const fileContext = await this.loadFile(filePath);
      if (fileContext) {
        loadedFiles.push(fileContext);
        console.log(chalk.green(`📄 Loaded: ${filePath}`));
      }
    }

    return loadedFiles;
  }

  /**
   * 获取文件自动补全建议
   * @param partial 部分文件路径
   * @returns 匹配的文件路径数组
   */
  public getFileCompletions(partial: string): string[] {
    try {
      // 处理相对路径
      const basePath = path.isAbsolute(partial) 
        ? path.dirname(partial)
        : path.resolve(this.workingDirectory, path.dirname(partial));
      
      const fileName = path.basename(partial);

      // 检查目录是否存在
      if (!fs.existsSync(basePath)) {
        return [];
      }

      // 读取目录内容
      const entries = fs.readdirSync(basePath, { withFileTypes: true });
      
      // 过滤匹配的文件和目录
      const matches = entries
        .filter(entry => {
          // 跳过隐藏文件（以 . 开头）
          if (entry.name.startsWith('.')) return false;
          
          // 检查是否匹配部分文件名
          return entry.name.toLowerCase().startsWith(fileName.toLowerCase());
        })
        .map(entry => {
          const fullPath = path.join(basePath, entry.name);
          const relativePath = path.relative(this.workingDirectory, fullPath);
          
          // 如果是目录，添加 / 后缀
          return entry.isDirectory() ? relativePath + '/' : relativePath;
        })
        .slice(0, 10); // 限制最多 10 个建议

      return matches;

    } catch (error) {
      return [];
    }
  }

  /**
   * 检查文件是否已经在上下文中
   * @param filePath 文件路径
   * @param existingContext 现有的文件上下文数组
   * @returns 是否已存在
   */
  public isFileInContext(filePath: string, existingContext: FileContext[]): boolean {
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(this.workingDirectory, filePath);

    return existingContext.some(file => file.path === absolutePath);
  }

  /**
   * 移除文件上下文
   * @param filePath 要移除的文件路径
   * @param existingContext 现有的文件上下文数组
   * @returns 更新后的文件上下文数组
   */
  public removeFileFromContext(filePath: string, existingContext: FileContext[]): FileContext[] {
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(this.workingDirectory, filePath);

    return existingContext.filter(file => file.path !== absolutePath);
  }

  /**
   * 获取上下文文件的简短显示名称
   * @param fileContext 文件上下文
   * @returns 相对于工作目录的路径
   */
  public getDisplayName(fileContext: FileContext): string {
    return path.relative(this.workingDirectory, fileContext.path);
  }

  /**
   * 获取支持的文件类型
   * @returns 支持的文件扩展名数组
   */
  public getSupportedFileTypes(): string[] {
    return [
      '.js', '.ts', '.jsx', '.tsx',
      '.py', '.java', '.cpp', '.c', '.h',
      '.go', '.rs', '.php', '.rb',
      '.html', '.css', '.scss', '.less',
      '.json', '.yaml', '.yml', '.xml',
      '.md', '.txt', '.log',
      '.sh', '.bash', '.zsh',
      '.sql', '.graphql',
      '.dockerfile', '.gitignore',
      '.env', '.config'
    ];
  }

  /**
   * 检查文件类型是否受支持
   * @param filePath 文件路径
   * @returns 是否受支持
   */
  public isSupportedFileType(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const supportedTypes = this.getSupportedFileTypes();
    
    // 如果没有扩展名，检查是否为常见的无扩展名文件
    if (!ext) {
      const fileName = path.basename(filePath).toLowerCase();
      const commonFiles = ['dockerfile', 'makefile', 'readme', 'license', 'changelog'];
      return commonFiles.some(common => fileName.includes(common));
    }
    
    return supportedTypes.includes(ext);
  }
}
