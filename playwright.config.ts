import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  timeout: 60_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } }
  ],
  expect: { toMatchSnapshot: { maxDiffPixelRatio: 0.005 } },
});
