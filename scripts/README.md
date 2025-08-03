# LlamaCLI Development Scripts

This directory contains development and testing scripts for LlamaCLI, following best practices inspired by Gemini CLI.

## Script Categories

### 🚀 Demo & Interactive Scripts

- **`interactive-demo.js`** - Interactive CLI features demonstration
- **`simple-cli-demo.js`** - Simple feature showcase (no build required)

### 📊 Performance & Analysis

- **`performance-analysis.js`** - Comprehensive performance analysis and benchmarking
- **`simple-perf-test.js`** - Quick performance tests

### 🧪 Testing Scripts

#### Test Infrastructure

- **`run-tests.js`** - Enhanced test runner with multiple modes
- **`validate-testing-infrastructure.js`** - Test infrastructure validation

#### Integration Tests

- **`test-basic-integration.js`** - Basic integration tests
- **`test-cli-features.js`** - CLI feature validation
- **`test-integration.js`** - Full integration testing
- **`test-error-handling.js`** - Error handling validation
- **`test-preferences.js`** - User preferences testing
- **`simple-preferences-test.js`** - Quick preferences validation
- **`simple-error-test.js`** - Simple error testing

## Usage

### Quick Start

```bash
# Build project first (required for most scripts)
npm run build

# Test commands
npm run test:all          # Run all tests
npm run test:coverage     # Run tests with coverage
npm run test:core         # Run core package tests
npm run test:cli          # Run CLI package tests
npm run test:watch        # Run tests in watch mode
npm run test:validate     # Validate test infrastructure

# Run performance analysis
npm run perf

# Run interactive demo
npm run demo

# Run basic integration tests
npm run test:integration
```

### Direct Script Execution

```bash
# Performance analysis
node scripts/performance-analysis.js

# Interactive demo
node scripts/interactive-demo.js

# Basic integration test
node scripts/test-basic-integration.js
```

## Design Principles

Following Gemini CLI's approach:

1. **JavaScript over TypeScript** - Scripts use JS for simplicity and faster execution
2. **ES Modules** - Modern import/export syntax
3. **Self-contained** - Each script is independent and well-documented
4. **Version Controlled** - All scripts are tracked in git
5. **Package.json Integration** - Key scripts exposed via npm commands

## Dependencies

Scripts import from compiled `dist/` directories, not source `src/` directories:

```javascript
// ✅ Correct
import { InteractiveCLI } from "../packages/cli/dist/ui/interactive-cli.js";

// ❌ Incorrect
import { InteractiveCLI } from "../packages/cli/src/ui/interactive-cli.js";
```

## Adding New Scripts

1. Create script in `scripts/` directory
2. Add shebang: `#!/usr/bin/env node`
3. Use ES modules syntax
4. Import from `dist/` directories
5. Add to `package.json` scripts if needed
6. Document in this README

## Testing Scripts

Scripts can be tested using:

```bash
# Test all scripts
npm run test:scripts

# Test specific script
node scripts/test-script-name.js
```
