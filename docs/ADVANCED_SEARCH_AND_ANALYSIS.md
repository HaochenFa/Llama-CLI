# 高级搜索和代码分析

LlamaCLI 的高级搜索和代码分析系统提供了强大的代码理解、搜索和分析能力，使 AI 代理能够深入理解代码结构和语义。

## 🎯 核心功能

### 1. AST 代码分析器 (ASTAnalyzerTool)

智能的 TypeScript/JavaScript AST 解析和代码分析工具。

#### 主要功能
- **AST 解析**：使用 TypeScript 编译器 API 进行精确的语法分析
- **符号提取**：识别函数、类、变量、接口等代码符号
- **复杂度分析**：计算圈复杂度、认知复杂度和可维护性指数
- **依赖分析**：跟踪 import/export 语句和模块依赖
- **文档提取**：解析 JSDoc 注释和类型信息

#### 使用示例
```bash
llamacli ast_analyzer \
  --filePath src/components/Button.tsx \
  --includeComplexity true \
  --includeDocumentation true \
  --includeTypes true
```

#### 分析结果
- **代码结构统计**：类、接口、函数、变量数量
- **复杂度指标**：圈复杂度、认知复杂度、代码行数
- **符号详情**：名称、类型、位置、修饰符、文档
- **依赖关系**：导入导出的模块和符号

### 2. 跨文件引用分析器 (CrossReferenceAnalyzerTool)

分析项目级别的代码依赖关系和引用。

#### 主要功能
- **依赖图构建**：构建完整的模块依赖关系图
- **循环依赖检测**：识别和报告循环依赖问题
- **未使用导出检测**：找出未被使用的导出符号
- **缺失导入检测**：识别可能缺失的导入声明
- **符号使用跟踪**：跟踪符号的定义和使用位置

#### 使用示例
```bash
llamacli cross_reference_analyzer \
  --projectPath ./src \
  --findCircularDependencies true \
  --findUnusedExports true \
  --excludePatterns "*.test.*,*.spec.*"
```

#### 分析结果
- **依赖统计**：内部依赖、外部依赖数量
- **循环依赖**：检测到的循环依赖链
- **未使用导出**：可以清理的导出符号
- **依赖图摘要**：最依赖的文件和依赖最多的文件

### 3. 语义搜索引擎 (SemanticSearchTool)

基于语义理解的智能代码搜索。

#### 主要功能
- **语义理解**：理解搜索意图和代码语义
- **多种搜索模式**：精确匹配、语义匹配、模糊匹配
- **智能过滤**：按符号类型、文件类型、作用域过滤
- **相关性评分**：基于多种因素计算搜索结果相关性
- **上下文提供**：提供搜索结果的代码上下文

#### 使用示例
```bash
# 查找函数
llamacli semantic_search \
  --query "authentication function" \
  --projectPath ./src \
  --intent find_function \
  --maxResults 10

# 查找类
llamacli semantic_search \
  --query "user management class" \
  --projectPath ./src \
  --intent find_class \
  --includeContext true
```

#### 搜索意图
- `find_function` - 查找函数和方法
- `find_class` - 查找类和接口
- `find_variable` - 查找变量和常量
- `find_usage` - 查找符号使用
- `find_definition` - 查找符号定义
- `general` - 通用搜索

### 4. 智能代码索引器 (CodeIndexerTool)

构建和维护项目级别的代码索引。

#### 主要功能
- **增量索引**：支持增量更新，避免重复分析
- **符号索引**：建立符号名称到位置的快速映射
- **缓存机制**：智能缓存分析结果，提升性能
- **项目统计**：提供项目级别的代码统计信息
- **快速查询**：基于索引的快速符号查找

