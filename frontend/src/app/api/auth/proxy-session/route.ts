import { NextResponse } from 'next/server';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

const createEmptyResponse = () => new NextResponse(null, { status: 204 });

export const POST = () => {
	const response = createEmptyResponse();
	response.cookies.set(PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	});

	return response;
};

export const DELETE = () => {
	const response = createEmptyResponse();
	response.cookies.delete({
		name: PROXY_SESSION_COOKIE_NAME,
		path: '/',
	});

	return response;
};
