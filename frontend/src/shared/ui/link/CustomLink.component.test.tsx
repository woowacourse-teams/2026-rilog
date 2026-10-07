import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { LinkProps } from 'next/link';
import type { ComponentPropsWithRef } from 'react';

import CustomLink from './CustomLink';

interface MockNextLinkProps extends Omit<ComponentPropsWithRef<'a'>, 'href'> {
	href: string;
	prefetch?: LinkProps['prefetch'];
}

vi.mock('next/link', () => ({
	default: forwardRef<HTMLAnchorElement, MockNextLinkProps>(function MockNextLink({ href, prefetch, ...props }, ref) {
		return <a ref={ref} href={href} data-prefetch={String(prefetch)} {...props} />;
	}),
}));

describe('CustomLink', () => {
	it.each([
		{ prefetchType: undefined, expectedPrefetch: 'false' },
		{ prefetchType: 'none' as const, expectedPrefetch: 'false' },
		{ prefetchType: 'viewport' as const, expectedPrefetch: 'null' },
		{ prefetchType: 'full' as const, expectedPrefetch: 'true' },
	])('prefetchType=$prefetchType이면 prefetch=$expectedPrefetch를 사용한다', ({ prefetchType, expectedPrefetch }) => {
		render(
			<CustomLink href="/destination" prefetchType={prefetchType}>
				이동
			</CustomLink>,
		);

		expect(screen.getByRole('link', { name: '이동' })).toHaveAttribute('data-prefetch', expectedPrefetch);
	});

	it('hover일 때 처음 포인터가 올라가면 prefetch를 활성화하고 사용자 이벤트를 보존한다', async () => {
		const user = userEvent.setup();
		const handleMouseEnter = vi.fn();

		render(
			<CustomLink href="/destination" prefetchType="hover" onMouseEnter={handleMouseEnter}>
				이동
			</CustomLink>,
		);

		const link = screen.getByRole('link', { name: '이동' });
		expect(link).toHaveAttribute('data-prefetch', 'false');

		await user.hover(link);
		expect(link).toHaveAttribute('data-prefetch', 'null');
		expect(handleMouseEnter).toHaveBeenCalledOnce();

		await user.unhover(link);
		expect(link).toHaveAttribute('data-prefetch', 'null');
	});
});
