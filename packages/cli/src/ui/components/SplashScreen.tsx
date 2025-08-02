/**
 * Splash Screen component for LlamaCLI
 * Displays welcome screen with logo, tips, and initialization status using Ink
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, Static } from 'ink';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';
import { Header } from './Header.js';
import { Tips } from './Tips.js';
import { themeManager } from '../theme-manager.js';
import { ConnectionValidator, InitializationStep } from '../../utils/connection-validator.js';

interface SplashScreenProps {
  version: string;
  terminalWidth: number;
  profile?: {
    name: string;
    model: string;
  };
  workingDirectory: string;
  config?: any;
  onComplete?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  showInitializationSteps?: boolean;
}

// Use InitializationStep from connection-validator

export const SplashScreen: React.FC<SplashScreenProps> = ({
  version,
  terminalWidth,
  profile,
  workingDirectory,
  config,
  onComplete,
  autoHide = false,
  autoHideDelay = 3000,
  showInitializationSteps = false
}) => {
  const theme = themeManager.getCurrentTheme();
  const [initSteps, setInitSteps] = useState<InitializationStep[]>([
    { name: 'Loading configuration', status: 'pending' },
    { name: 'Validating working directory', status: 'pending' },
    { name: 'Connecting to LLM', status: 'pending' },
    { name: 'Ready to chat', status: 'pending' }
  ]);

  // Real initialization steps
  useEffect(() => {
    if (!showInitializationSteps || !profile || !config) return;

    const runInitSteps = async () => {
      try {
        // Convert profile to LLMProfile format if needed
        const llmProfile = profile as any; // Type assertion for now

        const steps = await ConnectionValidator.runInitializationChecks(
          llmProfile,
          config,
          workingDirectory,
          (step) => {
            setInitSteps(prev => prev.map(s =>
              s.name === step.name ? step : s
            ));
          }
        );

        setInitSteps(steps);

        // Auto-hide after completion if all steps succeeded
        const allSucceeded = steps.every(step => step.status === 'complete');
        if (autoHide && allSucceeded) {
          setTimeout(() => {
            onComplete?.();
          }, autoHideDelay);
        } else if (!allSucceeded) {
          // If there are errors, don't auto-hide, let user see the errors
          console.log("Initialization completed with errors. Please check the status above.");
        }
      } catch (error) {
        console.error("Initialization failed:", error);
        setInitSteps(prev => prev.map(step => ({
          ...step,
          status: 'error' as const,
          error: error instanceof Error ? error.message : String(error)
        })));
      }
    };

    runInitSteps();
  }, [showInitializationSteps, profile, config, workingDirectory, autoHide, autoHideDelay, onComplete]);

  // Auto-hide without initialization steps
  useEffect(() => {
    if (autoHide && !showInitializationSteps) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, showInitializationSteps, autoHideDelay, onComplete]);

  const getStatusIcon = (status: InitializationStep['status']): React.ReactNode => {
    switch (status) {
      case 'pending': return <Text>⏳</Text>;
      case 'loading': return <Spinner type="dots" />;
      case 'complete': return <Text>✅</Text>;
      case 'error': return <Text>❌</Text>;
      default: return <Text>⏳</Text>;
    }
  };

  const getStatusColor = (status: InitializationStep['status']): string => {
    switch (status) {
      case 'pending': return theme.colors.muted;
      case 'loading': return theme.colors.warning;
      case 'complete': return theme.colors.success;
      case 'error': return theme.colors.error;
      default: return theme.colors.muted;
    }
  };

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header with Logo */}
      <Header
        version={version}
        terminalWidth={terminalWidth}
        profile={profile}
        showVersion={true}
      />

      {/* Welcome Message */}
      <Box justifyContent="center" marginTop={1} marginBottom={1}>
        <Gradient colors={['#89B4FA', '#CBA6F7', '#89DCEB']}>
          <Text bold>Welcome to your AI-powered development partner!</Text>
        </Gradient>
      </Box>

      {/* Initialization Steps */}
      {showInitializationSteps && (
        <Box flexDirection="column" marginTop={1} marginBottom={2}>
          <Gradient colors={['#89DCEB', '#A6E3A1']}>
            <Text bold>🚀 Initializing...</Text>
          </Gradient>
          {initSteps.map((step, index) => (
            <Box key={index} marginLeft={2}>
              <Box>
                {getStatusIcon(step.status)}
                <Text color={getStatusColor(step.status)}>
                  {' '}{step.name}
                </Text>
              </Box>
              {step.message && (
                <Text color={theme.colors.muted}>
                  {' '}- {step.message}
                </Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Tips Section */}
      <Tips 
        showAdvancedTips={false}
        workingDirectory={workingDirectory}
      />

      {/* Bottom Instructions */}
      <Box justifyContent="center" marginTop={2}>
        <Text color={theme.colors.muted}>
          {autoHide ? 'Starting in a moment...' : 'Press any key to continue'}
        </Text>
      </Box>
    </Box>
  );
};
