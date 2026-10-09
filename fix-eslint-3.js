import fs from "fs";
let content = fs.readFileSync("eslint.config.js", "utf-8");

const moreRulesOff = `
      "max-lines-per-function": "off",
      "complexity": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-extraneous-class": "off",
`;

content = content.replace(/rules: \{\n/, "rules: {\n" + moreRulesOff);

fs.writeFileSync("eslint.config.js", content);
