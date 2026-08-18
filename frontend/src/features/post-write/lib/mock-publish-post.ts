import type { PublishPost } from '../model/post-publication';

const MOCK_PUBLISH_DELAY_MS = 600;

export const mockPublishPost: PublishPost = async () => {
	await new Promise((resolve) => window.setTimeout(resolve, MOCK_PUBLISH_DELAY_MS));

	if (process.env.NEXT_PUBLIC_MOCK_PUBLISH_FAILURE === 'true') {
		throw new Error('Mock publish failed');
	}

	return {
		postId: `mock-${crypto.randomUUID()}`,
		slug: 'rilog',
	};
};
