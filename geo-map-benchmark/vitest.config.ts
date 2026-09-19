import { defineConfig } from 'vitest/config';

/**
 * Vitest is used only for React component-rendering tests (`*.test.tsx`),
 * which need a JSX transform and a DOM. Pure-logic tests (`*.test.ts`)
 * keep using Node's built-in test runner (`npm run test:unit`) - see
 * DECISION_RECORD.md section 6 for why two runners are used.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
  },
});
