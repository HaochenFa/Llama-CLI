# 配置删除功能修复

## 问题描述

用户在使用 LlamaCLI 时遇到了一个逻辑死循环问题：

1. 当只有一个配置（Default Profile）时，该配置必须是激活状态
2. 系统不允许删除激活的配置
3. 因此用户无法删除最后一个配置，陷入死循环

## 解决方案

### 1. 修改 ConfigStore.removeProfile() 方法

**位置**: `packages/core/src/config/store.ts`

**修改内容**:
- 移除了"不能删除激活配置"的限制
- 添加了智能的 defaultProfile 处理逻辑：
  - 如果删除的是激活配置且还有其他配置，自动选择第一个剩余配置作为新的激活配置
  - 如果删除的是最后一个配置，将 defaultProfile 设为空字符串

### 2. 增强 ConfigCommand.removeProfile() 方法

**位置**: `packages/cli/src/commands/config.ts`

**修改内容**:
- 添加了对最后一个配置的特殊警告
- 提供了更详细的确认信息
- 在删除后显示适当的后续步骤提示

### 3. 添加配置向导功能

**位置**: `packages/cli/src/commands/config.ts`

**新增功能**:
- 添加了 `setupWizard()` 方法
- 为首次使用或没有配置的用户提供友好的配置创建引导

### 4. 修改 ChatCommand 和 GetCommand

**位置**: 
- `packages/cli/src/commands/chat.ts`
- `packages/cli/src/commands/get.ts`

**修改内容**:
- 当检测到没有配置时，不再直接退出
- 自动启动配置向导，引导用户创建配置
- 提供更好的错误信息和用户体验

## 功能演示

### 删除配置的新行为

```bash
# 删除最后一个配置时的新提示
$ llamacli config remove "Default Profile"
? Are you sure you want to remove profile 'Default Profile'?
⚠️  This is your last profile. After removal, you'll need to create a new profile to use LlamaCLI. (y/N)

# 删除激活配置时的提示
$ llamacli config remove "My Profile"
? Are you sure you want to remove profile 'My Profile'?
⚠️  This is your active profile. Another profile will be automatically activated. (y/N)
```

### 没有配置时的新体验

```bash
# 启动 chat 时没有配置
$ llamacli chat
🚀 Welcome to LlamaCLI!
It looks like you don't have any profiles configured yet.
Let's create your first profile to get started.

? Would you like to create a profile now? (Y/n)
? Enter a name for your first profile: My First Profile
? Select LLM type: ollama
? Enter API endpoint: http://localhost:11434
? Enter model name: llama3.2
✓ Profile 'My First Profile' added successfully!
✓ Set 'My First Profile' as active profile
🎉 Setup complete! You can now use LlamaCLI.
```

## 技术细节

### 核心逻辑变更

1. **removeProfile() 方法**:
   ```typescript
   removeProfile(id: string): void {
     // 检查配置是否存在
     const profileExists = this.config.llm.profiles.some(p => p.id === id);
     if (!profileExists) {
       throw new Error(`Profile '${id}' not found`);
     }

     // 删除配置
     this.config.llm.profiles = this.config.llm.profiles.filter(p => p.id !== id);
     
     // 智能处理 defaultProfile
     if (id === this.config.llm.defaultProfile) {
       if (this.config.llm.profiles.length > 0) {
         this.config.llm.defaultProfile = this.config.llm.profiles[0].id;
       } else {
         this.config.llm.defaultProfile = "";
       }
     }
   }
   ```

2. **配置检查逻辑**:
   ```typescript
   if (!profile) {
     const allProfiles = this.configStore.getAllProfiles();
     if (allProfiles.length === 0) {
       // 启动配置向导
       const configCommand = new ConfigCommand(this.configStore);
       await configCommand.setupWizard();
       // 重新获取配置...
     } else {
       // 显示可用配置列表...
     }
   }
   ```

## 测试验证

已通过自动化测试验证：
- ✅ 可以删除激活的配置
- ✅ 可以删除最后一个配置
- ✅ 删除配置后正确处理 defaultProfile
- ✅ 没有配置时正确启动向导
- ✅ 配置向导可以正常创建新配置

## 用户体验改进

1. **消除死循环**: 用户现在可以删除任意配置，包括最后一个
2. **智能提示**: 提供清晰的警告和后续步骤指导
3. **自动向导**: 没有配置时自动引导用户创建
4. **优雅降级**: 更好的错误处理和用户反馈

这个修复彻底解决了用户遇到的配置删除死循环问题，并提供了更好的用户体验。
