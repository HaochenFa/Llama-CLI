/**
 * Crypto polyfill setup for Node.js < 18
 * This script must be run before any other modules that might use crypto
 */

const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

if (majorVersion < 18) {
  console.log(`Node.js ${nodeVersion} detected. Setting up crypto polyfill...`);

  try {
    const crypto = require("crypto");

    // Set up crypto polyfill
    if (!globalThis.crypto) {
      globalThis.crypto = {
        getRandomValues: (array) => {
          if (
            array instanceof Uint8Array ||
            array instanceof Uint16Array ||
            array instanceof Uint32Array
          ) {
            return crypto.randomFillSync(array);
          }
          throw new Error("getRandomValues only supports typed arrays");
        },
        randomUUID:
          crypto.randomUUID ||
          (() => {
            const bytes = crypto.randomBytes(16);
            bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
            bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
            return bytes
              .toString("hex")
              .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
          }),
        subtle: {}, // Basic subtle crypto placeholder
      };
    }

    console.log("Crypto polyfill setup complete.");
  } catch (error) {
    console.error("Failed to setup crypto polyfill:", error);
    process.exit(1);
  }
} else {
  console.log(`Node.js ${nodeVersion} has native crypto support.`);
}
