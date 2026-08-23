import { ServerBlockNoteEditor } from '@blocknote/server-util';

import type { Block } from '@blocknote/core';

interface ServerBlockNoteEditorWithDom {
	jsdom: {
		reconfigure: (settings: { url: string }) => void;
		window: {
			document: Document;
		};
	};
}

const POST_DETAIL_TOGGLE_BUTTON_SELECTOR = ':scope > .bn-toggle-button';
const POST_DETAIL_TOGGLE_CHILDREN_SELECTOR = ':scope > .bn-block-group';

const enhancePostDetailToggles = (html: string, document: Document): string => {
	const container = document.createElement('div');
	container.innerHTML = html;

	container.querySelectorAll<HTMLElement>('.bn-toggle-wrapper').forEach((toggleWrapper, index) => {
		const toggleButton = toggleWrapper.querySelector<HTMLButtonElement>(POST_DETAIL_TOGGLE_BUTTON_SELECTOR);
		if (toggleButton === null) {
			return;
		}

		toggleWrapper.dataset.showChildren = 'false';
		toggleButton.dataset.postDetailToggle = '';
		toggleButton.setAttribute('aria-expanded', 'false');
		toggleButton.setAttribute('aria-label', '하위 내용 펼치기');

		const childBlockGroup = toggleWrapper
			.closest<HTMLElement>('.bn-block')
			?.querySelector<HTMLElement>(POST_DETAIL_TOGGLE_CHILDREN_SELECTOR);
		if (childBlockGroup === null || childBlockGroup === undefined) {
			return;
		}

		const childBlockGroupId = `post-detail-toggle-content-${index}`;
		childBlockGroup.id = childBlockGroupId;
		toggleButton.setAttribute('aria-controls', childBlockGroupId);
	});

	return container.innerHTML;
};

export const renderPostDetailContent = async (blocks: Block[]): Promise<string> => {
	const editor = ServerBlockNoteEditor.create();

	// BlockNote 0.53은 URL 없는 JSDOM을 사용해 이미지 등 일부 블록 렌더링 중 localStorage 접근이 실패한다.
	// 서버 전용 가상 DOM에 origin만 부여하고 외부 네트워크 요청이나 브라우저 저장소는 사용하지 않는다.
	(editor as unknown as ServerBlockNoteEditorWithDom).jsdom.reconfigure({ url: 'https://server.rilog.local' });

	const html = await editor.blocksToFullHTML(blocks);
	const document = (editor as unknown as ServerBlockNoteEditorWithDom).jsdom.window.document;

	return enhancePostDetailToggles(html, document);
};
