# LlamaCLI 项目启动指南

## 快速开始

本指南将帮助开发团队快速搭建 LlamaCLI 开发环境并开始项目开发。

## 环境要求

### 系统要求

- **操作系统**: macOS 10.15+, Ubuntu 18.04+, Windows 10+ (WSL2)
- **Node.js**: 18.0+ (推荐 20.x LTS)
- **npm**: 9.0+
- **Git**: 2.30+

### 开发工具

- **IDE**: VS Code (推荐) 或 WebStorm
- **终端**: iTerm2 (macOS) 或 Windows Terminal
- **浏览器**: Chrome 或 Firefox (用于文档查看)

### 可选工具

- **Ollama**: 本地 LLM 服务 (用于测试)
- **Docker**: 容器化部署 (可选)

## 项目初始化

### 1. 克隆项目模板

```bash
# 创建项目目录
mkdir llamacli && cd llamacli

# 初始化 Git 仓库
git init

# 创建基础目录结构
mkdir -p {\
  packages/{core,cli}/src,\
  packages/core/src/{adapters,config,core,mcp,tools,types,utils},\
  packages/cli/src/{commands,ui/{components,hooks,themes},utils},\
  scripts,\
  tests/{unit,integration,e2e,mocks,utils},\
  docs,\
  .github/workflows\
}

# 创建基础文件
touch {\
  package.json,\
  tsconfig.json,\
  esbuild.config.js,\
  vitest.config.ts,\
  .eslintrc.js,\
  .prettierrc,\
  .gitignore,\
  README.md\
}
```

### 2. 配置根 package.json

```json
{
  "name": "llamacli",
  "version": "0.1.0",
  "description": "AI-powered command line development partner",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev": "npm run dev --workspace=@llamacli/cli",
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "lint": "eslint packages/*/src/**/*.{ts,tsx}",
    "lint:fix": "eslint packages/*/src/**/*.{ts,tsx} --fix",
    "format": "prettier --write packages/*/src/**/*.{ts,tsx}",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf packages/*/dist node_modules/.cache",
    "prepare": "husky install"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "esbuild": "^0.19.8",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "prettier": "^3.1.1",
    "typescript": "^5.3.3",
    "vitest": "^1.1.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

### 3. 配置 TypeScript

**根目录 tsconfig.json**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@llamacli/core": ["./packages/core/src"],
      "@llamacli/cli": ["./packages/cli/src"]
    }
  },
  "references": [{ "path": "./packages/core" }, { "path": "./packages/cli" }],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 4. 配置构建系统

**esbuild.config.js**:

```javascript
const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const isWatch = process.argv.includes("--watch");
const isDev = process.env.NODE_ENV !== "production";

const buildPackage = async (packageName, entryPoint, outfile, options = {}) => {
  const config = {
    entryPoints: [entryPoint],
    bundle: true,
    outfile,
    platform: "node",
    target: "node18",
    format: "esm",
    external: ["react", "ink", "commander"],
    minify: !isDev,
    sourcemap: isDev,
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    },
    ...options,
  };

  if (isWatch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log(`Watching ${packageName}...`);
  } else {
    await esbuild.build(config);
    console.log(`Built ${packageName}`);
  }
};

const main = async () => {
  // 确保输出目录存在
  ["packages/core/dist", "packages/cli/dist"].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 构建核心包
  await buildPackage("core", "packages/core/src/index.ts", "packages/core/dist/index.js");

  // 构建 CLI 包
  await buildPackage("cli", "packages/cli/src/index.ts", "packages/cli/dist/index.js", {
    banner: {
      js: "#!/usr/bin/env node",
    },
  });

  if (!isWatch) {
    console.log("Build completed!");
  }
};

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { buildPackage };
```

### 5. 配置代码质量工具

**.eslintrc.js**:

```javascript
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "@typescript-eslint/recommended", "prettier"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "warn",
  },
  ignorePatterns: ["dist/", "node_modules/", "*.js"],
};
```

**.prettierrc**:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### 6. 配置测试环境

**vitest.config.ts**:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "**/*.test.ts", "**/*.config.js", "tests/"],
    },
  },
  resolve: {
    alias: {
      "@llamacli/core": path.resolve(__dirname, "./packages/core/src"),
      "@llamacli/cli": path.resolve(__dirname, "./packages/cli/src"),
    },
  },
});
```

**tests/setup.ts**:

```typescript
import { vi } from "vitest";

// Mock console methods in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock fetch for tests
global.fetch = vi.fn();

// Setup test environment
process.env.NODE_ENV = "test";
```

### 7. 配置 Git 和 CI/CD

**.gitignore**:

```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Test coverage
coverage/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Cache
.cache/
.npm/
.eslintcache
```

**.github/workflows/ci.yml**:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm run test:unit

      - name: Build packages
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: matrix.node-version == '20.x'
```

## 包结构设置

### Core 包配置

**packages/core/package.json**:

```json
{
  "name": "@llamacli/core",
  "version": "0.1.0",
  "description": "Core functionality for LlamaCLI",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "node ../../esbuild.config.js && tsc --emitDeclarationOnly",
    "dev": "node ../../esbuild.config.js --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"]
}
```

**packages/core/tsconfig.json**:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "**/*.test.ts"]
}
```