#### 使用示例
```bash
# 创建索引
llamacli code_indexer \
  --projectPath ./src \
  --action create \
  --includeNodeModules false

# 更新索引
llamacli code_indexer \
  --projectPath ./src \
  --action update \
  --filePath src/components/Button.tsx

# 查询符号
llamacli code_indexer \
  --projectPath ./src \
  --action query \
  --query "Button" \
  --symbolType "class"

# 获取统计信息
llamacli code_indexer \
  --projectPath ./src \
  --action stats
```

#### 索引操作
- `create` - 创建新索引
- `update` - 更新现有索引
- `query` - 查询符号
- `stats` - 获取索引统计
- `rebuild` - 重建索引

## 🔧 技术特性

### AST 解析能力

#### 支持的语言特性
- **TypeScript**：完整的 TS 语法支持，包括泛型、装饰器、命名空间
- **JavaScript**：ES6+ 语法支持，包括模块、箭头函数、解构
- **JSX/TSX**：React 组件分析支持
- **类型系统**：TypeScript 类型信息提取和分析

#### 符号识别
```typescript
// 识别的符号类型
interface SymbolInfo {
  name: string;
  kind: 'FunctionDeclaration' | 'ClassDeclaration' | 'VariableDeclaration' | ...;
  line: number;
  column: number;
  type?: string;
  modifiers: string[];
  documentation?: string;
  parameters?: ParameterInfo[];
  returnType?: string;
}
```

### 复杂度分析

#### 支持的指标
- **圈复杂度**：基于控制流的复杂度计算
- **认知复杂度**：基于代码理解难度的复杂度
- **Halstead 指标**：词汇量、长度、难度、工作量
- **可维护性指数**：综合可维护性评分

#### 复杂度阈值建议
```typescript
const COMPLEXITY_THRESHOLDS = {
  cyclomaticComplexity: {
    low: 1-10,      // 简单
    medium: 11-20,  // 中等
    high: 21-50,    // 复杂
    veryHigh: 50+   // 非常复杂
  },
  maintainabilityIndex: {
    high: 85-100,   // 高可维护性
    medium: 65-84,  // 中等可维护性
    low: 0-64       // 低可维护性
  }
};
```

### 语义搜索算法

#### 相关性评分
```typescript
function calculateRelevanceScore(query: string, symbol: string, context: string): number {
  let score = 0;
  
  // 精确匹配 (1.0)
  if (symbol.toLowerCase() === query.toLowerCase()) {
    score = 1.0;
  }
  // 包含匹配 (0.8)
  else if (symbol.toLowerCase().includes(query.toLowerCase())) {
    score = 0.8;
  }
  // 上下文匹配 (0.6)
  else if (context.toLowerCase().includes(query.toLowerCase())) {
    score = 0.6;
  }
  
  // 类型相关性加分
  if (matchesSearchIntent(query, symbol)) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}
```

#### 搜索策略
1. **关键词提取**：从查询中提取关键词
2. **意图识别**：自动识别搜索意图
3. **符号匹配**：在符号名称中查找匹配
4. **上下文匹配**：在代码上下文中查找匹配
5. **相关性排序**：按相关性分数排序结果

## 📊 性能优化

### 缓存策略

#### 多层缓存
```typescript
const CACHE_CONFIG = {
  // AST 解析缓存
  astCache: {
    ttl: 300000,      // 5分钟
    maxSize: 1000,    // 最大缓存项数
  },
  
  // 索引缓存
  indexCache: {
    ttl: 3600000,     // 1小时
    maxSize: 100,     // 最大项目数
  },
  
  // 搜索结果缓存
  searchCache: {
    ttl: 600000,      // 10分钟
    maxSize: 500,     // 最大查询数
  }
};
```

#### 增量更新
- **文件哈希检查**：只重新分析修改过的文件
- **依赖追踪**：更新影响的依赖文件
- **索引合并**：增量更新索引而非重建

### 并发处理

