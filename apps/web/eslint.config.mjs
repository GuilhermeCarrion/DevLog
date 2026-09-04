import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Padrão deliberado do projeto: sincronizar o form no useEffect(open) dos
      // modais. Regra nova do Next 16 marca como erro — rebaixada para aviso
      // (não quebra build/CI; o sinal continua visível).
      "react-hooks/set-state-in-effect": "warn",
      // `_`-prefixado = intencionalmente não usado
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
