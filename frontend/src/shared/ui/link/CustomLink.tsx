import Link from 'next/link';

import type { LinkProps } from 'next/link';
import type { ComponentPropsWithRef } from 'react';

type CustomLinkProps = LinkProps & Omit<ComponentPropsWithRef<'a'>, 'href'>;

/**
 * next/link의 Link 컴포넌트를 래핑한 컴포넌트입니다.
 * prefetch 기본값을 false로 고정해 프로덕션 환경에서 발생하는
 * 뷰포트 기반 자동 prefetch로 인한 무한 요청을 방지합니다.
 *
 * hover 시 prefetch는 여전히 동작하므로 사용자 경험에는 영향이 없습니다.
 */
export default function CustomLink({ prefetch = false, ...props }: CustomLinkProps) {
	return <Link prefetch={prefetch} {...props} />;
}
