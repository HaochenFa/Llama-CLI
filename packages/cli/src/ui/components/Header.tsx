/**
 * Header component for LlamaCLI
 * Displays logo, version, and profile information using Ink
 */

import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { shortLlamaLogo, longLlamaLogo, llamaEmoji, getAsciiArtWidth } from './AsciiArt.js';
import { themeManager } from '../theme-manager.js';

interface HeaderProps {
  version: string;
  terminalWidth: number;
  profile?: {
    name: string;
    model: string;
  };
  showVersion?: boolean;
  customAsciiArt?: string;
}

export const Header: React.FC<HeaderProps> = ({
  version,
  terminalWidth,
  profile,
  showVersion = true,
  customAsciiArt
}) => {
  const theme = themeManager.getCurrentTheme();
  
  // Choose appropriate logo based on terminal width
  let displayLogo: string;
  const longLogoWidth = getAsciiArtWidth(longLlamaLogo);
  const shortLogoWidth = getAsciiArtWidth(shortLlamaLogo);
  
  if (customAsciiArt) {
    displayLogo = customAsciiArt;
  } else if (terminalWidth >= longLogoWidth + 10) {
    displayLogo = longLlamaLogo;
  } else if (terminalWidth >= shortLogoWidth + 10) {
    displayLogo = shortLlamaLogo;
  } else {
    displayLogo = llamaEmoji;
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Logo with Gradient */}
      <Box justifyContent="center">
        <Gradient colors={['#4796E4', '#847ACE', '#C3677F']}>
          <Text>{displayLogo}</Text>
        </Gradient>
      </Box>

      {/* Title and Version */}
      <Box justifyContent="center" marginTop={1}>
        <Gradient colors={['#89B4FA', '#CBA6F7']}>
          <Text bold>🦙 LlamaCLI</Text>
        </Gradient>
        {showVersion && (
          <Text color={theme.colors.muted}>
            {' '}v{version}
          </Text>
        )}
      </Box>

      {/* Profile Information */}
      {profile && (
        <Box justifyContent="center" marginTop={1}>
          <Text color={theme.colors.info}>
            Connected to {profile.name}
          </Text>
          <Text color={theme.colors.muted}>
            {' '}({profile.model})
          </Text>
        </Box>
      )}
    </Box>
  );
};
