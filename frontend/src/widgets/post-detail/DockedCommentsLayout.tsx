'use client';

import { useLayoutEffect } from 'react';

interface DockedCommentsLayoutProps {
	host: HTMLElement;
	open: boolean;
}

// Keep this unkeyed sibling before the panel: its layout effect must run before
// descendant textarea measurements, including when the panel is replaced.
export default function DockedCommentsLayout({ host, open }: DockedCommentsLayoutProps) {
	useLayoutEffect(() => {
		const shell = host.parentElement;
		if (!shell) return;
		shell.setAttribute('data-comments-open', String(open));
		return () => shell.removeAttribute('data-comments-open');
	}, [host, open]);
	return null;
}
