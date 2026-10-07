import { initializeSentry } from '@/shared/error-tracking/initialize-sentry';
import { notifySlackFromEdge } from '@/shared/error-tracking/sentry-slack-alert';

initializeSentry({ tracesSampleRate: 1, onSlackAlert: notifySlackFromEdge });
