/**
 * Tool Confirmation Dialog for LlamaCLI
 * Provides user confirmation for tool execution with security options
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export enum ToolConfirmationOutcome {
  ProceedOnce = 'proceed_once',
  ProceedAlways = 'proceed_always',
  Cancel = 'cancel',
}

export interface ToolConfirmationRequest {
  toolName: string;
  description: string;
  parameters: Record<string, any>;
  onConfirm: (outcome: ToolConfirmationOutcome) => void;
}

export interface ToolConfirmationDialogProps {
  request: ToolConfirmationRequest;
  isFocused?: boolean;
}

export const ToolConfirmationDialog: React.FC<ToolConfirmationDialogProps> = ({
  request,
  isFocused = true,
}) => {
  const [selectedOption, setSelectedOption] = useState(0);
  const { toolName, description, parameters, onConfirm } = request;

  const options = [
    { label: 'Yes, allow once', value: ToolConfirmationOutcome.ProceedOnce },
    { label: 'Yes, allow always for this session', value: ToolConfirmationOutcome.ProceedAlways },
    { label: 'No (esc)', value: ToolConfirmationOutcome.Cancel },
  ];

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.upArrow) {
      setSelectedOption((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setSelectedOption((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      onConfirm(options[selectedOption].value);
    } else if (key.escape) {
      onConfirm(ToolConfirmationOutcome.Cancel);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      padding={1}
      marginY={1}
    >
      <Box marginBottom={1}>
        <Text color="yellow" bold>
          🔧 Tool Execution Request
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color="cyan" bold>Tool:</Text> {toolName}
        </Text>
        <Text>
          <Text color="cyan" bold>Description:</Text> {description}
        </Text>
      </Box>

      {Object.keys(parameters).length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="cyan" bold>Parameters:</Text>
          {Object.entries(parameters).map(([key, value]) => (
            <Text key={key}>
              <Text color="gray">  {key}:</Text> {JSON.stringify(value)}
            </Text>
          ))}
        </Box>
      )}

      <Box marginBottom={1}>
        <Text color="yellow">Do you want to proceed with this tool execution?</Text>
      </Box>

      <Box flexDirection="column">
        {options.map((option, index) => (
          <Box key={option.value}>
            <Text color={index === selectedOption ? 'green' : 'white'}>
              {index === selectedOption ? '▶ ' : '  '}
              {option.label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Use ↑/↓ to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
};

/**
 * Shell Command Confirmation Dialog
 * Specialized confirmation for shell command execution
 */
export interface ShellConfirmationRequest {
  command: string;
  workingDirectory?: string;
  onConfirm: (outcome: ToolConfirmationOutcome) => void;
}

export interface ShellConfirmationDialogProps {
  request: ShellConfirmationRequest;
  isFocused?: boolean;
}

export const ShellConfirmationDialog: React.FC<ShellConfirmationDialogProps> = ({
  request,
  isFocused = true,
}) => {
  const [selectedOption, setSelectedOption] = useState(0);
  const { command, workingDirectory, onConfirm } = request;

  const options = [
    { label: 'Yes, allow once', value: ToolConfirmationOutcome.ProceedOnce },
    { label: 'Yes, allow always for this session', value: ToolConfirmationOutcome.ProceedAlways },
    { label: 'No (esc)', value: ToolConfirmationOutcome.Cancel },
  ];

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.upArrow) {
      setSelectedOption((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setSelectedOption((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      onConfirm(options[selectedOption].value);
    } else if (key.escape) {
      onConfirm(ToolConfirmationOutcome.Cancel);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="red"
      padding={1}
      marginY={1}
    >
      <Box marginBottom={1}>
        <Text color="red" bold>
          ⚠️  Shell Command Execution
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>A tool wants to execute the following shell command:</Text>
        <Box
          borderStyle="single"
          borderColor="gray"
          padding={1}
          marginY={1}
        >
          <Text color="white" backgroundColor="black">
            {command}
          </Text>
        </Box>
        {workingDirectory && (
          <Text>
            <Text color="cyan">Working Directory:</Text> {workingDirectory}
          </Text>
        )}
      </Box>

      <Box marginBottom={1}>
        <Text color="red">Do you want to allow this command execution?</Text>
      </Box>

      <Box flexDirection="column">
        {options.map((option, index) => (
          <Box key={option.value}>
            <Text color={index === selectedOption ? 'green' : 'white'}>
              {index === selectedOption ? '▶ ' : '  '}
              {option.label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Use ↑/↓ to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
};

/**
 * File Operation Confirmation Dialog
 * Specialized confirmation for file write/modify operations
 */
export interface FileConfirmationRequest {
  operation: 'write' | 'modify' | 'delete';
  filePath: string;
  content?: string;
  onConfirm: (outcome: ToolConfirmationOutcome) => void;
}

export interface FileConfirmationDialogProps {
  request: FileConfirmationRequest;
  isFocused?: boolean;
}

export const FileConfirmationDialog: React.FC<FileConfirmationDialogProps> = ({
  request,
  isFocused = true,
}) => {
  const [selectedOption, setSelectedOption] = useState(0);
  const { operation, filePath, content, onConfirm } = request;

  const options = [
    { label: 'Yes, allow once', value: ToolConfirmationOutcome.ProceedOnce },
    { label: 'Yes, allow always for this session', value: ToolConfirmationOutcome.ProceedAlways },
    { label: 'No (esc)', value: ToolConfirmationOutcome.Cancel },
  ];

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.upArrow) {
      setSelectedOption((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setSelectedOption((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      onConfirm(options[selectedOption].value);
    } else if (key.escape) {
      onConfirm(ToolConfirmationOutcome.Cancel);
    }
  });

  const operationColor = operation === 'delete' ? 'red' : operation === 'modify' ? 'yellow' : 'blue';
  const operationIcon = operation === 'delete' ? '🗑️' : operation === 'modify' ? '✏️' : '📝';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={operationColor}
      padding={1}
      marginY={1}
    >
      <Box marginBottom={1}>
        <Text color={operationColor} bold>
          {operationIcon} File {operation.charAt(0).toUpperCase() + operation.slice(1)} Operation
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color="cyan" bold>File:</Text> {filePath}
        </Text>
        <Text>
          <Text color="cyan" bold>Operation:</Text> {operation}
        </Text>
        {content && content.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan" bold>Content Preview:</Text>
            <Box
              borderStyle="single"
              borderColor="gray"
              padding={1}
            >
              <Text>{content.substring(0, 200)}{content.length > 200 ? '...' : ''}</Text>
            </Box>
          </Box>
        )}
      </Box>

      <Box marginBottom={1}>
        <Text color={operationColor}>Do you want to allow this file operation?</Text>
      </Box>

      <Box flexDirection="column">
        {options.map((option, index) => (
          <Box key={option.value}>
            <Text color={index === selectedOption ? 'green' : 'white'}>
              {index === selectedOption ? '▶ ' : '  '}
              {option.label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Use ↑/↓ to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
};
