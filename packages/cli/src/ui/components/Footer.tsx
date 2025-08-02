/**
 * Footer component for LlamaCLI
 * Displays status information, working directory, and context info
 */

import React from 'react';
import { Box, Text } from 'ink';
import { themeManager } from '../theme-manager.js';

interface FooterProps {
  model: string;
  workingDirectory: string;
  gitBranch?: string;
  tokenCount?: number;
  maxTokens?: number;
  debugMode?: boolean;
  debugMessage?: string;
  showMemoryUsage?: boolean;
  memoryUsage?: number;
  sessionTurns?: number;
  maxSessionTurns?: number;
}

export const Footer: React.FC<FooterProps> = ({
  model,
  workingDirectory,
  gitBranch,
  tokenCount = 0,
  maxTokens = 4096,
  debugMode = false,
  debugMessage,
  showMemoryUsage = false,
  memoryUsage,
  sessionTurns = 0,
  maxSessionTurns = 50
}) => {
  const theme = themeManager.getCurrentTheme();
  
  // Calculate token usage percentage
  const tokenPercentage = maxTokens > 0 ? Math.round((tokenCount / maxTokens) * 100) : 0;
  const tokenColor = tokenPercentage > 80 ? theme.colors.warning : 
                   tokenPercentage > 95 ? theme.colors.error : theme.colors.info;

  // Shorten working directory path
  const shortenPath = (path: string, maxLength: number = 50): string => {
    if (path.length <= maxLength) return path;
    
    const parts = path.split('/');
    if (parts.length <= 2) return path;
    
    // Show first and last parts with ... in between
    const first = parts[0] || '/';
    const last = parts[parts.length - 1];
    return `${first}/.../${last}`;
  };

  return (
    <Box 
      justifyContent="space-between" 
      width="100%" 
      borderStyle="single" 
      borderColor={theme.colors.border}
      paddingX={1}
    >
      {/* Left side - Directory and Git info */}
      <Box>
        <Text color={theme.colors.info}>
          📁 {shortenPath(workingDirectory)}
        </Text>
        {gitBranch && (
          <Text color={theme.colors.muted}>
            {' '}({gitBranch})
          </Text>
        )}
        {debugMode && (
          <Text color={theme.colors.error}>
            {' '}[DEBUG{debugMessage ? `: ${debugMessage}` : ''}]
          </Text>
        )}
      </Box>

      {/* Right side - Model and usage info */}
      <Box>
        {showMemoryUsage && memoryUsage && (
          <Text color={theme.colors.muted}>
            {Math.round(memoryUsage)}MB{' '}
          </Text>
        )}
        
        <Text color={theme.colors.success}>
          {model}
        </Text>
        
        <Text color={tokenColor}>
          {' '}({tokenPercentage}% context)
        </Text>
        
        {sessionTurns > 0 && (
          <Text color={theme.colors.muted}>
            {' '}• {sessionTurns}/{maxSessionTurns} turns
          </Text>
        )}
      </Box>
    </Box>
  );
};
