import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	enabled: isProduction || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
	environment: isProduction ? 'prod' : 'local',
	sendDefaultPii: false,
	tracesSampleRate: 1,
});
