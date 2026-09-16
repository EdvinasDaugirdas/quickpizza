import { ReplayInstrumentation } from '@grafana/faro-instrumentation-replay';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';

const config = globalThis.__PLAYWRIGHT_SESSION_REPLAY_CONFIG__;

// Init scripts also run in empty/internal documents. Only start Faro for real
// web documents; rrweb must not initialize in the browser's initial blank page.
if (config && /^https?:$/.test(window.location.protocol)) {
	initializeFaro({
		url: config.url,
		isolate: true,
		preventGlobalExposure: true,
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
			new ReplayInstrumentation({
				samplingRate: 1,
				maskAllInputs: false,
				maskInputOptions: {},
				maskTextSelector: undefined,
				inlineStylesheet: true,
				inlineImages: true,
				collectFonts: true,
			}),
		],
	});
}
