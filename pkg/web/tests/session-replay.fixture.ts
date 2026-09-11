import { test as base, expect } from 'playwright/test';
import { build } from 'vite';

type BuildOutput = {
	output: Array<
		{ type: 'asset' } | { type: 'chunk'; code: string; isEntry: boolean }
	>;
};

const collectorUrl = process.env.PLAYWRIGHT_SESSION_REPLAY_URL;

let browserBundle: Promise<string> | undefined;

function buildBrowserBundle(): Promise<string> {
	if (!browserBundle) {
		browserBundle = build({
			configFile: false,
			logLevel: 'silent',
			build: {
				write: false,
				minify: true,
				rollupOptions: {
					input: new URL('./session-replay.init.ts', import.meta.url).pathname,
					output: {
						format: 'iife',
					},
				},
			},
		}).then((result) => {
			const output = (result as BuildOutput).output;
			const chunk = output.find(
				(item): item is Extract<(typeof output)[number], { type: 'chunk' }> =>
					item.type === 'chunk' && item.isEntry,
			);

			if (!chunk) {
				throw new Error('Could not build the Session Replay browser bundle');
			}

			return chunk.code;
		});
	}

	return browserBundle;
}

export const test = base.extend<{ sessionReplay: undefined }>({
	sessionReplay: [
		async ({ context }, use, testInfo) => {
			if (!collectorUrl) {
				await use();
				return;
			}

			const config = {
				url: collectorUrl,
				appName:
					process.env.PLAYWRIGHT_SESSION_REPLAY_APP_NAME ??
					'QuickPizza Playwright',
				appVersion: process.env.GITHUB_SHA ?? 'local',
				environment: process.env.CI ? 'ci' : 'local',
				namespace: 'quickpizza-e2e',
			};
			const bundle = await buildBrowserBundle();
			let successfulUploads = 0;

			context.on('response', (response) => {
				if (
					response.url().startsWith(collectorUrl) &&
					response.request().method() === 'POST' &&
					response.ok()
				) {
					successfulUploads += 1;
				}
			});

			await context.addInitScript({
				content: `globalThis.__PLAYWRIGHT_SESSION_REPLAY_CONFIG__ = ${JSON.stringify(config)};\n${bundle}`,
			});

			await use();

			// Replay events are buffered in the browser, so leave the page alive long
			// enough for the final chunk to reach the collector before teardown.
			await new Promise((resolve) => setTimeout(resolve, 5_000));
			if (successfulUploads === 0) {
				testInfo.annotations.push({
					type: 'session-replay',
					description: 'No successful collector upload was observed',
				});
				console.warn(
					'Session Replay enabled, but no successful collector upload was observed',
				);
			} else {
				console.log(`Session Replay collector uploads: ${successfulUploads}`);
			}
		},
		{ auto: true },
	],
});

export { expect };
