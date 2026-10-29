export interface SentryEnvironmentInput {
	environment?: string;
	enabled?: string;
	dsn?: string;
	siteUrl?: string;
	browserOrigin?: string;
}

function isProductionOrigin(value: string | undefined): boolean {
	try {
		return value !== undefined && new URL(value).origin === 'https://www.rilog.kr';
	} catch {
		return false;
	}
}

/** NODE_ENV describes the build mode, not where the application is deployed. */
export function resolveSentryEnvironment(input: SentryEnvironmentInput): {
	environment: 'prod' | 'preview' | 'local' | 'smoke';
	enabled: boolean;
} {
	const environment = input.environment;
	if (environment !== 'prod' && environment !== 'preview' && environment !== 'local' && environment !== 'smoke') {
		return { environment: 'local', enabled: false };
	}
	const isProduction = environment === 'prod';
	const hasProductionOrigin =
		isProductionOrigin(input.siteUrl) && (input.browserOrigin === undefined || isProductionOrigin(input.browserOrigin));
	return {
		environment,
		enabled:
			Boolean(input.dsn?.trim()) &&
			input.enabled !== 'false' &&
			(isProduction ? hasProductionOrigin : input.enabled === 'true'),
	};
}
