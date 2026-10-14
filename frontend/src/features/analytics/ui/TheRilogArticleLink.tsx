'use client';

import { useContext, useRef } from 'react';

import type { ComponentProps, MouseEvent } from 'react';

import { recordPostDetailEntryContext } from '@/features/analytics/lib/post-detail-entry-context';
import type { TheRilogAttribution, TheRilogContentType } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import CustomLink from '@/shared/ui/link/CustomLink';

import { THE_RILOG_VISIT_CONTEXT } from './the-rilog-visit-context';

type TheRilogArticleLinkProps = Omit<ComponentProps<typeof CustomLink>, 'onNavigate'> & {
	postId: number;
	contentType: TheRilogContentType;
	position: number;
	headlineId?: string;
};

export default function TheRilogArticleLink({
	postId,
	contentType,
	position,
	headlineId,
	onClick,
	onAuxClick,
	...props
}: TheRilogArticleLinkProps) {
	const getVisitId = useContext(THE_RILOG_VISIT_CONTEXT);
	const pendingAttributionRef = useRef<TheRilogAttribution | null>(null);
	const trackClick = (event: MouseEvent<HTMLAnchorElement>) => {
		pendingAttributionRef.current = null;
		if (event.defaultPrevented || getVisitId === null || (event.button !== 0 && event.button !== 1)) return;
		const target = event.currentTarget.target;
		const navigationType =
			event.button === 1 || event.ctrlKey || event.metaKey || event.shiftKey || (target !== '' && target !== '_self')
				? 'new_tab'
				: 'same_tab';
		const attribution: TheRilogAttribution = {
			theRilogVisitId: getVisitId(),
			theRilogClickId: crypto.randomUUID(),
			contentType,
			position,
			...(headlineId === undefined ? {} : { headlineId }),
		};
		analytics.theRilogContentClicked({ ...attribution, postId, navigationType });
		if (navigationType === 'same_tab' && !event.altKey && !event.currentTarget.hasAttribute('download')) {
			pendingAttributionRef.current = attribution;
		}
	};

	return (
		<CustomLink
			{...props}
			onClick={(event) => {
				onClick?.(event);
				trackClick(event);
			}}
			onAuxClick={(event) => {
				onAuxClick?.(event);
				if (event.button === 1) trackClick(event);
			}}
			onNavigate={() => {
				const attribution = pendingAttributionRef.current;
				pendingAttributionRef.current = null;
				if (attribution === null) return;
				recordPostDetailEntryContext({ postId, entrySource: 'the_rilog', feedPosition: null, theRilog: attribution });
			}}
		/>
	);
}
