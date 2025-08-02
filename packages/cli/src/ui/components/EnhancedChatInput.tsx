/**
 * Enhanced Chat Input component using Ink
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Gradient from 'ink-gradient';
import { themeManager } from '../theme-manager.js';

interface EnhancedChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showSuggestions?: boolean;
  suggestions?: string[];
}

export const EnhancedChatInput: React.FC<EnhancedChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type your message...",
  showSuggestions = false,
  suggestions = []
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const theme = themeManager.getCurrentTheme();

  const handleSubmit = useCallback((submittedValue: string) => {
    if (submittedValue.trim()) {
      onSubmit(submittedValue);
    }
  }, [onSubmit]);

  return (
    <Box flexDirection="column">
      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.muted}>💡 Suggestions:</Text>
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <Box key={index} marginLeft={2}>
              <Text color={theme.colors.info}>• {suggestion}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Input Box */}
      <Box 
        borderStyle="single" 
        borderColor={isFocused ? theme.colors.primary : theme.colors.border}
        paddingX={1}
      >
        <Box>
          <Gradient colors={['#89B4FA', '#CBA6F7']}>
            <Text>❯ </Text>
          </Gradient>
          <TextInput
            value={value}
            onChange={onChange}
            onSubmit={handleSubmit}
            placeholder={placeholder}
            focus={!disabled}
            showCursor={!disabled}
          />
        </Box>
      </Box>

      {/* Help Text */}
      <Box marginTop={1}>
        <Text color={theme.colors.muted}>
          💡 Use @file.js to reference files • /help for commands • Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  );
};
