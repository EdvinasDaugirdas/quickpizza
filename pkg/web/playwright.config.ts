import { defineConfig, devices } from '@playwright/test';
import { installFaro } from './tests/session-replay';

installFaro({
	collectorUrl: process.env.PLAYWRIGHT_SESSION_REPLAY_URL,
});

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [['html'], ['./tests/session-replay.reporter.ts']],
	use: {
		baseURL: 'http://127.0.0.1:3333',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'make -C ../.. build && ../../bin/quickpizza',
		url: 'http://127.0.0.1:3333',
		reuseExistingServer: !!process.env.CI,
	},
});
