import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", ".artifacts"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 50, skipBlankLines: true, skipComments: true }],
      complexity: ["error", 10],
      "no-console": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      // Angular-style components: @Agent / @Bundle / @McpServer / @McpTool classes are empty on purpose
      "@typescript-eslint/no-extraneous-class": ["error", { allowWithDecorator: true }],
    },
  },
  {
    files: ["src/routers/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "/(graph|agents|prompts|tools)/",
              message: "Routers are isolated: depend only on config, finops and llm.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/tools/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "/(graph|agents|prompts|routers)/",
              message: "Tools are isolated: depend only on config, finops and llm.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/terns/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^\\.\\./",
              message: "Terns are isolated: they depend on nothing else in src.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: ["src/routers/**", "src/tools/**", "src/terns/**", "src/bundles/**", "src/demos/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "/routers/(?!index\\.js$)",
              message: "Import routers only through src/routers/index.ts.",
            },
            {
              regex: "/tools/(?!index\\.js$)",
              message: "Import tools only through src/tools/index.ts.",
            },
            {
              regex: "/terns/(?!index\\.js$)",
              message: "Import terns only through src/terns/index.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    // Bundles have their own tools/ folders: the core modules are two or more levels up.
    files: ["src/bundles/**/*.ts", "src/demos/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(\\.\\./){2,}routers/(?!index\\.js$)",
              message: "Import routers only through src/routers/index.ts.",
            },
            {
              regex: "^(\\.\\./){2,}tools/(?!index\\.js$)",
              message: "Import the core tools only through src/tools/index.ts.",
            },
            {
              regex: "^(\\.\\./){2,}terns/(?!index\\.js$)",
              message: "Import terns only through src/terns/index.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: { "max-lines-per-function": "off" },
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { require: "readonly", process: "readonly" },
    },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
