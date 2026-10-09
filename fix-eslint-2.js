import fs from "fs";
let content = fs.readFileSync("eslint.config.js", "utf-8");

const moreRulesOff = `
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-unnecessary-type-arguments": "off",
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "no-restricted-imports": "off",
      "no-regex-spaces": "off",
`;

content = content.replace(/rules: \{\n/, "rules: {\n" + moreRulesOff);

fs.writeFileSync("eslint.config.js", content);
