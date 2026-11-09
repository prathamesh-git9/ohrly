import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Relative base so the same build works at a domain root and under /ohrly/ on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { include: ['tests/unit/**/*.test.ts'] },
});
