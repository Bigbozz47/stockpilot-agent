import { defineConfig, devices } from '@playwright/test';

/**
 * StockPilot 3-minute cinematic demo — UNP Mart Monitoring Dashboard, 1920x1080.
 * USE_MOCK_AGENT=true: deterministic, zero-cost, offline-capable.
 * Wall-clock choreography targets 175-180s; config timeout is a 240s safety cap.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /e2e-demo-recording\.spec\.ts|probe\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 240000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    colorScheme: 'light',
    viewport: { width: 1920, height: 1080 },
    video: { mode: 'on', size: { width: 1920, height: 1080 } },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'stage-recording',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      USE_MOCK_AGENT: process.env.USE_MOCK_AGENT ?? 'true',
      PORT: '3000',
    },
  },
});
