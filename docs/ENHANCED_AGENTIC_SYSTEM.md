# Enhanced Agentic System

LlamaCLI 的增强 Agentic 系统提供了先进的任务分解、上下文管理和动态执行规划能力，使 AI 代理能够更智能地处理复杂任务。

## 🎯 核心组件

### 1. 任务分解器 (TaskDecomposer)

智能地将复杂目标分解为可管理的子任务。

#### 主要功能
- **复杂度分析**：评估任务复杂度和所需能力
- **智能分解**：将大任务拆分为逻辑子任务
- **依赖分析**：识别任务间的依赖关系
- **风险评估**：识别潜在风险和缓解策略
- **成功标准**：为每个任务定义明确的成功标准

#### 使用示例
```typescript
import { TaskDecomposer } from '@llamacli/core';

const decomposer = new TaskDecomposer(llmAdapter);
const decomposition = await decomposer.decompose(
  "创建一个完整的项目计划",
  context
);

console.log(`分解为 ${decomposition.subTasks.length} 个子任务`);
console.log(`复杂度评分: ${decomposition.estimatedComplexity}/10`);
```

#### 任务类型
- `information_gathering` - 信息收集
- `data_processing` - 数据处理
- `analysis` - 分析
- `synthesis` - 综合
- `validation` - 验证
- `execution` - 执行
- `communication` - 沟通

### 2. 增强上下文管理器 (EnhancedContextManager)

提供智能的上下文压缩、记忆管理和相关性评分。

#### 主要功能
- **智能压缩**：当上下文过长时自动压缩
- **相关性评分**：根据当前目标评估上下文相关性
- **记忆整合**：将重要信息转化为长期记忆
- **模式识别**：识别行为和结果模式
- **语义搜索**：基于语义相似性搜索记忆

#### 使用示例
```typescript
import { EnhancedContextManager } from '@llamacli/core';

const contextManager = new EnhancedContextManager(llmAdapter);

// 添加上下文
const contextId = contextManager.addContext(
  'goal',
  '创建项目计划',
  { priority: 'high' },
  ['planning', 'primary']
);

// 获取相关上下文
const relevantContext = await contextManager.getRelevantContext(
  '当前目标',
  2048 // 最大 token 数
);

// 压缩上下文
const compression = await contextManager.compressContext('当前目标');
console.log(`压缩比: ${compression.compressionRatio}`);

// 整合记忆
const consolidation = await contextManager.consolidateMemories();
console.log(`新增记忆: ${consolidation.consolidatedMemories.length}`);
```

#### 上下文类型
- `goal` - 目标
- `step` - 执行步骤
- `observation` - 观察结果
- `reflection` - 反思
- `external_info` - 外部信息
- `user_input` - 用户输入
- `tool_result` - 工具结果
- `memory` - 记忆

### 3. 动态执行规划器 (DynamicExecutionPlanner)

提供自适应的执行规划，能够根据执行结果动态调整计划。

#### 主要功能
- **动态调整**：根据执行结果实时调整计划
- **依赖管理**：智能处理任务依赖关系
- **风险缓解**：自动激活应急计划
- **性能监控**：跟踪执行指标和效率
- **学习优化**：从执行历史中学习改进

#### 使用示例
```typescript
import { DynamicExecutionPlanner } from '@llamacli/core';

const planner = new DynamicExecutionPlanner(llmAdapter);

// 创建执行计划
const plan = await planner.createPlan(taskDecomposition, context);

// 获取下一个任务
const nextTask = planner.getNextTask();

// 更新任务状态
await planner.updateTaskStatus(
  taskId,
  'completed',
  result,
  error
);

// 获取进度
const progress = planner.getPlanProgress();
console.log(`总体进度: ${Math.round(progress.overall * 100)}%`);
```

#### 任务状态
- `pending` - 等待中
- `ready` - 就绪
- `executing` - 执行中
- `completed` - 已完成
- `failed` - 失败
- `skipped` - 跳过
- `blocked` - 阻塞

## 🔄 集成工作流

### 完整的增强 Agentic 流程

```typescript
import { 
  TaskDecomposer, 
  EnhancedContextManager, 
  DynamicExecutionPlanner,
  AgenticLoop 
} from '@llamacli/core';

// 1. 初始化组件
const decomposer = new TaskDecomposer(llmAdapter);
const contextManager = new EnhancedContextManager(llmAdapter);
const planner = new DynamicExecutionPlanner(llmAdapter);

// 2. 分解任务
const decomposition = await decomposer.decompose(goal, context);

// 3. 创建执行计划
const executionPlan = await planner.createPlan(decomposition, context);

// 4. 执行循环
while (!completed) {
  // 获取下一个任务
  const nextTask = planner.getNextTask();
  
  if (nextTask) {
    // 获取相关上下文
    const relevantContext = await contextManager.getRelevantContext(
      `${goal} - ${nextTask.description}`
    );
    
    // 执行任务
    const result = await executeTask(nextTask, relevantContext);
    
    // 更新状态
    await planner.updateTaskStatus(
      nextTask.id,
      result.success ? 'completed' : 'failed',
      result.data,
      result.error
    );
    
    // 添加结果到上下文
    contextManager.addContext(
      'tool_result',
      `任务 "${nextTask.title}" 完成: ${result.data}`,
      { taskId: nextTask.id },
      ['execution']
    );
  }
  
  // 检查完成条件
  const progress = planner.getPlanProgress();
  completed = progress.overall >= 1.0;
}

// 5. 整合记忆
await contextManager.consolidateMemories();
```

