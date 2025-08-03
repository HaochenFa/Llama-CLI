#!/usr/bin/env node

/**
 * Script Validation Tool for LlamaCLI
 * Validates that all scripts have correct import paths and dependencies
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = __dirname;

console.log('🔍 Validating LlamaCLI scripts...\n');

const scriptFiles = readdirSync(scriptsDir)
  .filter(file => file.endsWith('.js') && file !== 'validate-scripts.js');

let hasErrors = false;

scriptFiles.forEach(file => {
  const filePath = join(scriptsDir, file);
  const content = readFileSync(filePath, 'utf-8');
  
  console.log(`Checking ${file}...`);
  
  // Check for incorrect import paths
  const srcImports = content.match(/import.*from.*packages.*src/g);
  if (srcImports) {
    console.log(`  ❌ Found src imports (should be dist):`);
    srcImports.forEach(imp => console.log(`     ${imp}`));
    hasErrors = true;
  }
  
  // Check for shebang
  if (!content.startsWith('#!/usr/bin/env node')) {
    console.log(`  ⚠️  Missing shebang line`);
  }
  
  // Check for description comment
  if (!content.includes('/**')) {
    console.log(`  ⚠️  Missing description comment`);
  }
  
  if (!srcImports) {
    console.log(`  ✅ Import paths look good`);
  }
});

if (hasErrors) {
  console.log('\n❌ Some scripts have issues that need to be fixed.');
  process.exit(1);
} else {
  console.log('\n✅ All scripts validated successfully!');
}
