/**
 * Tips component for LlamaCLI
 * Displays helpful tips and getting started information
 */

import React from 'react';
import { Box, Text } from 'ink';
import { themeManager } from '../theme-manager.js';

interface TipsProps {
  showAdvancedTips?: boolean;
  workingDirectory?: string;
}

export const Tips: React.FC<TipsProps> = ({ 
  showAdvancedTips = false,
  workingDirectory 
}) => {
  const theme = themeManager.getCurrentTheme();

  const basicTips = [
    "Ask questions, request code analysis, or get development help",
    "Use @path/to/file to reference specific files in your project",
    "Type /help to see all available slash commands",
    "Press Ctrl+C twice to exit"
  ];

  const advancedTips = [
    "Use /theme to change the visual appearance",
    "Use /config to manage your LLM profiles and settings", 
    "Use /session to manage chat history and context",
    "File references (@file.js) are automatically included in context"
  ];

  const tipsToShow = showAdvancedTips ? [...basicTips, ...advancedTips] : basicTips;

  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      <Text bold color={theme.colors.success}>
        💡 Tips for getting started:
      </Text>
      
      {tipsToShow.map((tip, index) => (
        <Box key={index} marginTop={0}>
          <Text color={theme.colors.muted}>
            {index + 1}.{' '}
          </Text>
          <Text color={theme.colors.foreground}>
            {tip}
          </Text>
        </Box>
      ))}
      
      {workingDirectory && (
        <Box marginTop={1}>
          <Text color={theme.colors.info}>
            📁 Working in:{' '}
          </Text>
          <Text color={theme.colors.accent}>
            {workingDirectory}
          </Text>
        </Box>
      )}
    </Box>
  );
};
