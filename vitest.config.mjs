import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.mjs'],
    watchExclude: ['**/coverage/**', '**/governance/**', '**/manifests/**', '**/tmp/**', '**/tmp-e2e/**'],
    hookTimeout: 30000,
    testTimeout: 60000,
    snapshotFormat: { printBasicPrototype: false },
    // Coverage collected via c8 CLI to include subprocesses
  }
});
