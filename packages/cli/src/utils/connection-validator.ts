/**
 * Connection validator for LLM services
 */

import { LLMProfile } from "@llamacli/core";
import { createAdapter } from "./adapter-factory.js";

export interface ValidationResult {
  success: boolean;
  error?: string;
  details?: string;
}

export interface InitializationStep {
  name: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
  message?: string;
  error?: string;
}

export class ConnectionValidator {
  /**
   * Validate LLM connection
   */
  static async validateLLMConnection(profile: LLMProfile, config: any): Promise<ValidationResult> {
    try {
      const adapter = await createAdapter(profile, config);
      
      // Try to connect
      await adapter.connect();
      
      // Test with a simple ping message
      const testMessages = [{
        id: 'test',
        role: 'user' as const,
        content: 'ping',
        timestamp: Date.now()
      }];

      // Set a timeout for the test
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      const testPromise = (async () => {
        let hasResponse = false;
        for await (const chunk of adapter.chatStream(testMessages)) {
          if (chunk.type === "content" || chunk.type === "done") {
            hasResponse = true;
            break;
          } else if (chunk.type === "error") {
            throw new Error(chunk.error || "Connection test failed");
          }
        }
        return hasResponse;
      })();

      await Promise.race([testPromise, timeoutPromise]);
      
      await adapter.disconnect();
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide specific error messages based on common issues
      let details = '';
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Connection timeout')) {
        details = 'Service appears to be offline. Please check if the service is running.';
      } else if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
        details = 'Authentication failed. Please check your API key or credentials.';
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        details = 'Model or endpoint not found. Please check your configuration.';
      }
      
      return {
        success: false,
        error: errorMessage,
        details
      };
    }
  }

  /**
   * Validate configuration
   */
  static async validateConfiguration(config: any): Promise<ValidationResult> {
    try {
      if (!config) {
        return {
          success: false,
          error: 'Configuration not found',
          details: 'Please run "llamacli config" to set up your configuration.'
        };
      }

      const profiles = config.getAllProfiles();
      if (profiles.length === 0) {
        return {
          success: false,
          error: 'No profiles configured',
          details: 'Please run "llamacli config" to create a profile.'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check working directory
   */
  static async validateWorkingDirectory(directory: string): Promise<ValidationResult> {
    try {
      const fs = await import('fs/promises');
      await fs.access(directory);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Working directory not accessible',
        details: `Cannot access directory: ${directory}`
      };
    }
  }

  /**
   * Run all initialization checks
   */
  static async runInitializationChecks(
    profile: LLMProfile, 
    config: any, 
    workingDirectory: string,
    onProgress?: (step: InitializationStep) => void
  ): Promise<InitializationStep[]> {
    const steps: InitializationStep[] = [
      { name: 'Loading configuration', status: 'pending' },
      { name: 'Validating working directory', status: 'pending' },
      { name: 'Connecting to LLM', status: 'pending' },
      { name: 'Ready to chat', status: 'pending' }
    ];

    // Step 1: Configuration
    onProgress?.({ ...steps[0], status: 'loading' });
    const configResult = await this.validateConfiguration(config);
    steps[0] = {
      ...steps[0],
      status: configResult.success ? 'complete' : 'error',
      message: configResult.success ? 'Configuration loaded' : configResult.error,
      error: configResult.error
    };
    onProgress?.(steps[0]);

    if (!configResult.success) {
      return steps;
    }

    // Step 2: Working directory
    onProgress?.({ ...steps[1], status: 'loading' });
    const dirResult = await this.validateWorkingDirectory(workingDirectory);
    steps[1] = {
      ...steps[1],
      status: dirResult.success ? 'complete' : 'error',
      message: dirResult.success ? 'Working directory accessible' : dirResult.error,
      error: dirResult.error
    };
    onProgress?.(steps[1]);

    // Step 3: LLM Connection
    onProgress?.({ ...steps[2], status: 'loading' });
    const llmResult = await this.validateLLMConnection(profile, config);
    steps[2] = {
      ...steps[2],
      status: llmResult.success ? 'complete' : 'error',
      message: llmResult.success ? 'LLM connection established' : llmResult.error,
      error: llmResult.error
    };
    onProgress?.(steps[2]);

    // Step 4: Ready
    if (steps.slice(0, 3).every(step => step.status === 'complete')) {
      steps[3] = {
        ...steps[3],
        status: 'complete',
        message: 'All systems ready'
      };
      onProgress?.(steps[3]);
    }

    return steps;
  }
}
