'use client';

import type { CommentPanelSession } from '../hooks/use-comment-panel-session';
import type { ReactNode } from 'react';

import type { InlineCommentCreateEntrySource } from '@/features/analytics/model/analytics-event';

import { COMMENT_PANEL_SESSION_CONTEXT } from '../hooks/use-comment-panel-session';
import { INLINE_COMMENT_ENTRY_SOURCE_CONTEXT } from '../hooks/use-inline-comment-entry-source';

interface CommentPanelProvidersProps {
	session: CommentPanelSession;
	entrySource: InlineCommentCreateEntrySource;
	children: ReactNode;
}

export default function CommentPanelProviders({ session, entrySource, children }: CommentPanelProvidersProps) {
	return (
		<INLINE_COMMENT_ENTRY_SOURCE_CONTEXT value={entrySource}>
			<COMMENT_PANEL_SESSION_CONTEXT value={session}>{children}</COMMENT_PANEL_SESSION_CONTEXT>
		</INLINE_COMMENT_ENTRY_SOURCE_CONTEXT>
	);
}
