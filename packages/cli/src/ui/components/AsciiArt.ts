/**
 * ASCII Art logos for LlamaCLI
 */

export const shortLlamaLogo = `
 ██╗     ██╗      █████╗ ███╗   ███╗ █████╗ 
 ██║     ██║     ██╔══██╗████╗ ████║██╔══██╗
 ██║     ██║     ███████║██╔████╔██║███████║
 ██║     ██║     ██╔══██║██║╚██╔╝██║██╔══██║
 ███████╗███████╗██║  ██║██║ ╚═╝ ██║██║  ██║
 ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝
`;

export const longLlamaLogo = `
 ██╗     ██╗      █████╗ ███╗   ███╗ █████╗      ██████╗██╗     ██╗
 ██║     ██║     ██╔══██╗████╗ ████║██╔══██╗    ██╔════╝██║     ██║
 ██║     ██║     ███████║██╔████╔██║███████║    ██║     ██║     ██║
 ██║     ██║     ██╔══██║██║╚██╔╝██║██╔══██║    ██║     ██║     ██║
 ███████╗███████╗██║  ██║██║ ╚═╝ ██║██║  ██║    ╚██████╗███████╗██║
 ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝     ╚═════╝╚══════╝╚═╝
`;

export const llamaEmoji = `
    🦙
  ╭─────╮
  │ CLI │
  ╰─────╯
`;

/**
 * Get the display width of ASCII art
 */
export function getAsciiArtWidth(art: string): number {
  const lines = art.trim().split('\n');
  return Math.max(...lines.map(line => line.length));
}

/**
 * Get the display height of ASCII art
 */
export function getAsciiArtHeight(art: string): number {
  return art.trim().split('\n').length;
}
