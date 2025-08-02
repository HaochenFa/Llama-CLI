/**
 * App wrapper with splash screen functionality
 */

import React, { useState, useEffect } from 'react';
import { Box } from 'ink';
import { SplashScreen } from './SplashScreen.js';
import { ChatInterface } from './ChatInterface.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface AppWithSplashProps {
  agenticLoop: any;
  context: any;
  profile: any;
  config?: any;
  showSplash?: boolean;
  splashDuration?: number;
}

export const AppWithSplash: React.FC<AppWithSplashProps> = ({
  agenticLoop,
  context,
  profile,
  config,
  showSplash = true,
  splashDuration = 3000
}) => {
  const [showingSplash, setShowingSplash] = useState(showSplash);
  const { width: terminalWidth } = useTerminalSize();

  const handleSplashComplete = () => {
    setShowingSplash(false);
  };

  // Skip splash screen if disabled
  useEffect(() => {
    if (!showSplash) {
      setShowingSplash(false);
    }
  }, [showSplash]);

  if (showingSplash) {
    return (
      <SplashScreen
        version="1.0.0"
        terminalWidth={terminalWidth}
        profile={profile}
        config={config}
        workingDirectory={process.cwd()}
        onComplete={handleSplashComplete}
        autoHide={true}
        autoHideDelay={splashDuration}
        showInitializationSteps={true}
      />
    );
  }

  return (
    <ChatInterface
      agenticLoop={agenticLoop}
      context={context}
      profile={profile}
    />
  );
};
