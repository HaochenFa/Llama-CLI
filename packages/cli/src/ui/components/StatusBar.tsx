/**
 * Status bar component
 */

import React from "react";
import { Box, Text } from "ink";

export interface StatusBarProps {
  status: string;
  isLoading?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, isLoading = false }) => {
  const [dots, setDots] = React.useState("");

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

  return (
    <Box paddingX={1} paddingY={0}>
      <Text dimColor>
        {status}
        {isLoading && dots}
      </Text>
    </Box>
  );
};