#### 批量处理
```typescript
const PERFORMANCE_CONFIG = {
  maxConcurrentAnalysis: 5,    // 最大并发分析数
  batchSize: 50,               // 批处理大小
  maxFileSize: 10 * 1024 * 1024, // 10MB 文件大小限制
  maxProjectFiles: 10000,      // 最大项目文件数
};
```

## 🎮 使用场景

### 1. 代码重构
```bash
# 查找所有使用特定函数的地方
llamacli semantic_search \
  --query "getUserData" \
  --projectPath ./src \
  --intent find_usage

# 分析重构影响范围
llamacli cross_reference_analyzer \
  --projectPath ./src \
  --findUnusedExports true
```

### 2. 代码审查
```bash
# 分析代码复杂度
llamacli ast_analyzer \
  --filePath src/utils/complex-logic.ts \
  --includeComplexity true

# 检查循环依赖
llamacli cross_reference_analyzer \
  --projectPath ./src \
  --findCircularDependencies true
```

### 3. 项目分析
```bash
# 创建项目索引
llamacli code_indexer \
  --projectPath ./src \
  --action create

# 获取项目统计
llamacli code_indexer \
  --projectPath ./src \
  --action stats
```

### 4. 代码搜索
```bash
# 查找认证相关的类
llamacli semantic_search \
  --query "authentication authorization" \
  --projectPath ./src \
  --intent find_class \
  --maxResults 20
```

## 🔍 故障排除

### 常见问题

#### 1. AST 解析失败
```
Error: AST analysis failed
```
**解决方案：**
- 检查 TypeScript 语法是否正确
- 确保文件编码为 UTF-8
- 检查文件大小是否超过限制

#### 2. 索引创建失败
```
Error: Failed to create index
```
**解决方案：**
- 检查项目路径是否正确
- 确保有足够的磁盘空间
- 检查文件权限

#### 3. 搜索结果为空
```
No results found matching your query
```
**解决方案：**
- 尝试更宽泛的搜索词
- 检查搜索范围设置
- 启用模糊搜索
- 降低相关性阈值

### 调试技巧

#### 启用详细日志
```bash
export DEBUG=llamacli:analysis:*
llamacli ast_analyzer --filePath src/test.ts
```

#### 检查索引状态
```bash
llamacli code_indexer \
  --projectPath ./src \
  --action stats
```

#### 验证搜索配置
```bash
llamacli semantic_search \
  --query "test" \
  --projectPath ./src \
  --intent general \
  --maxResults 1 \
  --minRelevanceScore 0.1
```

## 📈 最佳实践

### 1. 索引管理
- **定期更新**：在代码变更后及时更新索引
- **合理缓存**：根据项目大小调整缓存设置
- **清理策略**：定期清理过期的索引和缓存

### 2. 搜索优化
- **明确意图**：使用合适的搜索意图提升准确性
- **组合查询**：结合多个工具获得更全面的结果
- **上下文利用**：充分利用代码上下文信息

### 3. 性能调优
- **批量处理**：对大型项目使用批量分析
- **并发控制**：根据硬件能力调整并发数
- **内存管理**：监控内存使用，避免内存泄漏

### 4. 代码质量
- **复杂度监控**：定期检查代码复杂度指标
- **依赖管理**：及时解决循环依赖问题
- **清理维护**：移除未使用的导出和导入

## 🚀 未来发展

### 计划中的功能
- **多语言支持**：Python、Java、C# 等语言支持
- **AI 增强搜索**：基于机器学习的语义理解
- **可视化界面**：依赖图和代码结构可视化
- **集成开发环境**：IDE 插件和扩展

### 扩展能力
- **自定义分析器**：支持自定义 AST 分析规则
- **插件系统**：第三方分析工具集成
- **云端分析**：大型项目的云端分析服务
- **团队协作**：多人协作的代码分析和搜索

这个高级搜索和代码分析系统为 LlamaCLI 提供了强大的代码理解能力，使其能够深入分析代码结构、理解语义关系，并提供智能的搜索和分析功能。
