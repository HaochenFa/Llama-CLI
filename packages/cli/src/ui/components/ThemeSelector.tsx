/**
 * Theme Selector component using Ink
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Gradient from 'ink-gradient';
import { themeManager } from '../theme-manager.js';

interface ThemeSelectorProps {
  onSelect: (themeName: string) => void;
  onCancel: () => void;
}

interface ThemeItem {
  label: string;
  value: string;
  preview: React.ReactNode;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  onSelect,
  onCancel
}) => {
  const currentTheme = themeManager.getCurrentTheme();
  const availableThemes = themeManager.getAvailableThemes();

  const themeItems: ThemeItem[] = availableThemes.map(theme => ({
    label: theme.name,
    value: theme.name.toLowerCase(),
    preview: (
      <Box>
        <Text color={theme.colors.primary}>●</Text>
        <Text color={theme.colors.success}> ●</Text>
        <Text color={theme.colors.warning}> ●</Text>
        <Text color={theme.colors.error}> ●</Text>
        <Text color={theme.colors.info}> ●</Text>
      </Box>
    )
  }));

  const handleSelect = (item: { label: React.ReactNode; value: string }) => {
    onSelect(item.value);
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Gradient colors={['#89B4FA', '#CBA6F7']}>
          <Text bold>🎨 Choose a Theme</Text>
        </Gradient>
      </Box>

      {/* Current Theme */}
      <Box marginBottom={1}>
        <Text color={currentTheme.colors.muted}>
          Current: {currentTheme.name || 'Default'}
        </Text>
      </Box>

      {/* Theme List */}
      <SelectInput
        items={themeItems.map(item => ({
          label: `${item.label} ●●●●●`,
          value: item.value
        }))}
        onSelect={handleSelect}
      />

      {/* Instructions */}
      <Box marginTop={1}>
        <Text color={currentTheme.colors.muted}>
          ↑↓ Navigate • Enter to select • Esc to cancel
        </Text>
      </Box>
    </Box>
  );
};
