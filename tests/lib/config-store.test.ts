// tests/lib/config-store.test.ts

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import * as path from "path";
import * as os from "os";

describe("ConfigStore", () => {
  let ConfigStore: any;
  let configStore: any;
  let tempConfigPath: string;
  let mockConfig: any;
  let mockFs: any;

  beforeEach(async () => {
    // Create a temporary config path for testing
    tempConfigPath = path.join(os.tmpdir(), "llamacli-test-config.json");

    mockConfig = {
      profiles: {},
      currentProfile: null,
    };

    // Mock fs module with stateful behavior
    let configData = { ...mockConfig };

    mockFs = {
      existsSync: jest.fn().mockReturnValue(true),
      readFileSync: jest.fn().mockImplementation(() => JSON.stringify(configData)),
      writeFileSync: jest.fn().mockImplementation((path: any, data: any) => {
        configData = JSON.parse(data);
      }),
      mkdirSync: jest.fn(),
    };

    // Mock the modules
    jest.doMock("fs", () => mockFs);
    jest.doMock("os", () => ({
      homedir: jest.fn().mockReturnValue(os.tmpdir()),
      tmpdir: jest.fn().mockReturnValue("/tmp"),
    }));

    // Dynamically import the module after mocking
    const configModule = await import("../../src/lib/config-store.js");
    ConfigStore = configModule.ConfigStore;

    configStore = new ConfigStore();
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe("Profile Management", () => {
    it("should add a new profile", () => {
      const profile = {
        name: "test-ollama",
        type: "ollama",
        endpoint: "http://localhost:11434",
      };

      configStore.setProfile(profile);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const savedProfile = configStore.getProfile("test-ollama");
      expect(savedProfile).toEqual(profile);
    });

    it("should update an existing profile", () => {
      const profile = {
        name: "test-ollama",
        type: "ollama",
        endpoint: "http://localhost:11434",
      };

      configStore.setProfile(profile);

      const updatedProfile = {
        ...profile,
        endpoint: "http://localhost:11435",
      };

      configStore.setProfile(updatedProfile);

      const savedProfile = configStore.getProfile("test-ollama");
      expect(savedProfile?.endpoint).toBe("http://localhost:11435");
    });

    it("should delete a profile", () => {
      const profile = {
        name: "test-ollama",
        type: "ollama",
        endpoint: "http://localhost:11434",
      };

      configStore.setProfile(profile);
      expect(configStore.getProfile("test-ollama")).toBeTruthy();

      const deleted = configStore.deleteProfile("test-ollama");
      expect(deleted).toBe(true);
      expect(configStore.getProfile("test-ollama")).toBeUndefined();
    });

    it("should return false when deleting non-existent profile", () => {
      const deleted = configStore.deleteProfile("non-existent");
      expect(deleted).toBe(false);
    });

    it("should list all profiles", () => {
      const profile1 = {
        name: "ollama-1",
        type: "ollama",
        endpoint: "http://localhost:11434",
      };

      const profile2 = {
        name: "vllm-1",
        type: "vllm",
        endpoint: "http://localhost:8000",
      };

      configStore.setProfile(profile1);
      configStore.setProfile(profile2);

      const profiles = configStore.listProfiles();
      expect(profiles).toContain("ollama-1");
      expect(profiles).toContain("vllm-1");
      expect(profiles).toHaveLength(2);
    });
  });

  describe("Current Profile Management", () => {
    it("should set and get current profile", () => {
      const profile = {
        name: "test-ollama",
        type: "ollama",
        endpoint: "http://localhost:11434",
      };

      configStore.setProfile(profile);
      const success = configStore.setCurrentProfile("test-ollama");

      expect(success).toBe(true);

      const currentProfile = configStore.getCurrentProfile();
      expect(currentProfile).toEqual(profile);
    });

    it("should return false when setting non-existent profile as current", () => {
      const success = configStore.setCurrentProfile("non-existent");
      expect(success).toBe(false);
    });

    it("should return null when no current profile is set", () => {
      const currentProfile = configStore.getCurrentProfile();
      expect(currentProfile).toBeUndefined();
    });
  });

  describe("Config File Handling", () => {
    it("should create config directory if it does not exist", async () => {
      // Reset mocks for this specific test
      jest.resetModules();

      const mockFsForTest = {
        existsSync: jest.fn().mockReturnValue(false),
        readFileSync: jest.fn().mockImplementation(() => {
          throw new Error("File not found");
        }),
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
      };

      jest.doMock("fs", () => mockFsForTest);
      jest.doMock("os", () => ({
        homedir: jest.fn().mockReturnValue(os.tmpdir()),
        tmpdir: jest.fn().mockReturnValue("/tmp"),
      }));

      const configModule = await import("../../src/lib/config-store.js");
      const TestConfigStore = configModule.ConfigStore;

      const store = new TestConfigStore();
      // Trigger readConfig which calls ensureConfigDir
      store.readConfig();

      expect(mockFsForTest.mkdirSync).toHaveBeenCalled();
    });

    it("should handle missing config file gracefully", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File not found");
      });

      const store = new ConfigStore();
      const profiles = store.listProfiles();

      expect(profiles).toEqual([]);
    });

    it("should handle corrupted config file", () => {
      mockFs.readFileSync.mockReturnValue("invalid json");

      expect(() => new ConfigStore()).not.toThrow();
    });
  });

  describe("Profile Validation", () => {
    it("should accept valid ollama profile", () => {
      const profile = {
        name: "valid-ollama",
        type: "ollama",
        endpoint: "http://localhost:11434",
      };

      expect(() => configStore.setProfile(profile)).not.toThrow();
    });

    it("should accept valid vllm profile", () => {
      const profile = {
        name: "valid-vllm",
        type: "vllm",
        endpoint: "http://localhost:8000",
        model: "llama-2-7b",
      };

      expect(() => configStore.setProfile(profile)).not.toThrow();
    });
  });
});
