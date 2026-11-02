import { initializeSentry } from '@/shared/error-tracking/initialize-sentry';

initializeSentry({ runtime: 'node', tracesSampleRate: 1 });
