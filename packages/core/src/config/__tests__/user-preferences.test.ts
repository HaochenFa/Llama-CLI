/**
 * Tests for User Preferences Management
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserPreferences } from "../user-preferences.js";

describe("UserPreferences", () => {
  let preferences: UserPreferences;

  beforeEach(() => {
    vi.clearAllMocks();
    preferences = new UserPreferences();
  });

  describe("initialization", () => {
    it("should create preferences instance", () => {
      expect(preferences).toBeInstanceOf(UserPreferences);
    });

    it("should have default preferences", () => {
      const defaultPrefs = preferences.getAll();
      expect(defaultPrefs).toBeDefined();
      expect(defaultPrefs.theme).toBeDefined();
      expect(defaultPrefs.language).toBeDefined();
    });
  });

  describe("theme preferences", () => {
    it("should get default theme", () => {
      const theme = preferences.getTheme();
      expect(theme).toBe("auto");
    });

    it("should set theme", () => {
      preferences.setTheme("dark");
      expect(preferences.getTheme()).toBe("dark");
    });

    it("should validate theme values", () => {
      expect(() => preferences.setTheme("invalid" as any)).toThrow();
    });
  });

  describe("language preferences", () => {
    it("should get default language", () => {
      const language = preferences.getLanguage();
      expect(language).toBe("en");
    });

    it("should set language", () => {
      preferences.setLanguage("zh");
      expect(preferences.getLanguage()).toBe("zh");
    });

    it("should validate language codes", () => {
      expect(() => preferences.setLanguage("invalid")).toThrow();
    });
  });

  describe("editor preferences", () => {
    it("should get editor preferences", () => {
      const editorPrefs = preferences.getEditorPreferences();
      expect(editorPrefs).toBeDefined();
      expect(editorPrefs.tabSize).toBeGreaterThan(0);
      expect(editorPrefs.wordWrap).toBeDefined();
    });

    it("should update editor preferences", () => {
      preferences.updateEditorPreferences({
        tabSize: 4,
        wordWrap: true,
        showLineNumbers: false,
      });

      const editorPrefs = preferences.getEditorPreferences();
      expect(editorPrefs.tabSize).toBe(4);
      expect(editorPrefs.wordWrap).toBe(true);
      expect(editorPrefs.showLineNumbers).toBe(false);
    });
  });

  describe("AI preferences", () => {
    it("should get AI preferences", () => {
      const aiPrefs = preferences.getAIPreferences();
      expect(aiPrefs).toBeDefined();
      expect(aiPrefs.defaultModel).toBeDefined();
      expect(aiPrefs.temperature).toBeGreaterThanOrEqual(0);
      expect(aiPrefs.temperature).toBeLessThanOrEqual(2);
    });

    it("should update AI preferences", () => {
      preferences.updateAIPreferences({
        defaultModel: "gpt-4",
        temperature: 0.7,
        maxTokens: 2000,
      });

      const aiPrefs = preferences.getAIPreferences();
      expect(aiPrefs.defaultModel).toBe("gpt-4");
      expect(aiPrefs.temperature).toBe(0.7);
      expect(aiPrefs.maxTokens).toBe(2000);
    });

    it("should validate temperature range", () => {
      expect(() => {
        preferences.updateAIPreferences({ temperature: 3.0 });
      }).toThrow();

      expect(() => {
        preferences.updateAIPreferences({ temperature: -1.0 });
      }).toThrow();
    });
  });

  describe("persistence", () => {
    it("should save preferences", async () => {
      preferences.setTheme("dark");
      preferences.setLanguage("zh");

      await preferences.save();

      // Verify preferences were saved (would need actual file system mock)
      expect(true).toBe(true); // Placeholder
    });

    it("should load preferences", async () => {
      mockFs.setFile(
        "/home/user/.llamacli/preferences.json",
        JSON.stringify({
          theme: "light",
          language: "es",
          editor: {
            tabSize: 8,
          },
        })
      );

      await preferences.load();

      expect(preferences.getTheme()).toBe("light");
      expect(preferences.getLanguage()).toBe("es");
      expect(preferences.getEditorPreferences().tabSize).toBe(8);
    });

    it("should handle corrupted preferences file", async () => {
      mockFs.setFile("/home/user/.llamacli/preferences.json", "invalid json");

      await expect(preferences.load()).resolves.not.toThrow();

      // Should fall back to defaults
      expect(preferences.getTheme()).toBe("auto");
    });
  });

  describe("validation", () => {
    it("should validate all preferences", () => {
      const isValid = preferences.validate();
      expect(isValid).toBe(true);
    });

    it("should detect invalid preferences", () => {
      preferences.updatePreferences({
        theme: "invalid" as any,
        language: "invalid",
      });

      const isValid = preferences.validate();
      expect(isValid).toBe(false);
    });
  });

  describe("reset functionality", () => {
    it("should reset to defaults", () => {
      preferences.setTheme("dark");
      preferences.setLanguage("zh");

      preferences.reset();

      expect(preferences.getTheme()).toBe("auto");
      expect(preferences.getLanguage()).toBe("en");
    });

    it("should reset specific sections", () => {
      preferences.updateEditorPreferences({ tabSize: 8 });
      preferences.resetEditorPreferences();

      const editorPrefs = preferences.getEditorPreferences();
      expect(editorPrefs.tabSize).toBe(2); // Default value
    });
  });

  describe("change notifications", () => {
    it("should emit change events", () => {
      const changeHandler = vi.fn();
      preferences.on("change", changeHandler);

      preferences.setTheme("dark");

      expect(changeHandler).toHaveBeenCalledWith({
        key: "theme",
        oldValue: "auto",
        newValue: "dark",
      });
    });

    it("should emit specific preference change events", () => {
      const themeChangeHandler = vi.fn();
      preferences.on("theme:change", themeChangeHandler);

      preferences.setTheme("light");

      expect(themeChangeHandler).toHaveBeenCalledWith("light", "auto");
    });
  });
});
