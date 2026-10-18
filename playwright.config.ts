import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/reset-rate-limits.ts',
  timeout: 180_000,
  workers: 1,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    // Uses the locally installed Google Chrome; no browser download needed.
    channel: 'chrome',
    headless: true,
    viewport: { width: 1366, height: 860 },
  },
});
