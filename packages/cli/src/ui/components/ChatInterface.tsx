/**
 * Main chat interface component
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { ChatHistory } from "./ChatHistory.js";
import { ChatInput } from "./ChatInput.js";
import { EnhancedChatInput } from "./EnhancedChatInput.js";
import { StatusBar } from "./StatusBar.js";
import { Header } from "./Header.js";
import { Footer } from "./Footer.js";
import { ThemeSelector } from "./ThemeSelector.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
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
  const [startTime] = useState(Date.now());
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [ctrlDCount, setCtrlDCount] = useState(0);
  const [ctrlDTimeout, setCtrlDTimeout] = useState<NodeJS.Timeout | null>(null);
  const { exit } = useApp();
  const { width: terminalWidth, height: terminalHeight } = useTerminalSize();

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

  // Calculate token count (simple estimation) - memoized
  const tokenCount = useMemo(() => {
    return Math.round(messages.reduce((count: number, msg: any) => count + (msg.content?.length || 0), 0) / 4);
  }, [messages]);

  // Memoized elapsed time calculation
  const elapsedTime = useMemo(() => {
    return Math.floor((Date.now() - startTime) / 1000);
  }, [startTime]);

  // Memoized session turns calculation
  const sessionTurns = useMemo(() => {
    return messages.filter((m: any) => m.role === 'user').length;
  }, [messages]);

  // Handle theme selection
  const handleThemeSelect = useCallback((themeName: string) => {
    // Here you would implement theme switching logic
    console.log(`Selected theme: ${themeName}`);
    setShowThemeSelector(false);
  }, []);

  // Handle keyboard shortcuts and exit logic
  useInput((input, key) => {
    if (key.ctrl && input === 't') {
      setShowThemeSelector(true);
    }
    if (key.escape) {
      setShowThemeSelector(false);
    }

    // Handle Ctrl+D double-press exit
    if (key.ctrl && (key as any).name === 'd') {
      if (ctrlDTimeout) {
        clearTimeout(ctrlDTimeout);
        setCtrlDTimeout(null);
      }

      const newCount = ctrlDCount + 1;
      setCtrlDCount(newCount);

      if (newCount === 1) {
        setStatus("Press Ctrl+D again to exit");
        const timeout = setTimeout(() => {
          setCtrlDCount(0);
          setStatus(`Connected to ${profile.name}`);
        }, 2000);
        setCtrlDTimeout(timeout);
      } else if (newCount >= 2) {
        console.log("\nGoodbye! 👋");
        exit();
      }
    }
  });

  // Generate suggestions based on input
  useEffect(() => {
    if (input.startsWith('@')) {
      setSuggestions(['@package.json', '@src/index.ts', '@README.md']);
    } else if (input.startsWith('/')) {
      setSuggestions(['/help', '/theme', '/config', '/session']);
    } else {
      setSuggestions([]);
    }
  }, [input]);

  return (
    <Box flexDirection="column" height="100%">
      {/* Enhanced Header */}
      <Header
        version="1.0.0"
        terminalWidth={terminalWidth}
        profile={profile}
        showVersion={false}
      />

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

      {/* Theme Selector */}
      {showThemeSelector && (
        <ThemeSelector
          onSelect={handleThemeSelect}
          onCancel={() => setShowThemeSelector(false)}
        />
      )}

      {/* Status and Input */}
      {!showThemeSelector && (
        <Box flexDirection="column">
          <StatusBar
            status={status}
            isLoading={isLoading}
            showProgress={true}
            elapsedTime={elapsedTime}
          />
          <EnhancedChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isLoading || !!toolConfirmation || !!shellConfirmation || !!fileConfirmation}
            placeholder="Type your message... (Ctrl+T for themes)"
            showSuggestions={suggestions.length > 0}
            suggestions={suggestions}
          />
        </Box>
      )}

      {/* Enhanced Footer */}
      <Footer
        model={profile.model}
        workingDirectory={process.cwd()}
        tokenCount={tokenCount}
        maxTokens={4096}
        sessionTurns={sessionTurns}
        maxSessionTurns={50}
      />
    </Box>
  );
};
