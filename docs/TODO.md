# LlamaCLI 项目 TODO 清单

> 最后更新: 2024年12月
> 当前进度: 约75%完成

## 🎯 当前优先级任务

### 高优先级 (本周完成)

#### 1. 修复和完善现有实现

- [x] 修复核心包类型错误 ✅
- [x] 创建 `packages/cli/src/utils/logger.ts` ✅
- [x] 创建 `packages/cli/src/utils/error-handler.ts` ✅
- [x] 修复CLI包的剩余类型错误 ✅
- [x] 修复TypeScript配置和构建问题 ✅
- [x] 创建错误处理工具函数 ✅
- [ ] 完善Ollama适配器的错误处理
- [ ] 添加基础的集成测试

#### 2. MCP服务器实现

- [ ] 创建 `packages/core/src/mcp/server.ts`
- [ ] 实现工具注册机制
- [ ] 支持工具调用处理
- [ ] 实现资源管理
- [ ] 添加MCP协议一致性测试

#### 3. 核心循环逻辑完善

- [x] 创建基础的上下文管理 ✅
- [ ] 实现完整的ContextManager
- [ ] 实现SessionManager
- [ ] 实现简单的Agentic循环
- [ ] 添加工具调用支持

### 中优先级 (下周完成)

#### 4. CLI命令完善

- [x] 创建 `packages/cli/src/commands/chat.ts` ✅
- [x] 创建 `packages/cli/src/commands/config.ts` ✅
- [x] 创建 `packages/cli/src/commands/get.ts` ✅
- [x] 创建 `packages/cli/src/index.ts` (主入口) ✅
- [ ] 完善React UI组件
- [ ] 添加更多CLI工具函数

#### 5. 网络工具集

- [ ] 实现 `WebSearchTool` - 网络搜索功能
- [ ] 实现 `HttpRequestTool` - HTTP请求工具
- [ ] 实现 `DownloadFileTool` - 文件下载工具
- [ ] 添加网络工具的安全控制

### 低优先级 (后续完成)

#### 6. 高级适配器

- [ ] 实现 `OpenAIAdapter` 类
- [ ] 实现 `ClaudeAdapter` 类
- [ ] 实现 `vLLMAdapter` 类
- [ ] 创建适配器工厂模式

#### 7. UI组件

- [x] 创建React终端UI组件基础框架 ✅
- [ ] 完善UI组件功能
- [ ] 实现主题系统
- [ ] 优化用户交互体验

## 📋 详细任务分解

### MCP服务器实现

**文件**: `packages/core/src/mcp/server.ts`

```typescript
// 需要实现的主要类和方法
export class BuiltinMCPServer {
  private tools: Map<string, ToolHandler>;
  private resources: Map<string, ResourceHandler>;

  registerTool(name: string, handler: ToolHandler): void;
  registerResource(uri: string, handler: ResourceHandler): void;
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

**关键功能**:

- JSON-RPC 2.0协议处理
- 工具调用路由
- 资源访问管理
- 错误处理和日志记录

### 网络工具实现

**文件结构**:

```text
packages/core/src/tools/network/
├── web-search.ts
├── http-request.ts
├── download-file.ts
└── index.ts
```

**安全要求**:

- URL白名单验证
- 请求大小限制
- 超时控制
- 恶意内容检测

### CLI工具模块

**Logger** (`packages/cli/src/utils/logger.ts`):

- 支持多级别日志 (debug, info, warn, error)
- 文件和控制台输出
- 结构化日志格式
- 性能监控

**ErrorHandler** (`packages/cli/src/utils/error-handler.ts`):

- 统一错误处理
- 用户友好的错误消息
- 错误恢复建议
- 错误报告机制

**Formatter** (`packages/cli/src/utils/formatter.ts`):

- 表格输出格式化
- 进度条显示
- 颜色和样式管理
- 响应式布局

**Prompt** (`packages/cli/src/utils/prompt.ts`):

- 交互式用户输入
- 确认对话框
- 选择列表
- 输入验证

## 🔧 技术债务

### 需要重构的部分

- [ ] 统一错误处理机制
- [ ] 改进类型定义的一致性
- [ ] 优化配置系统的性能
- [ ] 增强测试覆盖率

### 性能优化

- [ ] 实现请求缓存机制
- [ ] 优化大文件处理
- [ ] 减少内存占用
- [ ] 改进启动时间

## 📊 测试计划

### 单元测试

- [ ] 核心模块测试覆盖率 >90%
- [ ] 适配器测试覆盖率 >95%
- [ ] 工具系统测试覆盖率 >90%
- [ ] MCP协议测试覆盖率 >95%

### 集成测试

- [ ] 端到端工作流测试
- [ ] 多后端兼容性测试
- [ ] 错误场景测试
- [ ] 性能基准测试

## 📚 文档更新

### 需要创建的文档

- [ ] API参考文档
- [ ] 用户使用手册
- [ ] 开发者指南
- [ ] 故障排除指南
- [ ] 架构设计文档

### 需要更新的文档

- [x] 实施路线图 (已更新)
- [ ] 技术规范文档
- [ ] 配置说明文档
- [ ] 工具使用文档

## 🚀 发布计划

### Alpha版本 (目标: 2周内)

- 基础CLI功能
- Ollama适配器
- 文件系统工具
- 基础MCP支持

### Beta版本 (目标: 4周内)

- 完整的工具系统
- 多适配器支持
- Agentic循环
- 用户界面优化

### 正式版本 (目标: 6周内)

- 全功能实现
- 完整测试覆盖
- 性能优化
- 文档完善

## 📝 注意事项

1. **代码质量**: 每个PR都需要代码审查
2. **测试优先**: 新功能必须包含测试
3. **文档同步**: 代码变更需要更新相关文档
4. **向后兼容**: 保持API的向后兼容性
5. **安全第一**: 所有用户输入都需要验证和清理

---

**维护说明**: 此TODO清单应该每周更新一次，反映最新的项目进度和优先级变化。
