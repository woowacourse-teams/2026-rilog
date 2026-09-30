'use client';

import { useSearchParams } from 'next/navigation';

import type { ChangeEvent } from 'react';

import { FEED_ORDER_OPTIONS, type FeedOrder } from '@/domains/post/model/post';
import { navigateFeedFilter } from '@/features/post-feed/lib/navigate-feed-filter';
import { APP_ROUTES } from '@/shared/routes/app-routes';

interface OrderSelectProps {
	value: FeedOrder;
}

export default function OrderSelect({ value }: OrderSelectProps) {
	const searchParams = useSearchParams();

	const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
		const nextSearchParams = new URLSearchParams(searchParams.toString());
		nextSearchParams.set('order', e.currentTarget.value);
		navigateFeedFilter(`${APP_ROUTES.feeds}?${nextSearchParams.toString()}`);
	};

	return (
		<select
			value={value}
			onChange={handleChange}
			className="native-select !min-h-8 !w-auto !rounded-none !border-0 !bg-transparent !px-1 text-body-3! font-medium transition-colors! hover:!bg-transparent hover:!text-focus-ring"
		>
			{FEED_ORDER_OPTIONS.map((option) => (
				<option key={option}>{option}</option>
			))}
		</select>
	);
}
