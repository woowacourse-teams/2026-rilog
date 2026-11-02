'use client';

import { createContext, useContext } from 'react';

import type { InlineCommentCreateEntrySource } from '@/features/analytics/model/analytics-event';

export const INLINE_COMMENT_ENTRY_SOURCE_CONTEXT = createContext<InlineCommentCreateEntrySource>('selection_toolbar');
export const useInlineCommentEntrySource = () => useContext(INLINE_COMMENT_ENTRY_SOURCE_CONTEXT);
