import { type NextRequest, NextResponse } from 'next/server';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

export function proxy(request: NextRequest) {
	const proxySession = request.cookies.get(PROXY_SESSION_COOKIE_NAME)?.value;

	if (proxySession === PROXY_SESSION_COOKIE_VALUE) {
		return NextResponse.next();
	}

	return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
	matcher: ['/write/:path*', '/co-logs/create/:path*', '/:slug/settings/:path*'],
};
