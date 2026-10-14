import 'server-only';

import { mapTheRilogContent } from '@/features/the-rilog/lib/map-the-rilog-content';

import { readTheRilogSnapshot } from './the-rilog-snapshot-store';

export async function loadTheRilogContent() {
	const snapshot = await readTheRilogSnapshot();
	return {
		...mapTheRilogContent(snapshot.data, snapshot.newsContent),
		inputChecksum: snapshot.checksum,
		capturedAt: snapshot.capturedAt,
	};
}