## 📊 性能监控

### 执行指标

```typescript
const metrics = plan.metrics;

console.log(`总任务数: ${metrics.totalTasks}`);
console.log(`已完成: ${metrics.completedTasks}`);
console.log(`失败: ${metrics.failedTasks}`);
console.log(`效率比: ${metrics.efficiencyRatio}`);
console.log(`错误率: ${metrics.errorRate}`);
console.log(`适应次数: ${metrics.adaptationCount}`);
```

### 上下文统计

```typescript
const summary = await contextManager.getContextSummary(goal);
console.log('上下文摘要:', summary);

const memories = await contextManager.searchMemories('项目规划', 5);
console.log(`找到 ${memories.length} 条相关记忆`);
```

## 🛠️ 配置选项

### TaskDecomposer 配置

```typescript
const decomposerConfig = {
  maxSubTasks: 20,           // 最大子任务数
  maxDepth: 5,               // 最大分解深度
  minTaskDuration: 30,       // 最小任务时长(秒)
  maxTaskDuration: 1800,     // 最大任务时长(秒)
  enableRiskAnalysis: true,  // 启用风险分析
  enableDependencyOptimization: true, // 启用依赖优化
};
```

### EnhancedContextManager 配置

```typescript
const contextConfig = {
  maxContextItems: 100,      // 最大上下文项数
  maxTokens: 8192,          // 最大 token 数
  compressionThreshold: 6144, // 压缩阈值
  relevanceDecayRate: 0.95,  // 相关性衰减率
  enablePatternRecognition: true, // 启用模式识别
  enableSemanticSearch: true,     // 启用语义搜索
};
```

### DynamicExecutionPlanner 配置

```typescript
const plannerConfig = {
  maxAdaptations: 10,        // 最大适应次数
  adaptationThreshold: 0.3,  // 适应阈值
  maxRetries: 3,            // 最大重试次数
  timeoutMultiplier: 1.5,   // 超时倍数
  enableContingencyPlanning: true, // 启用应急规划
  enableRealTimeOptimization: true, // 启用实时优化
};
```

## 🎯 最佳实践

### 1. 任务分解
- 保持任务粒度适中（30秒-30分钟）
- 明确定义成功标准
- 考虑任务间的依赖关系
- 为高风险任务准备备选方案

### 2. 上下文管理
- 定期整合记忆以避免信息丢失
- 使用有意义的标签组织上下文
- 监控上下文大小，及时压缩
- 利用语义搜索提高检索效率

### 3. 执行规划
- 设置合理的超时和重试参数
- 启用应急规划处理异常情况
- 监控执行指标识别瓶颈
- 从执行历史中学习优化策略

### 4. 性能优化
- 根据任务复杂度调整配置参数
- 使用批量操作减少 API 调用
- 实施智能缓存策略
- 定期清理过期的上下文和记忆

## 🔍 故障排除

### 常见问题

1. **任务分解过于细粒度**
   - 增加 `minTaskDuration` 参数
   - 减少 `maxSubTasks` 限制

2. **上下文压缩过于频繁**
   - 增加 `compressionThreshold`
   - 调整 `relevanceDecayRate`

3. **执行计划适应过多**
   - 降低 `adaptationThreshold`
   - 减少 `maxAdaptations`

4. **记忆整合性能问题**
   - 增加 `memoryConsolidationInterval`
   - 限制 `maxContextItems`

### 调试技巧

```typescript
// 启用详细日志
const config = {
  verboseLogging: true,
  enableDebugMode: true,
};

// 监控组件状态
console.log('任务分解结果:', decomposition);
console.log('执行计划状态:', plan.status);
console.log('上下文项数量:', contextManager.getItemCount());
```

## 📈 未来发展

### 计划中的功能
- **多代理协作**：支持多个代理协同工作
- **学习优化**：基于历史数据自动优化参数
- **可视化界面**：提供执行过程的可视化监控
- **插件系统**：支持自定义分解和规划策略

### 扩展点
- 自定义任务分解策略
- 插件化上下文压缩算法
- 可配置的执行规划器
- 自定义记忆整合规则

这个增强的 Agentic 系统为 LlamaCLI 提供了强大的自主推理和执行能力，使其能够处理更复杂的任务并从经验中学习改进。
