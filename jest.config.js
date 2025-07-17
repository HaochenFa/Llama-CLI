/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          target: "ES2022",
          moduleResolution: "node",
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^chalk$": "<rootDir>/tests/__mocks__/chalk.js",
    "^inquirer$": "<rootDir>/tests/__mocks__/inquirer.js",
    "^ora$": "<rootDir>/tests/__mocks__/ora.js",
    "^inquirer-autocomplete-standalone$":
      "<rootDir>/tests/__mocks__/inquirer-autocomplete-standalone.js",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(chalk|inquirer|ora|marked-terminal|ansi-escapes|cli-spinners|log-symbols|strip-ansi|string-width|emoji-regex|is-unicode-supported|@inquirer|rxjs|mute-stream|run-async|figures|yoctocolors-cjs|inquirer-autocomplete-standalone)/)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/index.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 10000,
  verbose: true,
};
