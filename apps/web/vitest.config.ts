import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Testes unitários da lógica pura do front (lib/*). Ambiente node (sem DOM):
// as funções testadas não tocam React/browser.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
