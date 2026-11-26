import type { Config } from "prettier";

const config = {
  endOfLine: "lf",
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 80
} satisfies Config;

export default config;
