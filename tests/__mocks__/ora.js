// Mock for ora module to avoid ESM import issues in Jest
const ora = (options) => {
  const spinner = {
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
    text: "",
    color: "cyan",
    isSpinning: false,
    clear: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
    frame: jest.fn().mockReturnValue("⠋"),
  };

  if (typeof options === "string") {
    spinner.text = options;
  } else if (options && typeof options === "object") {
    Object.assign(spinner, options);
  }

  return spinner;
};

module.exports = ora;
module.exports.default = ora;
