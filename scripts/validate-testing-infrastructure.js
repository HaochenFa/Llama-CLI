#!/usr/bin/env node

/**
 * Testing Infrastructure Validation Script
 * 
 * This script validates that the testing infrastructure is properly set up
 * and all test utilities are working correctly.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🧪 Validating Testing Infrastructure...\n');

// Test configuration validation
function validateTestConfig() {
  console.log('📋 Validating test configuration...');
  
  const configs = [
    'vitest.config.ts',
    'packages/core/vitest.config.ts',
    'packages/cli/vitest.config.ts',
    'vitest.setup.ts'
  ];
  
  let allValid = true;
  
  configs.forEach(config => {
    const configPath = join(rootDir, config);
    if (existsSync(configPath)) {
      console.log(`  ✅ ${config} exists`);
    } else {
      console.log(`  ❌ ${config} missing`);
      allValid = false;
    }
  });
  
  return allValid;
}

// Test utilities validation
function validateTestUtils() {
  console.log('\n🛠️  Validating test utilities...');
  
  const testUtils = [
    'packages/core/src/test-utils/index.ts',
    'packages/core/src/test-utils/factories.ts',
    'packages/core/src/test-utils/mock-adapters.ts',
    'packages/core/src/test-utils/mock-filesystem.ts',
    'packages/core/src/test-utils/msw-handlers.ts',
    'packages/core/src/test-utils/test-helpers.ts'
  ];
  
  let allValid = true;
  
  testUtils.forEach(util => {
    const utilPath = join(rootDir, util);
    if (existsSync(utilPath)) {
      console.log(`  ✅ ${util} exists`);
    } else {
      console.log(`  ❌ ${util} missing`);
      allValid = false;
    }
  });
  
  return allValid;
}

// Test files validation
function validateTestFiles() {
  console.log('\n📝 Validating test files...');
  
  const testFiles = [
    'packages/core/src/config/__tests__/config.test.ts',
    'packages/core/src/config/__tests__/user-preferences.test.ts',
    'packages/core/src/mcp/__tests__/client.test.ts',
    'packages/core/src/session/__tests__/session-manager.test.ts',
    'packages/core/src/adapters/__tests__/adapters.test.ts',
    'packages/core/src/core/__tests__/enhanced-agentic-loop.test.ts',
    'packages/cli/src/__tests__/cli.test.ts'
  ];
  
  let allValid = true;
  
  testFiles.forEach(testFile => {
    const testPath = join(rootDir, testFile);
    if (existsSync(testPath)) {
      console.log(`  ✅ ${testFile} exists`);
    } else {
      console.log(`  ❌ ${testFile} missing`);
      allValid = false;
    }
  });
  
  return allValid;
}

// Package.json validation
function validatePackageJson() {
  console.log('\n📦 Validating package.json configurations...');
  
  const packageFiles = [
    'package.json',
    'packages/core/package.json',
    'packages/cli/package.json'
  ];
  
  let allValid = true;
  
  packageFiles.forEach(pkgFile => {
    const pkgPath = join(rootDir, pkgFile);
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      
      // Check for test scripts
      if (pkg.scripts && pkg.scripts.test) {
        console.log(`  ✅ ${pkgFile} has test script`);
      } else {
        console.log(`  ❌ ${pkgFile} missing test script`);
        allValid = false;
      }
      
      // Check for vitest dependency
      const hasVitest = (pkg.devDependencies && pkg.devDependencies.vitest) ||
                       (pkg.dependencies && pkg.dependencies.vitest);
      
      if (hasVitest) {
        console.log(`  ✅ ${pkgFile} has vitest dependency`);
      } else {
        console.log(`  ❌ ${pkgFile} missing vitest dependency`);
        allValid = false;
      }
    } else {
      console.log(`  ❌ ${pkgFile} missing`);
      allValid = false;
    }
  });
  
  return allValid;
}

// Run basic tests
function runBasicTests() {
  console.log('\n🚀 Running basic test validation...');
  
  try {
    // Set PATH to use the correct Node.js version
    const env = { ...process.env, PATH: '/opt/homebrew/bin:' + process.env.PATH };
    
    console.log('  Running test suite...');
    const output = execSync('npm test -- --run --reporter=basic', { 
      cwd: rootDir, 
      encoding: 'utf8',
      env: env
    });
    
    console.log('  ✅ Tests executed successfully');
    
    // Parse output for basic stats
    const lines = output.split('\n');
    const testLine = lines.find(line => line.includes('Test Files'));
    if (testLine) {
      console.log(`  📊 ${testLine.trim()}`);
    }
    
    return true;
  } catch (error) {
    console.log('  ❌ Test execution failed');
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

// Generate summary report
function generateSummary(results) {
  console.log('\n📋 Validation Summary');
  console.log('='.repeat(50));
  
  const categories = [
    { name: 'Test Configuration', result: results.config },
    { name: 'Test Utilities', result: results.utils },
    { name: 'Test Files', result: results.files },
    { name: 'Package Configuration', result: results.packages },
    { name: 'Test Execution', result: results.execution }
  ];
  
  let allPassed = true;
  
  categories.forEach(category => {
    const status = category.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${category.name.padEnd(25)} ${status}`);
    if (!category.result) allPassed = false;
  });
  
  console.log('='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All validations passed! Testing infrastructure is ready.');
    process.exit(0);
  } else {
    console.log('⚠️  Some validations failed. Please fix the issues above.');
    process.exit(1);
  }
}

// Main execution
async function main() {
  const results = {
    config: validateTestConfig(),
    utils: validateTestUtils(),
    files: validateTestFiles(),
    packages: validatePackageJson(),
    execution: runBasicTests()
  };
  
  generateSummary(results);
}

main().catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
