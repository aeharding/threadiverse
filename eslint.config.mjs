// @ts-check

import eslint from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  perfectionist.configs["recommended-natural"],
  {
    rules: {
      // `interface X extends z.infer<typeof schemas.X> {}` keeps the name
      // (and docs references) that a `type X = z.infer<...>` alias loses
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: [
      "dist",
      "docs/.vitepress/cache",
      "docs/.vitepress/dist",
      "docs/api",
      "src/providers/piefed/schema.ts",
    ],
  },
);
