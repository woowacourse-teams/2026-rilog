import type { PostWriteBlockNoteEditor } from './post-write-schema';

// data: 제거와 외부 이미지의 CDN 주소 치환처럼 자동으로 URL을 정리할 때 사용한다.
export const updateMediaUrlWithoutHistory = (editor: PostWriteBlockNoteEditor, blockId: string, url: string) => {
	editor.transact((transaction) => {
		transaction.setMeta('addToHistory', false);
		editor.updateBlock(blockId, { props: { url } });
	});
};
