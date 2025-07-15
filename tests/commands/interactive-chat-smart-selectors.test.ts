import { InteractiveChatSession } from "../../src/commands/interactive-chat.js";
import { FileContextManager } from "../../src/lib/file-context-manager.js";
import inquirer from "inquirer";

// Mock dependencies
jest.mock("../../src/lib/config-store.js");
jest.mock("../../src/lib/context-compiler.js");
jest.mock("../../src/lib/adapters/adapter-factory.js");
jest.mock("../../src/lib/tool-dispatcher.js");
jest.mock("../../src/lib/file-context-manager.js");
jest.mock("../../src/lib/thinking-renderer.js");
jest.mock("../../src/lib/stream-processor.js");
jest.mock("readline");
jest.mock("inquirer");

const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;

describe("InteractiveChatSession Smart Selectors", () => {
  let interactiveChatSession: InteractiveChatSession;
  let mockFileContextManager: jest.Mocked<FileContextManager>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock FileContextManager
    mockFileContextManager = {
      getFileCompletions: jest.fn(),
      parseAtSyntax: jest.fn(),
      loadFiles: jest.fn(),
      loadFile: jest.fn(),
      isFileInContext: jest.fn(),
      getDisplayName: jest.fn(),
      isSupportedFileType: jest.fn(),
    } as any;

    // Mock inquirer
    mockInquirer.prompt = jest.fn();

    // Create InteractiveChatSession instance
    interactiveChatSession = new InteractiveChatSession(false);
    
    // Replace the file context manager with our mock
    (interactiveChatSession as any).fileContextManager = mockFileContextManager;
  });

  describe("Smart Command Selector", () => {
    it("should show all commands when no prefix provided", async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedCommand: "/help" });

      const showSmartCommandSelector = (interactiveChatSession as any).showSmartCommandSelector.bind(interactiveChatSession);
      const result = await showSmartCommandSelector("");

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: "list",
          name: "selectedCommand",
          message: "⚡ Select a command:",
          choices: expect.arrayContaining([
            expect.objectContaining({ value: "/help" }),
            expect.objectContaining({ value: "/context view" }),
            expect.objectContaining({ value: "/files list" }),
          ])
        })
      ]);
      expect(result).toBe("/help");
    });

    it("should filter commands based on prefix", async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedCommand: "/memory add" });

      const showSmartCommandSelector = (interactiveChatSession as any).showSmartCommandSelector.bind(interactiveChatSession);
      const result = await showSmartCommandSelector("mem");

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          message: '⚡ Commands matching "mem":',
          choices: expect.arrayContaining([
            expect.objectContaining({ value: "/memory add" }),
            expect.objectContaining({ value: "/memory list" }),
            expect.objectContaining({ value: "/memory clear" }),
          ])
        })
      ]);
      expect(result).toBe("/memory add");
    });

    it("should return null when user cancels", async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedCommand: null });

      const showSmartCommandSelector = (interactiveChatSession as any).showSmartCommandSelector.bind(interactiveChatSession);
      const result = await showSmartCommandSelector("");

      expect(result).toBeNull();
    });
  });

  describe("Smart File Selector", () => {
    it("should show files and directories", async () => {
      mockFileContextManager.getFileCompletions.mockReturnValue(["src/", "package.json", "README.md"]);
      mockInquirer.prompt.mockResolvedValue({ selectedFile: "package.json" });

      const showSmartFileSelector = (interactiveChatSession as any).showSmartFileSelector.bind(interactiveChatSession);
      const result = await showSmartFileSelector("");

      expect(mockFileContextManager.getFileCompletions).toHaveBeenCalledWith("");
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: "list",
          name: "selectedFile",
          message: "📁 Select a file:",
          choices: expect.arrayContaining([
            expect.objectContaining({ name: "📁 src/", value: "src/" }),
            expect.objectContaining({ name: "📄 package.json", value: "package.json" }),
            expect.objectContaining({ name: "📄 README.md", value: "README.md" }),
          ])
        })
      ]);
      expect(result).toBe("package.json");
    });

    it("should handle directory navigation", async () => {
      // First call - show root directory
      mockFileContextManager.getFileCompletions
        .mockReturnValueOnce(["src/", "package.json"])
        .mockReturnValueOnce(["main.ts", "utils.ts"]); // Second call - show src directory
      
      mockInquirer.prompt
        .mockResolvedValueOnce({ selectedFile: "src/" }) // User selects src directory
        .mockResolvedValueOnce({ selectedFile: "main.ts" }); // User selects main.ts file

      const showSmartFileSelector = (interactiveChatSession as any).showSmartFileSelector.bind(interactiveChatSession);
      const result = await showSmartFileSelector("");

      expect(result).toBe("src/main.ts");
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(2);
    });

    it("should return null when user cancels", async () => {
      mockFileContextManager.getFileCompletions.mockReturnValue(["src/", "package.json"]);
      mockInquirer.prompt.mockResolvedValue({ selectedFile: null });

      const showSmartFileSelector = (interactiveChatSession as any).showSmartFileSelector.bind(interactiveChatSession);
      const result = await showSmartFileSelector("");

      expect(result).toBeNull();
    });
  });
});
