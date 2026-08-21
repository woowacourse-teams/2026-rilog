import { ServerBlockNoteEditor } from '@blocknote/server-util';

import type { Block } from '@blocknote/core';

interface ServerBlockNoteEditorWithDom {
	jsdom: {
		reconfigure: (settings: { url: string }) => void;
	};
}

export const renderPostDetailContent = async (blocks: Block[]): Promise<string> => {
	const editor = ServerBlockNoteEditor.create();

	// BlockNote 0.53은 URL 없는 JSDOM을 사용해 이미지 등 일부 블록 렌더링 중 localStorage 접근이 실패한다.
	// 서버 전용 가상 DOM에 origin만 부여하고 외부 네트워크 요청이나 브라우저 저장소는 사용하지 않는다.
	(editor as unknown as ServerBlockNoteEditorWithDom).jsdom.reconfigure({ url: 'https://server.rilog.local' });

	return editor.blocksToFullHTML(blocks);
};
