/**
 * Main chat interface component
 */

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { ChatHistory } from "./ChatHistory.js";
import { ChatInput } from "./ChatInput.js";
import { StatusBar } from "./StatusBar.js";
import {
  ToolConfirmationDialog,
  ShellConfirmationDialog,
  FileConfirmationDialog,
  ToolConfirmationRequest,
  ShellConfirmationRequest,
  FileConfirmationRequest,
  ToolConfirmationOutcome
} from "./ToolConfirmationDialog.js";
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
  const [toolConfirmation, setToolConfirmation] = useState<ToolConfirmationRequest | null>(null);
  const [shellConfirmation, setShellConfirmation] = useState<ShellConfirmationRequest | null>(null);
  const [fileConfirmation, setFileConfirmation] = useState<FileConfirmationRequest | null>(null);
  const [sessionAllowlist, setSessionAllowlist] = useState<Set<string>>(new Set());
  const { exit } = useApp();

  // Tool confirmation handlers
  const createToolConfirmationHandler = useCallback((toolName: string, description: string, parameters: Record<string, any>) => {
    return new Promise<boolean>((resolve) => {
      const request: ToolConfirmationRequest = {
        toolName,
        description,
        parameters,
        onConfirm: (outcome: ToolConfirmationOutcome) => {
          setToolConfirmation(null);

          if (outcome === ToolConfirmationOutcome.ProceedAlways) {
            setSessionAllowlist(prev => new Set([...prev, toolName]));
          }

          resolve(outcome !== ToolConfirmationOutcome.Cancel);
        }
      };

      setToolConfirmation(request);
    });
  }, []);

  const createShellConfirmationHandler = useCallback((command: string, workingDirectory?: string) => {
    return new Promise<boolean>((resolve) => {
      const request: ShellConfirmationRequest = {
        command,
        workingDirectory,
        onConfirm: (outcome: ToolConfirmationOutcome) => {
          setShellConfirmation(null);

          if (outcome === ToolConfirmationOutcome.ProceedAlways) {
            setSessionAllowlist(prev => new Set([...prev, `shell:${command}`]));
          }

          resolve(outcome !== ToolConfirmationOutcome.Cancel);
        }
      };

      setShellConfirmation(request);
    });
  }, []);

  const createFileConfirmationHandler = useCallback((operation: 'write' | 'modify' | 'delete', filePath: string, content?: string) => {
    return new Promise<boolean>((resolve) => {
      const request: FileConfirmationRequest = {
        operation,
        filePath,
        content,
        onConfirm: (outcome: ToolConfirmationOutcome) => {
          setFileConfirmation(null);

          if (outcome === ToolConfirmationOutcome.ProceedAlways) {
            setSessionAllowlist(prev => new Set([...prev, `file:${operation}:${filePath}`]));
          }

          resolve(outcome !== ToolConfirmationOutcome.Cancel);
        }
      };

      setFileConfirmation(request);
    });
  }, []);

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

      {/* Tool Confirmation Dialogs */}
      {toolConfirmation && (
        <ToolConfirmationDialog
          request={toolConfirmation}
          isFocused={!shellConfirmation && !fileConfirmation}
        />
      )}

      {shellConfirmation && (
        <ShellConfirmationDialog
          request={shellConfirmation}
          isFocused={!fileConfirmation}
        />
      )}

      {fileConfirmation && (
        <FileConfirmationDialog
          request={fileConfirmation}
          isFocused={true}
        />
      )}

      {/* Status and Input */}
      <Box flexDirection="column">
        <StatusBar status={status} isLoading={isLoading} />
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isLoading || !!toolConfirmation || !!shellConfirmation || !!fileConfirmation}
          placeholder="Type your message... (Ctrl+C to exit)"
        />
      </Box>
    </Box>
  );
};
