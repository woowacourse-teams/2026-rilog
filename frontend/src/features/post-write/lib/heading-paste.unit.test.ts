import { ServerBlockNoteEditor } from '@blocknote/server-util';
import { describe, expect, it } from 'vitest';

import { limitEditorHeadingLevels } from './limit-editor-heading-levels';
import { POST_WRITE_SCHEMA } from './post-write-schema';

describe('restricted editor heading schema', () => {
	it('BlockNote가 파싱한 HTML H5·H6을 편집 문서에서 H4로 변환한다', async () => {
		const editor = ServerBlockNoteEditor.create({ schema: POST_WRITE_SCHEMA });
		const parsedBlocks = await editor.tryParseHTMLToBlocks('<h5>five</h5><h6>six</h6>');

		// BlockNote 0.53 parses heading tags above the schema's menu/shortcut limit.
		expect(parsedBlocks.map((block) => (block.type === 'heading' ? block.props.level : null))).toEqual([5, 6]);
		expect(
			limitEditorHeadingLevels(parsedBlocks).map((block) => (block.type === 'heading' ? block.props.level : null)),
		).toEqual([4, 4]);
	});
});
