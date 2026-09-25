import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist", "**/coverage", "**/node_modules", ".artifacts", "packages/*/bin"] },
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
    files: ["packages/graphinject/src/routers/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)examples/",
              message: "The framework never imports example code (#91).",
            },
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
    files: ["packages/graphinject/src/tools/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)examples/",
              message: "The framework never imports example code (#91).",
            },
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
    files: ["packages/graphinject/src/terns/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)examples/",
              message: "The framework never imports example code (#91).",
            },
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
    files: ["packages/graphinject/src/**/*.ts"],
    ignores: [
      "packages/graphinject/src/routers/**",
      "packages/graphinject/src/tools/**",
      "packages/graphinject/src/terns/**",
      "packages/graphinject/src/bundles/**",
      "packages/graphinject/src/demos/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)examples/",
              message: "The framework never imports example code (#91).",
            },
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
    // An example uses graphInject like any outside project: only its public API.
    files: ["examples/*/src/**/*.ts", "examples/*/tests/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(\\.\\./){2,}(packages|graphinject)/",
              message: 'Examples import only from "graphinject" (its public API).',
            },
            {
              regex: "^graphinject/",
              message: 'No deep imports: use "graphinject" (its public API).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/graphinject/tests/**/*.ts", "examples/*/tests/**/*.ts"],
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
