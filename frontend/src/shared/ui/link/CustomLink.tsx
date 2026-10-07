'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { LinkProps } from 'next/link';
import type { ComponentPropsWithRef, MouseEventHandler } from 'react';

type PrefetchType = 'none' | 'hover' | 'viewport' | 'full';

interface CustomLinkProps extends Omit<LinkProps, 'prefetch'>, Omit<ComponentPropsWithRef<'a'>, 'href'> {
	prefetchType?: PrefetchType;
}

function getPrefetch(prefetchType: PrefetchType, isHoverPrefetchActive: boolean): LinkProps['prefetch'] {
	switch (prefetchType) {
		case 'none':
			return false;
		case 'hover':
			return isHoverPrefetchActive ? null : false;
		case 'viewport':
			return null;
		case 'full':
			return true;
	}
}

/**
 * next/link의 Link 컴포넌트를 래핑한 컴포넌트입니다.
 * 기본적으로 prefetch를 비활성화하고, 필요한 링크만 hover, viewport 또는
 * 전체 route 단위로 prefetch할 수 있습니다.
 */
export default function CustomLink({ prefetchType = 'none', onMouseEnter, ...props }: CustomLinkProps) {
	const [isHoverPrefetchActive, setIsHoverPrefetchActive] = useState(false);
	const prefetch = getPrefetch(prefetchType, isHoverPrefetchActive);

	const handleMouseEnter: MouseEventHandler<HTMLAnchorElement> = (event) => {
		onMouseEnter?.(event);
		if (prefetchType === 'hover') setIsHoverPrefetchActive(true);
	};

	return <Link prefetch={prefetch} onMouseEnter={handleMouseEnter} {...props} />;
}
