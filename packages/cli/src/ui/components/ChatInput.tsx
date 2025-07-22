/**
 * Chat input component
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type your message...",
}) => {
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blink cursor effect
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useInput((input: string, key: any) => {
    if (disabled) return;

    if (key.return) {
      if (value.trim()) {
        onSubmit(value);
      }
      return;
    }

    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      onChange(value + input);
    }
  });

  const displayValue = value || (disabled ? "" : placeholder);
  const showCursor = !disabled && cursorVisible;

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text dimColor={!value && !disabled}>
        {displayValue}
        {showCursor && <Text backgroundColor="white" color="black"> </Text>}
      </Text>
    </Box>
  );
};
