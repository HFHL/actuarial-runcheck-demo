import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./test',
  testMatch:'**/*.spec.js',
  use:{ baseURL:'http://127.0.0.1:4175', viewport:{width:1440,height:900}, channel:'chrome' },
  webServer:{ command:'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort', url:'http://127.0.0.1:4175', reuseExistingServer:!process.env.CI }
});
