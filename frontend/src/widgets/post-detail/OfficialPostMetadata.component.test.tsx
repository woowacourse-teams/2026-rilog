import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import OfficialPostMetadata from './OfficialPostMetadata';

describe('OfficialPostMetadata', () => {
	it('공식 콘텐츠의 요약과 출처를 작성자 링크 없이 표시한다', () => {
		render(
			<OfficialPostMetadata
				post={{
					postType: 'ENTERPRISE_SPOTLIGHT',
					description: '오늘의 기술 요약',
					source: { name: '기업 블로그', profileImageUrl: 'https://images.rilog.test/source.png' },
				}}
			/>,
		);

		expect(screen.getByRole('region', { name: '공식 콘텐츠 정보' })).toHaveTextContent('오늘의 기술 요약');
		expect(screen.getByText('출처')).toBeInTheDocument();
		expect(screen.getByText('기업 블로그')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '기업 블로그 출처 이미지' }).querySelector('img')).toHaveAttribute(
			'src',
			'https://images.rilog.test/source.png',
		);
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('출처가 없는 뉴스는 설명만 표시한다', () => {
		render(<OfficialPostMetadata post={{ postType: 'DAILY_HEADLINES', description: '뉴스 요약', source: null }} />);

		expect(screen.getByText('뉴스 요약')).toBeInTheDocument();
		expect(screen.queryByText('출처')).not.toBeInTheDocument();
	});

	it('설명과 출처 이미지가 없는 공식 글은 출처 이름과 대체 이미지를 표시한다', () => {
		render(
			<OfficialPostMetadata
				post={{ postType: 'PERSONAL_SPOTLIGHT', description: null, source: { name: '개발자', profileImageUrl: null } }}
			/>,
		);

		expect(screen.getByText('개발자')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '개발자 출처 이미지' })).toHaveTextContent('개');
	});

	it.each(['STANDARD', 'DAILY_HEADLINES'] as const)(
		'설명과 출처가 없는 %s 글은 추가 영역을 표시하지 않는다',
		(postType) => {
			render(<OfficialPostMetadata post={{ postType, description: null, source: null }} />);
			expect(screen.queryByRole('region', { name: '공식 콘텐츠 정보' })).not.toBeInTheDocument();
		},
	);
});
