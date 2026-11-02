import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Retired public SDK relay: stale clients must never trigger Slack delivery. */
export function POST(): NextResponse {
	return new NextResponse(null, { status: 410 });
}
