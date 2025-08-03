/**
 * Tests for Session Manager
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SessionManager } from "../session-manager.js";
import { FileStorageBackend } from "../file-storage-backend.js";

describe("SessionManager", () => {
  let sessionManager: SessionManager;
  let storageBackend: FileStorageBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    storageBackend = new FileStorageBackend("/tmp/sessions");
    sessionManager = new SessionManager(storageBackend);
  });

  describe("initialization", () => {
    it("should create session manager instance", () => {
      expect(sessionManager).toBeInstanceOf(SessionManager);
    });

    it("should initialize with storage backend", () => {
      expect(sessionManager.getStorageBackend()).toBe(storageBackend);
    });
  });

  describe("session creation", () => {
    it("should create new session", async () => {
      const session = await sessionManager.createSession({
        name: "Test Session",
        metadata: { project: "test" },
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.name).toBe("Test Session");
      expect(session.metadata.project).toBe("test");
      expect(session.createdAt).toBeDefined();
      expect(session.messages).toEqual([]);
    });

    it("should generate unique session IDs", async () => {
      const session1 = await sessionManager.createSession({ name: "Session 1" });
      const session2 = await sessionManager.createSession({ name: "Session 2" });

      expect(session1.id).not.toBe(session2.id);
    });

    it("should validate session creation parameters", async () => {
      await expect(
        sessionManager.createSession({
          name: "", // Invalid empty name
        })
      ).rejects.toThrow();
    });
  });

  describe("session retrieval", () => {
    it("should get session by ID", async () => {
      const created = await sessionManager.createSession({ name: "Test Session" });
      const retrieved = await sessionManager.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.name).toBe(created.name);
    });

    it("should return null for non-existent session", async () => {
      const session = await sessionManager.getSession("non-existent-id");
      expect(session).toBeNull();
    });

    it("should list all sessions", async () => {
      await sessionManager.createSession({ name: "Session 1" });
      await sessionManager.createSession({ name: "Session 2" });
      await sessionManager.createSession({ name: "Session 3" });

      const sessions = await sessionManager.listSessions();
      expect(sessions).toHaveLength(3);
      expect(sessions.map((s) => s.name)).toContain("Session 1");
      expect(sessions.map((s) => s.name)).toContain("Session 2");
      expect(sessions.map((s) => s.name)).toContain("Session 3");
    });

    it("should list sessions with pagination", async () => {
      // Create multiple sessions
      for (let i = 1; i <= 10; i++) {
        await sessionManager.createSession({ name: `Session ${i}` });
      }

      const page1 = await sessionManager.listSessions({ limit: 5, offset: 0 });
      const page2 = await sessionManager.listSessions({ limit: 5, offset: 5 });

      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);

      // Ensure no overlap
      const page1Ids = page1.map((s) => s.id);
      const page2Ids = page2.map((s) => s.id);
      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
    });
  });

  describe("session updates", () => {
    it("should update session metadata", async () => {
      const session = await sessionManager.createSession({ name: "Test Session" });

      const updated = await sessionManager.updateSession(session.id, {
        name: "Updated Session",
        metadata: { updated: true },
      });

      expect(updated.name).toBe("Updated Session");
      expect(updated.metadata.updated).toBe(true);
      expect(updated.updatedAt).not.toBe(session.updatedAt);
    });

    it("should add messages to session", async () => {
      const session = await sessionManager.createSession({ name: "Test Session" });

      await sessionManager.addMessage(session.id, {
        role: "user",
        content: "Hello, AI!",
      });

      await sessionManager.addMessage(session.id, {
        role: "assistant",
        content: "Hello! How can I help you?",
      });

      const updated = await sessionManager.getSession(session.id);
      expect(updated!.messages).toHaveLength(2);
      expect(updated!.messages[0].content).toBe("Hello, AI!");
      expect(updated!.messages[1].content).toBe("Hello! How can I help you?");
    });

    it("should handle message validation", async () => {
      const session = await sessionManager.createSession({ name: "Test Session" });

      await expect(
        sessionManager.addMessage(session.id, {
          role: "invalid" as any,
          content: "Test message",
        })
      ).rejects.toThrow();
    });
  });

  describe("session deletion", () => {
    it("should delete session", async () => {
      const session = await sessionManager.createSession({ name: "Test Session" });

      await sessionManager.deleteSession(session.id);

      const retrieved = await sessionManager.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it("should handle deletion of non-existent session", async () => {
      await expect(sessionManager.deleteSession("non-existent-id")).resolves.not.toThrow();
    });

    it("should delete multiple sessions", async () => {
      const session1 = await sessionManager.createSession({ name: "Session 1" });
      const session2 = await sessionManager.createSession({ name: "Session 2" });
      const session3 = await sessionManager.createSession({ name: "Session 3" });

      await sessionManager.deleteSessions([session1.id, session3.id]);

      const remaining = await sessionManager.listSessions();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(session2.id);
    });
  });

  describe("session search", () => {
    it("should search sessions by name", async () => {
      await sessionManager.createSession({ name: "Project Alpha" });
      await sessionManager.createSession({ name: "Project Beta" });
      await sessionManager.createSession({ name: "Task Gamma" });

      const results = await sessionManager.searchSessions("Project");
      expect(results).toHaveLength(2);
      expect(results.map((s) => s.name)).toContain("Project Alpha");
      expect(results.map((s) => s.name)).toContain("Project Beta");
    });

    it("should search sessions by metadata", async () => {
      await sessionManager.createSession({
        name: "Session 1",
        metadata: { type: "development" },
      });
      await sessionManager.createSession({
        name: "Session 2",
        metadata: { type: "testing" },
      });

      const results = await sessionManager.searchSessions("development");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Session 1");
    });
  });

  describe("session archiving", () => {
    it("should archive session", async () => {
      const session = await sessionManager.createSession({ name: "Test Session" });

      await sessionManager.archiveSession(session.id);

      const archived = await sessionManager.getSession(session.id);
      expect(archived!.archived).toBe(true);
      expect(archived!.archivedAt).toBeDefined();
    });

    it("should list only active sessions by default", async () => {
      const session1 = await sessionManager.createSession({ name: "Active Session" });
      const session2 = await sessionManager.createSession({ name: "To Archive" });

      await sessionManager.archiveSession(session2.id);

      const activeSessions = await sessionManager.listSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe(session1.id);
    });

    it("should list archived sessions when requested", async () => {
      const session = await sessionManager.createSession({ name: "Test Session" });
      await sessionManager.archiveSession(session.id);

      const archivedSessions = await sessionManager.listSessions({ includeArchived: true });
      expect(archivedSessions).toHaveLength(1);
      expect(archivedSessions[0].archived).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle storage backend errors", async () => {
      const errorBackend = {
        save: vi.fn().mockRejectedValue(new Error("Storage error")),
        load: vi.fn().mockRejectedValue(new Error("Storage error")),
        delete: vi.fn().mockRejectedValue(new Error("Storage error")),
        list: vi.fn().mockRejectedValue(new Error("Storage error")),
      };

      const errorSessionManager = new SessionManager(errorBackend as any);

      await expect(errorSessionManager.createSession({ name: "Test" })).rejects.toThrow(
        "Storage error"
      );
    });

    it("should validate session data integrity", async () => {
      const session = {
        id: "test-session",
        name: "Test Session",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: null as any, // Invalid data
        metadata: {},
      };

      await expect(sessionManager.validateSession(session)).rejects.toThrow();
    });
  });
});
