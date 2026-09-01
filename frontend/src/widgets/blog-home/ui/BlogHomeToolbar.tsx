'use client';

import { useState } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';
import Button from '@/shared/ui/button/Button';
import BottomSheet from '@/shared/ui/modal/BottomSheet';

import BlogHomeNavigation from './BlogHomeNavigation';
import styles from './BlogHomeToolbar.module.css';

interface BlogHomeToolbarProps {
	blogType: BlogType;
	slug: string;
	filter: PublicBlogPostsFilter;
	initialIndexRequestFailed?: boolean;
}

export default function BlogHomeToolbar({
	blogType,
	slug,
	filter,
	initialIndexRequestFailed = false,
}: BlogHomeToolbarProps) {
	const [isNavigationOpen, setIsNavigationOpen] = useState(false);

	return (
		<div className={`${styles.mobileNavTrigger} mb-8`}>
			<Button
				variant="secondary"
				size="md"
				fullWidth
				aria-haspopup="dialog"
				className="h-11! justify-start!"
				onClick={() => setIsNavigationOpen(true)}
			>
				인덱스 보기
			</Button>

			<BottomSheet
				open={isNavigationOpen}
				title={<span className="sr-only">인덱스</span>}
				closeButtonLabel="인덱스 닫기"
				onClose={() => setIsNavigationOpen(false)}
			>
				<BlogHomeNavigation
					blogType={blogType}
					slug={slug}
					filter={filter}
					initialIndexRequestFailed={initialIndexRequestFailed}
					onNavigate={() => setIsNavigationOpen(false)}
				/>
			</BottomSheet>
		</div>
	);
}
