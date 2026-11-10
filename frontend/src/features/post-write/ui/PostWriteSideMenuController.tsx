import { SideMenuExtension } from '@blocknote/core/extensions';
import { SideMenuController, useBlockNoteEditor, useExtensionState } from '@blocknote/react';

import { POST_WRITE_SCHEMA } from '../lib/post-write-schema';

import PostWriteSideMenu from './PostWriteSideMenu';

export default function PostWriteSideMenuController() {
	const editor = useBlockNoteEditor(POST_WRITE_SCHEMA);
	const sideMenuState = useExtensionState(SideMenuExtension, {
		editor,
		selector: (state) => (state === undefined ? undefined : { block: state.block }),
	});
	const block = sideMenuState?.block;
	const isTextBlock = block?.type === 'heading' || block?.type === 'paragraph';

	// BlockNote의 고정 보정 대신 작성 화면에서 실제 텍스트 줄과 핸들의 중심을 맞춘다.
	return (
		<SideMenuController
			sideMenu={PostWriteSideMenu}
			floatingUIOptions={
				isTextBlock
					? {
							useFloatingOptions: {
								middleware: [
									{
										name: 'align-text-handle',
										fn: ({ y, rects, elements }) => {
											const reference = elements.reference;
											const contextElement = reference instanceof Element ? reference : reference.contextElement;
											const textElement = contextElement
												?.closest('.bn-block-outer')
												?.querySelector<HTMLElement>('.bn-block-content > .bn-inline-content');
											if (!textElement) return {};
											const textRect = textElement.getBoundingClientRect();
											return {
												y: y + (textRect.height - rects.floating.height) / 2,
											};
										},
									},
								],
							},
						}
					: undefined
			}
		/>
	);
}
