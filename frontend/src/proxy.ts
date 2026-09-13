import { type NextRequest, NextResponse } from 'next/server';

import {
	PROXY_AUTH_REQUIRED_NOTICE,
	PROXY_NOTICE_QUERY_KEY,
	PROXY_SESSION_COOKIE_NAME,
	PROXY_SESSION_COOKIE_VALUE,
} from '@/shared/api/proxy/constants';
import { APP_ROUTES } from '@/shared/routes/app-routes';

export function proxy(request: NextRequest) {
	const proxySession = request.cookies.get(PROXY_SESSION_COOKIE_NAME)?.value;

	if (proxySession === PROXY_SESSION_COOKIE_VALUE) {
		return NextResponse.next();
	}

	const redirectUrl = new URL(APP_ROUTES.feeds, request.url);
	redirectUrl.searchParams.set(PROXY_NOTICE_QUERY_KEY, PROXY_AUTH_REQUIRED_NOTICE);

	return NextResponse.redirect(redirectUrl);
}

export const config = {
	matcher: ['/write/:path*', '/colog/create/:path*', '/:slug/settings/:path*', '/sign-up/:path*'],
};
