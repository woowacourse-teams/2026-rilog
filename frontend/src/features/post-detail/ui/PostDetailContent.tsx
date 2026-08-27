'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import type { MouseEvent } from 'react';

import MermaidCodeBlockPreviewController from '@/shared/ui/mermaid-diagram/MermaidCodeBlockPreviewController';

interface PostDetailContentProps {
	html: string;
	postId: number;
}

const getToggleButton = (target: EventTarget | null): HTMLButtonElement | null => {
	if (!(target instanceof Element)) {
		return null;
	}

	return target.closest<HTMLButtonElement>('button[data-post-detail-toggle]');
};

const setToggleExpanded = (toggleButton: HTMLButtonElement, isExpanded: boolean) => {
	const toggleWrapper = toggleButton.closest<HTMLElement>('.bn-toggle-wrapper');
	if (toggleWrapper === null) {
		return;
	}

	toggleWrapper.dataset.showChildren = String(isExpanded);
	toggleButton.setAttribute('aria-expanded', String(isExpanded));
	toggleButton.setAttribute('aria-label', isExpanded ? '하위 내용 접기' : '하위 내용 펼치기');
};

export default function PostDetailContent({ html, postId }: PostDetailContentProps) {
	const contentRef = useRef<HTMLElement>(null);
	const [contentElement, setContentElement] = useState<HTMLElement | null>(null);
	const currentPostIdRef = useRef(postId);
	const expandedToggleIdsRef = useRef(new Set<string>());
	const setContentRef = useCallback((element: HTMLElement | null) => {
		contentRef.current = element;
		setContentElement(element);
	}, []);

	useLayoutEffect(() => {
		const articleElement = contentRef.current;
		if (articleElement === null) {
			return;
		}

		if (currentPostIdRef.current !== postId) {
			currentPostIdRef.current = postId;
			expandedToggleIdsRef.current.clear();
		}

		articleElement
			.querySelectorAll<HTMLButtonElement>('button[data-post-detail-toggle][aria-controls]')
			.forEach((toggleButton) => {
				const toggleId = toggleButton.getAttribute('aria-controls');
				if (toggleId !== null) {
					setToggleExpanded(toggleButton, expandedToggleIdsRef.current.has(toggleId));
				}
			});
	});

	const handleToggleClick = (event: MouseEvent<HTMLElement>) => {
		const toggleButton = getToggleButton(event.target);
		if (toggleButton === null || !event.currentTarget.contains(toggleButton)) {
			return;
		}

		const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
		const nextExpanded = !isExpanded;
		const toggleId = toggleButton.getAttribute('aria-controls');
		if (toggleId !== null) {
			if (nextExpanded) {
				expandedToggleIdsRef.current.add(toggleId);
			} else {
				expandedToggleIdsRef.current.delete(toggleId);
			}
		}

		setToggleExpanded(toggleButton, nextExpanded);
	};

	return (
		<article
			ref={setContentRef}
			className="post-detail-body bn-root bn-container"
			aria-label="게시글 본문"
			onClick={handleToggleClick}
		>
			<div className="bn-editor bn-default-styles" dangerouslySetInnerHTML={{ __html: html }} />
			<MermaidCodeBlockPreviewController container={contentElement} label="Mermaid 다이어그램" />
		</article>
	);
}
