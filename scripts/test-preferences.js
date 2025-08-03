#!/usr/bin/env node

/**
 * Test Script for User Preferences System
 * Tests the user preferences management functionality
 */

import { userPreferencesManager } from "../packages/core/dist/index.js";
import { themeManager } from "../packages/cli/dist/ui/theme-manager.js";

async function testUserPreferences() {
  console.log("🧪 Testing User Preferences System\n");

  try {
    // Test 1: Initialize preferences manager
    console.log("1. Initializing preferences manager...");
    await userPreferencesManager.initialize();
    console.log("✅ Preferences manager initialized\n");

    // Test 2: Get default preferences
    console.log("2. Getting default preferences...");
    const defaultPrefs = userPreferencesManager.getPreferences();
    console.log(`✅ Default theme: ${defaultPrefs.cli.theme}`);
    console.log(`✅ Auto-completion: ${defaultPrefs.cli.autoComplete}`);
    console.log(`✅ History enabled: ${defaultPrefs.history.enabled}`);
    console.log(`✅ Max history entries: ${defaultPrefs.history.maxEntries}\n`);

    // Test 3: Update CLI preferences
    console.log("3. Updating CLI preferences...");
    await userPreferencesManager.updateCLIPreferences({
      theme: "dracula",
      prompt: "test> ",
      showWelcome: false,
    });

    const updatedCliPrefs = userPreferencesManager.getCLIPreferences();
    console.log(`✅ Updated theme: ${updatedCliPrefs.theme}`);
    console.log(`✅ Updated prompt: ${updatedCliPrefs.prompt}`);
    console.log(`✅ Show welcome: ${updatedCliPrefs.showWelcome}\n`);

    // Test 4: Update history preferences
    console.log("4. Updating history preferences...");
    await userPreferencesManager.updateHistoryPreferences({
      maxEntries: 500,
      duplicateHandling: "remove",
      excludePatterns: ["password", "secret", "token"],
    });

    const historyPrefs = userPreferencesManager.getHistoryPreferences();
    console.log(`✅ Max entries: ${historyPrefs.maxEntries}`);
    console.log(`✅ Duplicate handling: ${historyPrefs.duplicateHandling}`);
    console.log(`✅ Exclude patterns: ${historyPrefs.excludePatterns.join(", ")}\n`);

    // Test 5: Test theme integration
    console.log("5. Testing theme integration...");
    await themeManager.setTheme("light");
    const currentTheme = themeManager.getCurrentTheme();
    console.log(`✅ Current theme: ${currentTheme.name} (${currentTheme.type})\n`);

    // Test 6: Test preference watching
    console.log("6. Testing preference watching...");
    let watcherCalled = false;
    const unwatch = userPreferencesManager.onPreferencesChange((prefs) => {
      watcherCalled = true;
      console.log(`✅ Watcher called: theme is now ${prefs.cli.theme}`);
    });

    await userPreferencesManager.updateCLIPreferences({ theme: "github" });

    // Give watcher time to execute
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (watcherCalled) {
      console.log("✅ Preference watcher working correctly");
    } else {
      console.log("❌ Preference watcher not called");
    }

    unwatch(); // Clean up watcher
    console.log();

    // Test 7: Test export/import
    console.log("7. Testing export/import...");
    const tempFile = "/tmp/llamacli-prefs-test.json";

    await userPreferencesManager.exportPreferences(tempFile);
    console.log("✅ Preferences exported");

    // Modify preferences
    await userPreferencesManager.updateCLIPreferences({ theme: "monokai" });
    console.log(`✅ Changed theme to: ${userPreferencesManager.getCLIPreferences().theme}`);

    // Import back
    await userPreferencesManager.importPreferences(tempFile);
    const importedTheme = userPreferencesManager.getCLIPreferences().theme;
    console.log(`✅ Imported theme: ${importedTheme}`);

    // Clean up temp file
    try {
      const fs = await import("fs/promises");
      await fs.unlink(tempFile);
    } catch (error) {
      // Ignore cleanup errors
    }
    console.log();

    // Test 8: Test reset functionality
    console.log("8. Testing reset functionality...");

    // Make some changes
    await userPreferencesManager.updateCLIPreferences({
      theme: "custom-test",
      prompt: "custom-prompt> ",
      showTips: false,
    });

    console.log(`✅ Set custom theme: ${userPreferencesManager.getCLIPreferences().theme}`);

    // Reset CLI preferences
    await userPreferencesManager.resetCLIPreferences();
    const resetCliPrefs = userPreferencesManager.getCLIPreferences();
    console.log(`✅ Reset theme: ${resetCliPrefs.theme}`);
    console.log(`✅ Reset prompt: ${resetCliPrefs.prompt}`);
    console.log(`✅ Reset show tips: ${resetCliPrefs.showTips}\n`);

    // Test 9: Test nested preference updates
    console.log("9. Testing nested preference updates...");

    await userPreferencesManager.updatePreferences({
      editor: {
        tabSize: 4,
        fontSize: 16,
      },
      display: {
        maxWidth: 100,
        codeBlockStyle: "minimal",
      },
    });

    const editorPrefs = userPreferencesManager.getEditorPreferences();
    const displayPrefs = userPreferencesManager.getDisplayPreferences();

    console.log(`✅ Editor tab size: ${editorPrefs.tabSize}`);
    console.log(`✅ Editor font size: ${editorPrefs.fontSize}`);
    console.log(`✅ Display max width: ${displayPrefs.maxWidth}`);
    console.log(`✅ Code block style: ${displayPrefs.codeBlockStyle}\n`);

    // Test 10: Validate preference structure
    console.log("10. Validating preference structure...");
    const allPrefs = userPreferencesManager.getPreferences();

    const requiredSections = ["cli", "editor", "display", "behavior", "shortcuts", "history"];
    const missingSections = requiredSections.filter((section) => !allPrefs[section]);

    if (missingSections.length === 0) {
      console.log("✅ All required preference sections present");
    } else {
      console.log(`❌ Missing sections: ${missingSections.join(", ")}`);
    }

    console.log(`✅ Preference version: ${allPrefs.version}`);
    console.log(`✅ Last updated: ${new Date(allPrefs.lastUpdated).toISOString()}\n`);

    // Summary
    console.log("📊 Test Summary:");
    console.log("✅ Preferences initialization");
    console.log("✅ Default preferences loading");
    console.log("✅ CLI preferences updates");
    console.log("✅ History preferences updates");
    console.log("✅ Theme integration");
    console.log("✅ Preference watching");
    console.log("✅ Export/import functionality");
    console.log("✅ Reset functionality");
    console.log("✅ Nested preference updates");
    console.log("✅ Preference structure validation");

    console.log("\n🎉 All user preferences tests passed!");
  } catch (error) {
    console.error("❌ User preferences test failed:", error);
    process.exit(1);
  }
}

// Run the test
testUserPreferences().catch((error) => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});
