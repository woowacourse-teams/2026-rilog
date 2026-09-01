'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useBlogHomeIndex } from '@/features/blog-home-index/hooks/use-blog-home-index';

interface BlogHomeIndexRecoveryProps {
	slug: string;
}

export default function BlogHomeIndexRecovery({ slug }: BlogHomeIndexRecoveryProps) {
	const router = useRouter();
	const { index } = useBlogHomeIndex({ slug, initialRequestFailed: true });

	useEffect(() => {
		if (index !== undefined) {
			router.refresh();
		}
	}, [index, router]);

	return null;
}
