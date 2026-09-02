import { describe, expect, it } from 'vitest';

import type { PostDetailResponse } from '@/shared/api/posts/types';

import { mapPostDetailResponse } from './map-post-detail-response';

describe('mapPostDetailResponse', () => {
	it('개인 블로그(RILOG) 상세 응답을 PostDetail 도메인 모델로 올바르게 매핑한다', () => {
		const response: PostDetailResponse = {
			title: 'Spring 트랜잭션 정리',
			content: [{ id: '1', type: 'paragraph', props: {}, content: [], children: [] }],
			publishedAt: '2026-08-17T04:30:00',
			thumbnailImageUrl: null,
			category: 'TECH',
			chapter: null,
			author: {
				userId: 7,
				nickname: '파라디',
				slug: 'jetproc',
				profileImageUrl: null,
			},
			owner: {
				type: 'RILOG',
				blogId: 3,
				slug: 'jetproc',
				name: '파라디',
				profileImageUrl: null,
			},
			viewerPermissions: {
				canEdit: false,
				canDelete: false,
			},
		};

		const postDetail = mapPostDetailResponse(response, 42);

		expect(postDetail.id).toBe(42);
		expect(postDetail.title).toBe('Spring 트랜잭션 정리');
		expect(postDetail.author).toEqual({
			id: 7,
			nickname: '파라디',
			slug: 'jetproc',
			profileImageUrl: null,
		});
		expect(postDetail.blog.type).toBe('RILOG');
		expect(postDetail.blog.name).toBe('파라디');
		if (postDetail.blog.type === 'RILOG') {
			expect(postDetail.blog.owner).toEqual(postDetail.author);
		}
		expect(postDetail.category).toBe('IT');
		expect(postDetail.viewerPermissions).toEqual({ canEdit: false, canDelete: false });
	});

	it('팀 블로그(COLOG) 상세 응답을 PostDetail 도메인 모델로 올바르게 매핑한다', () => {
		const response: PostDetailResponse = {
			title: '리로그 개발 회고',
			content: [],
			publishedAt: '2026-08-17T04:40:00',
			thumbnailImageUrl: 'https://images.rilog.test/cover.png',
			category: 'DAILY',
			chapter: null,
			author: {
				userId: 7,
				nickname: '파라디',
				slug: 'jetproc',
				profileImageUrl: null,
			},
			owner: {
				type: 'COLOG',
				blogId: 5,
				slug: 'rilog',
				name: 'Rilog',
				profileImageUrl: 'https://images.rilog.test/team.png',
				coverImageUrl: null,
				memberCount: 8,
				postCount: 42,
			},
			viewerPermissions: {
				canEdit: true,
				canDelete: true,
			},
		};

		const postDetail = mapPostDetailResponse(response, 100);

		expect(postDetail.id).toBe(100);
		expect(postDetail.title).toBe('리로그 개발 회고');
		expect(postDetail.thumbnailUrl).toBe('https://images.rilog.test/cover.png');
		expect(postDetail.blog.type).toBe('COLOG');
		if (postDetail.blog.type === 'COLOG') {
			expect(postDetail.blog.profileImageUrl).toBe('https://images.rilog.test/team.png');
			expect(postDetail.blog.memberCount).toBe(8);
			expect(postDetail.blog.postCount).toBe(42);
		}
		expect(postDetail.category).toBe('DAILY');
		expect(postDetail.viewerPermissions).toEqual({ canEdit: true, canDelete: true });
	});
});