### CLI 包配置

**packages/cli/package.json**:

```json
{
  "name": "@llamacli/cli",
  "version": "0.1.0",
  "description": "Command line interface for LlamaCLI",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "llamacli": "dist/index.js",
    "llama": "dist/index.js"
  },
  "scripts": {
    "build": "node ../../esbuild.config.js",
    "dev": "node ../../esbuild.config.js --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@llamacli/core": "workspace:*",
    "commander": "^11.1.0",
    "ink": "^4.4.1",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "typescript": "^5.3.3"
  },
  "files": ["dist"]
}
```

## 开发工作流

### 1. 安装依赖

```bash
# 安装所有依赖
npm install

# 安装 Git hooks
npm run prepare
```

### 2. 开发模式

```bash
# 启动开发模式（监听文件变化）
npm run dev

# 在另一个终端运行测试
npm run test:watch
```

### 3. 代码质量检查

```bash
# 类型检查
npm run type-check

# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 代码格式化
npm run format
```

### 4. 测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 生成覆盖率报告
npm test -- --coverage
```

### 5. 构建

```bash
# 构建所有包
npm run build

# 清理构建文件
npm run clean
```

## 开发规范

### 代码风格

1. **命名规范**:

   - 文件名: `kebab-case` (例: `llm-adapter.ts`)
   - 类名: `PascalCase` (例: `LLMAdapter`)
   - 函数名: `camelCase` (例: `createAdapter`)
   - 常量: `UPPER_SNAKE_CASE` (例: `MAX_RETRY_COUNT`)

2. **文件组织**:

   - 每个文件只导出一个主要类或函数
   - 相关的类型定义放在同一文件或专门的 types 文件中
   - 测试文件与源文件同名，添加 `.test.ts` 后缀

3. **导入顺序**:

   ```typescript
   // 1. Node.js 内置模块
   import * as fs from "fs";
   import * as path from "path";

   // 2. 第三方库
   import { Command } from "commander";
   import React from "react";

   // 3. 内部模块
   import { LLMAdapter } from "../types/adapters.js";
   import { ConfigStore } from "./config.js";
   ```

### Git 工作流

1. **分支策略**:

   - `main`: 主分支，稳定版本
   - `develop`: 开发分支，集成新功能
   - `feature/*`: 功能分支
   - `bugfix/*`: 修复分支
   - `release/*`: 发布分支

2. **提交信息格式**:

   ```
   type(scope): description

   [optional body]

   [optional footer]
   ```

   类型:

   - `feat`: 新功能
   - `fix`: 修复
   - `docs`: 文档
   - `style`: 格式
   - `refactor`: 重构
   - `test`: 测试
   - `chore`: 构建/工具

3. **Pull Request 流程**:
   - 创建功能分支
   - 完成开发和测试
   - 提交 PR 到 develop 分支
   - 代码审查
   - 合并到 develop

## 调试和故障排除

### 常见问题

**问题**: TypeScript 编译错误  
**解决**:

```bash
# 清理缓存
npm run clean

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 检查类型
npm run type-check
```

**问题**: 测试失败  
**解决**:

```bash
# 运行单个测试文件
npx vitest run path/to/test.test.ts

# 调试模式
npx vitest --inspect-brk
```

**问题**: 构建失败  
**解决**:

```bash
# 检查 esbuild 配置
node esbuild.config.js

# 手动构建单个包
cd packages/core && npm run build
```

### 调试技巧

1. **使用 VS Code 调试器**:
   创建 `.vscode/launch.json`:

   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Debug Tests",
         "type": "node",
         "request": "launch",
         "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
         "args": ["run", "--inspect-brk"],
         "console": "integratedTerminal",
         "internalConsoleOptions": "neverOpen"
       }
     ]
   }
   ```

2. **日志调试**:

   ```typescript
   import { Logger } from "./utils/logger.js";

   const logger = new Logger(LogLevel.DEBUG);
   logger.debug("Debug message", { data });
   ```

3. **性能分析**:
   ```bash
   # 使用 Node.js 性能分析
   node --prof dist/index.js
   node --prof-process isolate-*.log > profile.txt
   ```

## 下一步

完成环境搭建后，请按照以下顺序开始开发：

1. **阅读设计文档**: 熟悉项目架构和设计理念
2. **实现核心类型**: 从 `packages/core/src/types/` 开始
3. **创建第一个测试**: 建立测试驱动开发习惯
4. **实现基础适配器**: 从 Ollama 适配器开始
5. **持续集成**: 确保每次提交都通过 CI 检查

## 获取帮助

- **项目文档**: 查看 `docs/` 目录
- **API 参考**: 运行 `npm run docs` 生成
- **问题反馈**: 创建 GitHub Issue
- **团队沟通**: 使用项目 Slack 频道

祝开发愉快！🚀
