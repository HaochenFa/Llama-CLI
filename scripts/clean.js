#!/usr/bin/env node

/**
 * Clean Script for LlamaCLI
 * Removes build artifacts and temporary files
 * Inspired by Gemini CLI's clean script
 */

import { rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const pathsToClean = [
  'packages/*/dist',
  'packages/*/tsconfig.tsbuildinfo',
  'node_modules/.cache',
  'reports/temp',
  '.nyc_output',
  'coverage'
];

console.log('🧹 Cleaning LlamaCLI build artifacts...\n');

pathsToClean.forEach(pattern => {
  const fullPath = join(projectRoot, pattern);
  
  if (pattern.includes('*')) {
    // Handle glob patterns manually for packages
    if (pattern.startsWith('packages/*/')) {
      const suffix = pattern.replace('packages/*/', '');
      ['cli', 'core'].forEach(pkg => {
        const pkgPath = join(projectRoot, 'packages', pkg, suffix);
        if (existsSync(pkgPath)) {
          console.log(`Removing ${pkgPath}`);
          rmSync(pkgPath, { recursive: true, force: true });
        }
      });
    }
  } else {
    if (existsSync(fullPath)) {
      console.log(`Removing ${fullPath}`);
      rmSync(fullPath, { recursive: true, force: true });
    }
  }
});

console.log('\n✅ Clean completed!');
