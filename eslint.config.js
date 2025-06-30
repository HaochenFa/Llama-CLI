import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json"], // 指定 tsconfig.json 路径
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig, // 确保 Prettier 配置在最后，覆盖其他规则
  {
    files: ["**/*.ts"],
    rules: {
      // 在这里添加或覆盖您的 TypeScript 规则
      "no-unused-vars": "off", // 关闭 ESLint 自身的 no-unused-vars
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }], // 使用 TypeScript ESLint 的规则
      "@typescript-eslint/no-explicit-any": "off", // 允许使用 any
      "@typescript-eslint/no-non-null-assertion": "off", // 允许使用非空断言
      "@typescript-eslint/ban-ts-comment": "off", // 允许使用 @ts-ignore 等
    },
  },
  {
    ignores: ["dist/", "node_modules/", "package-lock.json"], // 忽略文件和目录
  },
];