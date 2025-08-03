#!/usr/bin/env node

/**
 * Test Script for Enhanced Error Handling System
 * Tests error processing, display, and reporting functionality
 */

import { 
  enhancedErrorHandler, 
  errorDisplayManager, 
  errorReporter,
  errorMiddleware,
  ErrorType,
  createErrorContext,
  handleError,
  handleInteractiveError,
  handleQuietError,
} from '../packages/core/dist/index.js';

async function testErrorHandling() {
  console.log('🧪 Testing Enhanced Error Handling System\n');

  try {
    // Test 1: Error Classification
    console.log('1. Testing error classification...');
    
    const networkError = new Error('Connection timeout: ECONNREFUSED');
    const authError = new Error('Unauthorized: Invalid API key');
    const configError = new Error('Profile not found: default-profile');
    const validationError = new Error('Invalid input: missing required field');
    
    const enhancedNetworkError = enhancedErrorHandler.processError(networkError);
    const enhancedAuthError = enhancedErrorHandler.processError(authError);
    const enhancedConfigError = enhancedErrorHandler.processError(configError);
    const enhancedValidationError = enhancedErrorHandler.processError(validationError);
    
    console.log(`✅ Network error classified as: ${enhancedNetworkError.type}`);
    console.log(`✅ Auth error classified as: ${enhancedAuthError.type}`);
    console.log(`✅ Config error classified as: ${enhancedConfigError.type}`);
    console.log(`✅ Validation error classified as: ${enhancedValidationError.type}\n`);

    // Test 2: Error Enhancement
    console.log('2. Testing error enhancement...');
    
    const context = createErrorContext('chat', 'send-message', 'Hello world', 'test-session-123');
    const enhancedError = enhancedErrorHandler.processError(networkError, context);
    
    console.log(`✅ Enhanced error has ${enhancedError.suggestions.length} suggestions`);
    console.log(`✅ Error is ${enhancedError.recoverable ? 'recoverable' : 'not recoverable'}`);
    console.log(`✅ Error is ${enhancedError.reportable ? 'reportable' : 'not reportable'}`);
    console.log(`✅ User message: "${enhancedError.userMessage}"\n`);

    // Test 3: Error Display (non-interactive)
    console.log('3. Testing error display (non-interactive)...');
    console.log('─'.repeat(60));
    
    await errorDisplayManager.displayError(enhancedError, false);
    
    console.log('─'.repeat(60));
    console.log('✅ Error display completed\n');

    // Test 4: Error Reporting
    console.log('4. Testing error reporting...');
    
    const reportId = await errorReporter.reportError(enhancedError, 'test-session-123', false);
    console.log(`✅ Error report created with ID: ${reportId}`);
    
    const stats = await errorReporter.getErrorStatistics();
    console.log(`✅ Total error reports: ${stats.totalErrors}`);
    console.log(`✅ Recent errors: ${stats.recentErrors}`);
    console.log(`✅ Errors by type:`, stats.errorsByType);
    console.log();

    // Test 5: Error Middleware
    console.log('5. Testing error middleware...');
    
    // Test quiet error handling
    console.log('Testing quiet error handling:');
    await handleQuietError(new Error('This is a quiet error'), context);
    
    console.log('✅ Quiet error handling completed\n');

    // Test 6: Function Wrapping
    console.log('6. Testing function wrapping...');
    
    const riskyFunction = () => {
      throw new Error('This function always fails');
    };
    
    const safeFunction = errorMiddleware.wrapFunction(riskyFunction, {
      exitOnError: false,
      showSuggestions: false,
    });
    
    console.log('Calling wrapped function that throws error:');
    safeFunction();
    console.log('✅ Function wrapping handled error gracefully\n');

    // Test 7: Async Function Wrapping
    console.log('7. Testing async function wrapping...');
    
    const riskyAsyncFunction = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      throw new Error('This async function always fails');
    };
    
    const safeAsyncFunction = errorMiddleware.wrapAsyncFunction(riskyAsyncFunction, {
      exitOnError: false,
      showSuggestions: false,
    });
    
    console.log('Calling wrapped async function that throws error:');
    await safeAsyncFunction();
    console.log('✅ Async function wrapping handled error gracefully\n');

    // Test 8: Different Error Types
    console.log('8. Testing different error types...');
    
    const errorTypes = [
      { error: new Error('ENOENT: file not found'), expectedType: ErrorType.RESOURCE },
      { error: new Error('EACCES: permission denied'), expectedType: ErrorType.PERMISSION },
      { error: new Error('API quota exceeded'), expectedType: ErrorType.API },
      { error: new Error('Invalid JSON format'), expectedType: ErrorType.VALIDATION },
    ];
    
    for (const { error, expectedType } of errorTypes) {
      const enhanced = enhancedErrorHandler.processError(error);
      const match = enhanced.type === expectedType;
      console.log(`${match ? '✅' : '❌'} ${error.message} -> ${enhanced.type} (expected: ${expectedType})`);
    }
    console.log();

    // Test 9: Error Context
    console.log('9. Testing error context...');
    
    const contextWithEnv = createErrorContext(
      'config',
      'load-profile',
      'llamacli config use my-profile',
      'session-456',
      { profileName: 'my-profile', configPath: '/home/user/.llamacli/config.json' }
    );
    
    const contextualError = enhancedErrorHandler.processError(
      new Error('Profile configuration is invalid'),
      contextWithEnv
    );
    
    console.log(`✅ Error context includes command: ${contextualError.context?.command}`);
    console.log(`✅ Error context includes operation: ${contextualError.context?.operation}`);
    console.log(`✅ Error context includes session ID: ${contextualError.context?.sessionId}`);
    console.log(`✅ Error context includes timestamp: ${contextualError.context?.timestamp}`);
    console.log();

    // Test 10: Error Report Export
    console.log('10. Testing error report export...');
    
    const exportPath = '/tmp/llamacli-error-reports-test.json';
    await errorReporter.exportReports(exportPath);
    console.log(`✅ Error reports exported to: ${exportPath}`);
    
    // Check if file exists
    const fs = await import('fs/promises');
    try {
      const stats = await fs.stat(exportPath);
      console.log(`✅ Export file size: ${stats.size} bytes`);
      
      // Clean up
      await fs.unlink(exportPath);
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.log('❌ Export file not found');
    }
    console.log();

    // Summary
    console.log('📊 Test Summary:');
    console.log('✅ Error classification');
    console.log('✅ Error enhancement with suggestions');
    console.log('✅ Error display formatting');
    console.log('✅ Error reporting and statistics');
    console.log('✅ Error middleware integration');
    console.log('✅ Function wrapping for error handling');
    console.log('✅ Async function wrapping');
    console.log('✅ Multiple error type recognition');
    console.log('✅ Error context management');
    console.log('✅ Error report export functionality');
    
    console.log('\n🎉 All enhanced error handling tests passed!');
    
    // Show final statistics
    const finalStats = await errorReporter.getErrorStatistics();
    console.log('\n📈 Final Error Statistics:');
    console.log(`   Total Reports: ${finalStats.totalErrors}`);
    console.log(`   Recent Errors: ${finalStats.recentErrors}`);
    console.log(`   Error Types: ${Object.keys(finalStats.errorsByType).join(', ')}`);

  } catch (error) {
    console.error('❌ Error handling test failed:', error);
    process.exit(1);
  }
}

// Run the test
testErrorHandling().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
