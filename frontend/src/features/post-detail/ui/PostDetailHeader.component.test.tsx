import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PostDetailHeader from './PostDetailHeader';

vi.mock('./PostDetailActions', () => ({
	default: function MockPostDetailActions() {
		return <span>수정 삭제</span>;
	},
}));

const AUTHOR = {
	id: 7,
	nickname: '리로거',
	slug: 'riloger',
	profileImageUrl: null,
};

describe('PostDetailHeader', () => {
	it('제목, 저자, 카테고리, 챕터와 발행일을 하나의 헤더에 표시한다', () => {
		render(
			<PostDetailHeader
				postId={31}
				slug="riloger"
				title="컴포넌트 시스템, 이렇게 도입했어요"
				publishedAt="2026-09-08T10:00:00+09:00"
				category="IT"
				chapter={{ id: 3, name: '프론트엔드', order: 1 }}
				author={AUTHOR}
				viewerPermissions={{ canEdit: true, canDelete: true }}
			/>,
		);

		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('컴포넌트 시스템, 이렇게 도입했어요');
		// TODO: 게시글 상세 API에 description 필드가 추가되면 표시 검증을 다시 활성화한다.
		// expect(screen.getByText('프로젝트의 컴포넌트 시스템을 개선한 과정을 소개합니다.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /리로거/ })).toHaveAttribute('href', '/@riloger');
		expect(screen.getByText('기술')).toBeInTheDocument();
		expect(screen.getByText('프론트엔드')).toBeInTheDocument();
		expect(screen.getByText('2026년 9월 8일')).toBeInTheDocument();
	});

	it('챕터가 없으면 해당 정보를 생략한다', () => {
		render(
			<PostDetailHeader
				postId={31}
				slug="riloger"
				title="짧은 글"
				publishedAt="2026-09-08T10:00:00+09:00"
				category="DAILY"
				chapter={null}
				author={AUTHOR}
				viewerPermissions={{ canEdit: false, canDelete: false }}
			/>,
		);

		expect(screen.getByText('일상')).toBeInTheDocument();
		expect(screen.queryByText('프론트엔드')).not.toBeInTheDocument();
	});

	it('publisher를 제목 위에 표시한다', () => {
		render(
			<PostDetailHeader
				publisher={<span>리로그 팀</span>}
				postId={31}
				slug="rilog-team"
				title="팀이 함께 작성한 글"
				publishedAt="2026-09-08T10:00:00+09:00"
				category="IT"
				chapter={null}
				author={AUTHOR}
				viewerPermissions={{ canEdit: false, canDelete: false }}
			/>,
		);

		const publisher = screen.getByText('리로그 팀');
		const title = screen.getByRole('heading', { level: 1, name: '팀이 함께 작성한 글' });

		expect(publisher.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});
