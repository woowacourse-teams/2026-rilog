import { NextResponse } from 'next/server';

import { deliverSentrySlackAlert } from '@/shared/error-tracking/sentry-slack-delivery';
import { parseSentrySlackSummary } from '@/shared/error-tracking/sentry-slack-summary';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
	const origin = request.headers.get('origin');
	const site = process.env.NEXT_PUBLIC_SITE_URL;
	if (!origin || !site || origin !== new URL(site).origin) return new NextResponse(null, { status: 403 });
	if (!request.headers.get('content-type')?.startsWith('application/json'))
		return new NextResponse(null, { status: 415 });
	if (Number(request.headers.get('content-length') ?? 0) > 4096) return new NextResponse(null, { status: 413 });
	let data: unknown;
	try {
		const body = await request.text();
		if (body.length > 4096) return new NextResponse(null, { status: 413 });
		data = JSON.parse(body);
	} catch {
		return new NextResponse(null, { status: 400 });
	}
	const summary = parseSentrySlackSummary(data);
	if (!summary) return new NextResponse(null, { status: 400 });
	const source = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
	const delivered = await deliverSentrySlackAlert(summary, source);
	return new NextResponse(null, { status: delivered ? 204 : 502 });
}
