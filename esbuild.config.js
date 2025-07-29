const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const buildPackage = async (packageName, entryPoint, outfile, options = {}) => {
  const config = {
    entryPoints: [entryPoint],
    bundle: true,
    outfile,
    platform: "node",
    target: "node18",
    format: "esm",
    external: ["react", "ink", "commander"],
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV !== "production",
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    },
    banner: {
      js: packageName === "cli" ? "#!/usr/bin/env node" : "",
    },
    ...options,
  };

  try {
    await esbuild.build(config);
    console.log(`✅ Built ${packageName} package (JavaScript)`);

    // Make CLI executable
    if (packageName === "cli" && fs.existsSync(outfile)) {
      fs.chmodSync(outfile, 0o755);
      console.log(`✅ Made ${packageName} executable`);
    }
  } catch (error) {
    console.error(`❌ Failed to build ${packageName}:`, error);
    process.exit(1);
  }
};

const buildAll = async () => {
  console.log("🔨 Building LlamaCLI packages...");

  // Ensure dist directories exist
  const distDirs = ["packages/core/dist", "packages/cli/dist"];

  for (const dir of distDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Build core package
  if (fs.existsSync("packages/core/src/index.ts")) {
    await buildPackage("core", "packages/core/src/index.ts", "packages/core/dist/index.js");
  }

  // Build CLI package
  if (fs.existsSync("packages/cli/src/index.ts")) {
    await buildPackage("cli", "packages/cli/src/index.ts", "packages/cli/dist/index.js");
  }

  console.log("✨ Build completed!");
};

const watchMode = process.argv.includes("--watch");

if (watchMode) {
  console.log("👀 Starting watch mode...");
  // Watch mode implementation would go here
  // For now, just build once
  buildAll().catch(console.error);
} else if (require.main === module) {
  buildAll().catch(console.error);
}

module.exports = { buildPackage, buildAll };
