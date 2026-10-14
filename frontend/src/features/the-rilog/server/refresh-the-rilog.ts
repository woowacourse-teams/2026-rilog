import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';
import { APP_ROUTES } from '@/shared/routes/app-routes';

import { captureTheRilogSnapshot } from './the-rilog-snapshot';
import { writeTheRilogSnapshot } from './the-rilog-snapshot-store';

const digest = (value: string) => createHash('sha256').update(value).digest();
const json = (body: unknown, status: number) =>
	Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// The current PM2 deployment has one process; reject overlapping captures within it.
let isRefreshing = false;

export async function refreshTheRilog(request: Request): Promise<Response> {
	const secret = process.env.THE_RILOG_REVALIDATION_SECRET;
	if (!secret) return json({ error: 'Refresh is not configured.' }, 503);
	if (!timingSafeEqual(digest(request.headers.get('authorization') ?? ''), digest(`Bearer ${secret}`))) {
		return json({ error: 'Unauthorized.' }, 401);
	}
	if (isRefreshing) return json({ error: 'Refresh is already in progress.' }, 409);

	isRefreshing = true;
	try {
		const snapshot = await captureTheRilogSnapshot();
		// Failed capture/validation never touches either the saved input or the page cache.
		await writeTheRilogSnapshot(snapshot);
		revalidatePath(APP_ROUTES.theRilog);
		return json({ checksum: snapshot.checksum, capturedAt: snapshot.capturedAt }, 202);
	} catch (error) {
		apiErrorReporter.report(error, { operation: 'refresh the rilog snapshot' });
		return json({ error: 'The Rilog refresh failed.' }, 503);
	} finally {
		isRefreshing = false;
	}
}
