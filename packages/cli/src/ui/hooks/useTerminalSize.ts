/**
 * Hook for managing terminal size and responsive layout
 */

import { useState, useEffect } from 'react';

interface TerminalSize {
  width: number;
  height: number;
}

const DEFAULT_SIZE: TerminalSize = {
  width: 80,
  height: 24
};

export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>(() => ({
    width: process.stdout.columns || DEFAULT_SIZE.width,
    height: process.stdout.rows || DEFAULT_SIZE.height
  }));

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: process.stdout.columns || DEFAULT_SIZE.width,
        height: process.stdout.rows || DEFAULT_SIZE.height
      });
    };

    // Listen for terminal resize events
    process.stdout.on('resize', updateSize);

    // Cleanup listener on unmount
    return () => {
      process.stdout.off('resize', updateSize);
    };
  }, []);

  return size;
}

/**
 * Hook for responsive breakpoints based on terminal width
 */
export function useResponsiveBreakpoints() {
  const { width } = useTerminalSize();

  return {
    isSmall: width < 60,
    isMedium: width >= 60 && width < 100,
    isLarge: width >= 100,
    width
  };
}
