// Mock for inquirer module to avoid ESM import issues in Jest
const inquirer = {
  prompt: jest.fn().mockResolvedValue({}),
  createPromptModule: jest.fn(() => ({
    prompt: jest.fn().mockResolvedValue({}),
  })),
  registerPrompt: jest.fn(),
  Separator: class Separator {
    constructor(line) {
      this.type = "separator";
      this.line = line || "────────";
    }
  },
};

module.exports = inquirer;
module.exports.default = inquirer;
