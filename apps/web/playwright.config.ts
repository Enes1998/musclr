import { defineConfig, devices } from '@playwright/test';

// Web E2E. Run: `pnpm --filter web exec playwright test` (after `npx playwright install`).
// Boots the dev server and exercises the core flows headlessly.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    ...devices['Desktop Chrome'],
    // Software WebGL (SwiftShader) so the three.js heatmap actually renders in headless CI.
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
