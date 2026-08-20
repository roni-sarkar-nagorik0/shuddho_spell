import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  reporter: 'list',
  use: { baseURL: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
