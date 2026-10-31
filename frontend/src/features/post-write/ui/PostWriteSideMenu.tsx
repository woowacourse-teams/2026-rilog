import { SideMenuExtension, SuggestionMenu } from '@blocknote/core/extensions';
import {
	AddBlockButton,
	DragHandleButton,
	SideMenu,
	useBlockNoteEditor,
	useComponentsContext,
	useDictionary,
	useExtension,
	useExtensionState,
} from '@blocknote/react';

import type { SideMenuProps } from '@blocknote/react';

import { getImageRowAddAction } from '../lib/image-row';
import { POST_WRITE_SCHEMA } from '../lib/post-write-schema';

export default function PostWriteSideMenu({ dragHandleMenu }: SideMenuProps) {
	const editor = useBlockNoteEditor(POST_WRITE_SCHEMA);
	const components = useComponentsContext();
	const dictionary = useDictionary();
	const suggestionMenu = useExtension(SuggestionMenu, { editor });
	const block = useExtensionState(SideMenuExtension, { editor, selector: (state) => state?.block });
	const addAction = block === undefined ? { kind: 'default' as const } : getImageRowAddAction(editor, block.id);

	const addBlockAfterRow = () => {
		if (addAction.kind !== 'after-row') return;
		const row = editor.getBlock(addAction.rowId);
		if (row?.type !== 'columnList') return;
		const paragraph = editor.insertBlocks([{ type: 'paragraph' }], row, 'after')[0];
		editor.setTextCursorPosition(paragraph);
		suggestionMenu.openSuggestionMenu('/');
	};

	if (!components) return null;
	return (
		<SideMenu dragHandleMenu={dragHandleMenu}>
			{addAction.kind === 'default' ? (
				<AddBlockButton />
			) : addAction.kind === 'after-row' ? (
				<components.SideMenu.Button
					className="bn-button"
					label={dictionary.side_menu.add_block_label}
					onClick={addBlockAfterRow}
					icon={
						<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
							<path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
						</svg>
					}
				/>
			) : null}
			<DragHandleButton dragHandleMenu={dragHandleMenu} />
		</SideMenu>
	);
}
