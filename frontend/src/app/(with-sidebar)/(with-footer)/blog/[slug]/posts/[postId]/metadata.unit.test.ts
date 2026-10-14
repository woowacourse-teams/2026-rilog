import { describe, expect, it } from 'vitest';

import { createPostDetailFixture } from '@/test/fixtures/post-detail';

import { createPostMetadata } from './metadata';

const post = createPostDetailFixture();

describe('createPostMetadata', () => {
	it('공식 콘텐츠의 제공된 요약을 검색·공유 설명에 사용하고 작성자는 유지한다', () => {
		const metadata = createPostMetadata({
			...post,
			postType: 'ENTERPRISE_SPOTLIGHT',
			description: '공식 콘텐츠의 요약',
			source: { name: '외부 기업', profileImageUrl: null },
		});

		expect(metadata.description).toBe('공식 콘텐츠의 요약');
		expect(metadata.openGraph).toMatchObject({ description: '공식 콘텐츠의 요약', authors: [post.author.nickname] });
		expect(metadata.twitter).toMatchObject({ description: '공식 콘텐츠의 요약' });
	});

	it('요약이 없는 공식 콘텐츠에는 기존 본문 설명을 사용한다', () => {
		const metadata = createPostMetadata({ ...post, postType: 'DAILY_HEADLINES', description: null });
		expect(metadata.description).toBe(createPostMetadata(post).description);
	});

	it('일반 글의 검색 설명에는 기존 본문 발췌를 사용한다', () => {
		const metadata = createPostMetadata({ ...post, description: '사용하지 않을 공식 요약' });
		expect(metadata.description).toBe(createPostMetadata(post).description);
		expect(metadata.description).not.toBe('사용하지 않을 공식 요약');
	});
});
