/**
 * Main chat interface component
 */

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { ChatHistory } from "./ChatHistory.js";
import { ChatInput } from "./ChatInput.js";
import { StatusBar } from "./StatusBar.js";
import { getErrorMessage } from "../../utils/error-utils.js";

export interface ChatInterfaceProps {
  agenticLoop: any;
  context: any;
  profile: any;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  agenticLoop, 
  context, 
  profile 
}) => {
  const [messages, setMessages] = useState(context.chatHistory || []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(`Connected to ${profile.name}`);
  const { exit } = useApp();

  // Handle user input
  const handleSubmit = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      setInput("");
      setIsLoading(true);
      setStatus("Thinking...");

      try {
        // Add user message
        const userMessage = {
          id: Date.now().toString(),
          role: "user" as const,
          content: message,
          timestamp: Date.now(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);

        // Get response from agentic loop
        const response = await agenticLoop.processUserInput(message, context);

        // Add assistant response
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: response,
          timestamp: Date.now(),
        };

        setMessages([...newMessages, assistantMessage]);
        setStatus(`Connected to ${profile.name}`);
      } catch (error) {
        setStatus(`Error: ${getErrorMessage(error)}`);
      } finally {
        setIsLoading(false);
      }
    },
    [agenticLoop, context, profile, isLoading, messages]
  );

  // Handle keyboard shortcuts
  useInput((input: string, key: any) => {
    if (key.ctrl && input === "c") {
      exit();
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" paddingX={1}>
        <Text bold color="blue">
          🦙 LlamaCLI
        </Text>
        <Text> - {profile.name} ({profile.model})</Text>
      </Box>

      {/* Chat History */}
      <Box flexGrow={1} flexDirection="column" paddingX={1}>
        <ChatHistory messages={messages} />
      </Box>

      {/* Status and Input */}
      <Box flexDirection="column">
        <StatusBar status={status} isLoading={isLoading} />
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isLoading}
          placeholder="Type your message... (Ctrl+C to exit)"
        />
      </Box>
    </Box>
  );
};
