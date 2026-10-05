import { initializeSentry } from '@/shared/error-tracking/initialize-sentry';
import { deliverSentrySlackAlert } from '@/shared/error-tracking/sentry-slack-delivery';

initializeSentry({
	tracesSampleRate: 1,
	onSlackAlert: (summary) => {
		void deliverSentrySlackAlert(summary, 'server');
	},
});
