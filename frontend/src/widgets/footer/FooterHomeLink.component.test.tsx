import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import FooterHomeLink from './FooterHomeLink';

const { navigation, preventNavigation } = vi.hoisted(() => ({
	navigation: {
		pathname: '/@jetproc',
	},
	preventNavigation: vi.fn(),
}));
const scrollToMock = vi.fn();

vi.mock('next/navigation', () => ({
	usePathname: () => navigation.pathname,
}));

vi.mock('@/shared/ui/link/CustomLink', () => ({
	default: ({
		href,
		children,
		onNavigate,
		...props
	}: {
		href: string;
		children: ReactNode;
		onNavigate?: (event: { preventDefault: () => void }) => void;
	}) => (
		<a
			href={href}
			{...props}
			onClick={(event) => {
				event.preventDefault();
				if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)
					onNavigate?.({ preventDefault: preventNavigation });
			}}
		>
			{children}
		</a>
	),
}));

describe('FooterHomeLink', () => {
	beforeEach(() => {
		navigation.pathname = '/@jetproc';
		preventNavigation.mockReset();
		scrollToMock.mockReset();
		vi.stubGlobal('scrollTo', scrollToMock);
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: false })),
		);
	});

	it('다른 페이지에서는 떠나는 페이지를 스크롤하지 않고 기본 링크 이동에 맡긴다', () => {
		render(<FooterHomeLink className="test">Rilog.</FooterHomeLink>);

		fireEvent.click(screen.getByRole('link', { name: 'Rilog 홈' }));

		expect(preventNavigation).not.toHaveBeenCalled();
		expect(scrollToMock).not.toHaveBeenCalled();
	});

	it('이미 피드에 있으면 같은 경로에서 최상단으로만 이동한다', () => {
		navigation.pathname = '/feeds';
		render(<FooterHomeLink className="test">Rilog.</FooterHomeLink>);

		fireEvent.click(screen.getByRole('link', { name: 'Rilog 홈' }));

		expect(preventNavigation).toHaveBeenCalledOnce();
		expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
	});

	it.each(['ctrlKey', 'metaKey', 'shiftKey', 'altKey'])(
		'%s 클릭은 현재 페이지를 이동하거나 스크롤하지 않는다',
		(modifier) => {
			render(<FooterHomeLink className="test">Rilog.</FooterHomeLink>);

			fireEvent.click(screen.getByRole('link', { name: 'Rilog 홈' }), { [modifier]: true });

			expect(preventNavigation).not.toHaveBeenCalled();
			expect(scrollToMock).not.toHaveBeenCalled();
		},
	);

	it('모션 감소 설정에서는 즉시 최상단으로 이동한다', () => {
		navigation.pathname = '/feeds';
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		render(<FooterHomeLink className="test">Rilog.</FooterHomeLink>);

		fireEvent.click(screen.getByRole('link', { name: 'Rilog 홈' }));

		expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
	});
});
