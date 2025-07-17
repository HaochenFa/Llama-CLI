import { SpecialCharDetector } from "../../src/lib/special-char-detector.js";
import { TextEditor } from "../../src/lib/text-editor.js";

// 简化测试，只测试核心逻辑组件，避免复杂的异步输入处理

describe("SpecialCharDetector", () => {
  describe("命令检测", () => {
    it("应该检测行首的 / 字符", () => {
      const result = SpecialCharDetector.detect("/help");

      expect(result.hasTrigger).toBe(true);
      expect(result.context?.type).toBe("command");
      expect(result.context?.searchText).toBe("help");
      expect(result.shouldTrigger).toBe(true);
    });

    it("应该检测空格后的 / 字符", () => {
      const result = SpecialCharDetector.detect("hello /help");

      expect(result.hasTrigger).toBe(true);
      expect(result.context?.type).toBe("command");
      expect(result.context?.searchText).toBe("help");
    });

    it("不应该检测单词中间的 / 字符", () => {
      const result = SpecialCharDetector.detect("http://example.com");

      expect(result.shouldTrigger).toBe(false);
    });
  });

  describe("文件检测", () => {
    it("应该检测 @ 字符", () => {
      const result = SpecialCharDetector.detect("@file.txt");

      expect(result.hasTrigger).toBe(true);
      expect(result.context?.type).toBe("file");
      expect(result.context?.searchText).toBe("file.txt");
      expect(result.shouldTrigger).toBe(true);
    });

    it("应该检测空格后的 @ 字符", () => {
      const result = SpecialCharDetector.detect("check @file.txt");

      expect(result.hasTrigger).toBe(true);
      expect(result.context?.type).toBe("file");
      expect(result.context?.searchText).toBe("file.txt");
    });

    it("应该检测路径中的 @ 字符", () => {
      const result = SpecialCharDetector.detect("@src/lib/");

      expect(result.hasTrigger).toBe(true);
      expect(result.context?.type).toBe("file");
      expect(result.context?.searchText).toBe("src/lib/");
    });
  });

  describe("工具方法", () => {
    it("应该正确识别完整命令", () => {
      expect(SpecialCharDetector.isCompleteCommand("/help")).toBe(true);
      expect(SpecialCharDetector.isCompleteCommand("/context view")).toBe(false);
      expect(SpecialCharDetector.isCompleteCommand("not a command")).toBe(false);
    });

    it("应该提取文件引用", () => {
      const refs = SpecialCharDetector.extractFileReferences("Check @file1.txt and @file2.js");

      expect(refs).toHaveLength(2);
      expect(refs[0].path).toBe("file1.txt");
      expect(refs[1].path).toBe("file2.js");
    });

    it("应该清理输入", () => {
      const cleaned = SpecialCharDetector.cleanInput("Check @file.txt  and   @other.js");

      expect(cleaned).toBe("Check and");
    });
  });
});

describe("TextEditor", () => {
  let editor: TextEditor;

  beforeEach(() => {
    editor = new TextEditor("Hello world");
  });

  describe("基本操作", () => {
    it("应该正确初始化", () => {
      expect(editor.getText()).toBe("Hello world");
      expect(editor.getCursorPosition()).toBe(11);
    });

    it("应该插入文本", () => {
      editor.setCursorPosition(5);
      editor.insertText(" beautiful");

      expect(editor.getText()).toBe("Hello beautiful world");
      expect(editor.getCursorPosition()).toBe(15);
    });

    it("应该替换文本", () => {
      editor.replaceText(0, 5, "Hi");

      expect(editor.getText()).toBe("Hi world");
      expect(editor.getCursorPosition()).toBe(2);
    });

    it("应该删除文本", () => {
      editor.deleteText(5, 6);

      expect(editor.getText()).toBe("Hello");
      expect(editor.getCursorPosition()).toBe(5);
    });
  });

  describe("光标操作", () => {
    it("应该移动光标", () => {
      editor.setCursorPosition(5);
      expect(editor.getCursorPosition()).toBe(5);

      editor.moveLeft(2);
      expect(editor.getCursorPosition()).toBe(3);

      editor.moveRight(3);
      expect(editor.getCursorPosition()).toBe(6);
    });

    it("应该处理边界情况", () => {
      editor.moveLeft(20);
      expect(editor.getCursorPosition()).toBe(0);

      editor.moveRight(20);
      expect(editor.getCursorPosition()).toBe(11);
    });
  });

  describe("文件引用处理", () => {
    it("应该提取文件引用", () => {
      editor.setText("Check @file1.txt and @file2.js");
      const refs = editor.extractFileReferences();

      expect(refs).toHaveLength(2);
      expect(refs[0].path).toBe("file1.txt");
      expect(refs[1].path).toBe("file2.js");
    });

    it("应该获取清理后的文本", () => {
      editor.setText("Check @file.txt please");
      const cleaned = editor.getCleanText();

      expect(cleaned).toBe("Check please");
    });
  });
});
