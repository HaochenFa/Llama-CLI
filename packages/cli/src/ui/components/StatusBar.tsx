/**
 * Enhanced status bar component using Ink
 */

import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { themeManager } from "../theme-manager.js";

export interface StatusBarProps {
  status: string;
  isLoading?: boolean;
  showProgress?: boolean;
  elapsedTime?: number;
  rightContent?: React.ReactNode;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status,
  isLoading = false,
  showProgress = false,
  elapsedTime = 0,
  rightContent
}) => {
  const [dots, setDots] = React.useState("");
  const theme = themeManager.getCurrentTheme();

  // Loading animation
  React.useEffect(() => {
    if (!isLoading) {
      setDots("");
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Box justifyContent="space-between" paddingX={1} paddingY={0}>
      <Box>
        {isLoading && (
          <Text color={theme.colors.warning}>
            <Spinner type="dots" /> {' '}
          </Text>
        )}
        <Text color={isLoading ? theme.colors.warning : theme.colors.success}>
          {status}
        </Text>
        {showProgress && isLoading && elapsedTime > 0 && (
          <Text color={theme.colors.muted}>
            {' '}({formatTime(elapsedTime)} - ESC to cancel)
          </Text>
        )}
      </Box>

      {rightContent && (
        <Box>
          {rightContent}
        </Box>
      )}
    </Box>
  );
};
