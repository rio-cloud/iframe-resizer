import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './test/browser',
    use: {
        baseURL: 'http://127.0.0.1:4173',
        browserName: 'chromium',
        headless: true,
    },
    webServer: [
        {
            command: 'npm run test:server -- --port 4173',
            reuseExistingServer: !process.env.CI,
            url: 'http://127.0.0.1:4173/test/browser/parent.html',
        },
        {
            command: 'npm run test:server -- --port 4174',
            reuseExistingServer: !process.env.CI,
            url: 'http://127.0.0.1:4174/test/browser/child.html',
        },
    ],
});
