/**
 * Chat history component
 */

import React from "react";
import { Box, Text } from "ink";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
}

export interface ChatHistoryProps {
  messages: Message[];
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <Box paddingY={1}>
        <Text dimColor>No messages yet. Start a conversation!</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {messages.map((message) => (
        <Box key={message.id} marginBottom={1}>
          <Box flexDirection="column">
            <Box>
              <Text bold color={message.role === "user" ? "green" : "blue"}>
                {message.role === "user" ? "You" : "Assistant"}:
              </Text>
            </Box>
            <Box paddingLeft={2}>
              <Text>{message.content}</Text>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};
