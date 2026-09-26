import * as Sentry from '@sentry/nextjs';
import { sanitizeApiErrorEvent } from '@/shared/error-tracking/sentry-api-error';
import { logNonProductionWarning } from '@/shared/utils/non-production-console';

const isProduction = process.env.NODE_ENV === 'production';

try {
	Sentry.init({
		dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
		enabled: isProduction || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
		environment: isProduction ? 'prod' : 'local',
		sendDefaultPii: false,
		beforeSend: sanitizeApiErrorEvent,
		tracesSampleRate: 1,
	});
} catch {
	logNonProductionWarning('Sentry initialization failed.');
}
