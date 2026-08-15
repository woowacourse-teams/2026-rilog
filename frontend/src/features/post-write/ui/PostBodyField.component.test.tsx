import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { PostEditorHandle, PostEditorProps } from '../model/post-editor';

import PostBodyField from './PostBodyField';

function FakeEditor({ ariaDescribedBy }: PostEditorProps) {
	return <div role="textbox" aria-label="게시글 내용" aria-describedby={ariaDescribedBy} />;
}

describe('PostBodyField', () => {
	it('본문 오류를 실제 editor 계약에 연결한다', () => {
		render(
			<PostBodyField
				editorComponent={FakeEditor}
				editorRef={createRef<PostEditorHandle>()}
				error="내용을 입력해 주세요."
				onReady={vi.fn()}
				onChange={vi.fn()}
				uploadFile={vi.fn(() => Promise.resolve('data:image/png;base64,mock'))}
			/>,
		);

		const editor = screen.getByRole('textbox', { name: '게시글 내용' });
		const error = screen.getByRole('alert');
		expect(editor).toHaveAttribute('aria-describedby', error.id);
	});
});
