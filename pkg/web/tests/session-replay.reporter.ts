import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export default class SessionReplayReporter implements Reporter {
	private outputFile = process.env.CI
		? '/tmp/playwright-session-replays.jsonl'
		: undefined;

	onBegin() {
		if (this.outputFile) {
			writeFileSync(this.outputFile, '');
		}
	}

	onTestEnd(test: TestCase, result: TestResult) {
		if (!this.outputFile) {
			return;
		}

		const sessionIds = new Set<string>();
		for (const attachment of result.attachments) {
			if (attachment.name !== 'session-replay') {
				continue;
			}
			const body =
				attachment.body ??
				(attachment.path ? readFileSync(attachment.path) : undefined);
			if (body) {
				const replay = JSON.parse(body.toString()) as { sessionIds: string[] };
				for (const sessionId of replay.sessionIds) {
					sessionIds.add(sessionId);
				}
			}
		}
		if (sessionIds.size > 0) {
			appendFileSync(
				this.outputFile,
				`${JSON.stringify({
					test: test.title,
					project: test.parent.project()?.name,
					retry: result.retry,
					status: result.status,
					sessionIds: [...sessionIds],
				})}\n`,
			);
		}
	}
}
