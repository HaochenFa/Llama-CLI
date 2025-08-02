/**
 * Shell Command Confirmation for LlamaCLI
 * Handles confirmation dialogs for dangerous shell commands
 */

import readline from 'readline';
import { themeManager } from '../theme-manager.js';

export interface ConfirmationOptions {
  command: string;
  reason: string;
  workingDirectory?: string;
}

export interface ConfirmationResult {
  allow: boolean;
  allowAlways: boolean;
}

export class ShellConfirmation {
  private rl: readline.Interface;

  constructor(rl: readline.Interface) {
    this.rl = rl;
  }

  /**
   * Show confirmation dialog for dangerous command
   */
  async confirm(options: ConfirmationOptions): Promise<ConfirmationResult> {
    const theme = themeManager.getCurrentTheme();
    
    // Display warning
    console.log('\n' + theme.styles.error('⚠️  DANGEROUS COMMAND DETECTED'));
    console.log(theme.styles.warning('━'.repeat(50)));
    
    console.log(theme.styles.info('Command:'));
    console.log(theme.styles.highlight(`  ${options.command}`));
    
    if (options.workingDirectory) {
      console.log(theme.styles.info('Working Directory:'));
      console.log(theme.styles.muted(`  ${options.workingDirectory}`));
    }
    
    console.log(theme.styles.info('Reason:'));
    console.log(theme.styles.muted(`  ${options.reason}`));
    
    console.log(theme.styles.warning('━'.repeat(50)));
    console.log(theme.styles.info('Options:'));
    console.log(theme.styles.success('  [y] Yes, allow once'));
    console.log(theme.styles.success('  [a] Yes, allow always for this session'));
    console.log(theme.styles.error('  [n] No, cancel command'));
    console.log('');

    return new Promise((resolve) => {
      const handleInput = (input: string) => {
        const choice = input.trim().toLowerCase();
        
        switch (choice) {
          case 'y':
          case 'yes':
            this.rl.off('line', handleInput);
            resolve({ allow: true, allowAlways: false });
            break;
            
          case 'a':
          case 'always':
            this.rl.off('line', handleInput);
            resolve({ allow: true, allowAlways: true });
            break;
            
          case 'n':
          case 'no':
          case '':
            this.rl.off('line', handleInput);
            resolve({ allow: false, allowAlways: false });
            break;
            
          default:
            console.log(theme.styles.error('Invalid choice. Please enter y/a/n:'));
            break;
        }
      };

      this.rl.on('line', handleInput);
      this.rl.setPrompt(theme.styles.prompt('Allow command? [y/a/n]: '));
      this.rl.prompt();
    });
  }

  /**
   * Show simple yes/no confirmation
   */
  async confirmSimple(message: string): Promise<boolean> {
    const theme = themeManager.getCurrentTheme();
    
    console.log('\n' + theme.styles.warning(message));
    
    return new Promise((resolve) => {
      const handleInput = (input: string) => {
        const choice = input.trim().toLowerCase();
        
        if (choice === 'y' || choice === 'yes') {
          this.rl.off('line', handleInput);
          resolve(true);
        } else if (choice === 'n' || choice === 'no' || choice === '') {
          this.rl.off('line', handleInput);
          resolve(false);
        } else {
          console.log(theme.styles.error('Please enter y or n:'));
        }
      };

      this.rl.on('line', handleInput);
      this.rl.setPrompt(theme.styles.prompt('Continue? [y/n]: '));
      this.rl.prompt();
    });
  }
}
