import { ReplayInstrumentation } from '@grafana/faro-instrumentation-replay';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';

const config = globalThis.__PLAYWRIGHT_SESSION_REPLAY_CONFIG__;

// Playwright also evaluates init scripts in the initial empty document. Starting
// rrweb there can crash the target before the first real navigation.
if (config && window.location.href !== 'about:blank') {
	initializeFaro({
		url: config.url,
		app: {
			name: config.appName,
			version: config.appVersion,
			environment: config.environment,
			namespace: config.namespace,
		},
		sessionTracking: {
			samplingRate: 1,
		},
		instrumentations: [
			...getWebInstrumentations(),
			new ReplayInstrumentation({ samplingRate: 1 }),
		],
	});
}
