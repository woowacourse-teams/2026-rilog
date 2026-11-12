// @vitest-environment jsdom
import { BlockNoteEditor } from '@blocknote/core';
import { ko } from '@blocknote/core/locales';
import { afterEach, describe, expect, it } from 'vitest';

import { getPostWriteSlashMenuItems } from './get-post-write-slash-menu-items';
import { POST_WRITE_SCHEMA } from './post-write-schema';
import { slashMenuDictionary } from './slash-menu-dictionary';

describe('제목4 슬래시 메뉴', () => {
	const editor = () => {
		const instance = BlockNoteEditor.create({
			schema: POST_WRITE_SCHEMA,
			dictionary: { ...ko, slash_menu: slashMenuDictionary },
		});
		instance.mount(document.createElement('div'));
		return instance;
	};
	const editors: ReturnType<typeof editor>[] = [];
	afterEach(() => {
		for (const instance of editors.splice(0)) instance.unmount();
	});

	it('일반 제목1~4를 제목 그룹에, 접을 수 있는 제목1~4를 소제목 그룹에 나란히 제공한다', () => {
		const instance = editor();
		editors.push(instance);
		const items = getPostWriteSlashMenuItems(instance);
		expect(items.find((item) => item.title === '제목4')?.subtext).toBe('섹션 소제목');
		expect(items.find((item) => item.title === '접을 수 있는 제목4')?.subtext).toBe(
			'내용을 표시하거나 숨길 수 있는 섹션 소제목',
		);
		expect(items.filter((item) => item.group === '제목').map((item) => item.title)).toEqual([
			'제목1',
			'제목2',
			'제목3',
			'제목4',
		]);
		expect(items.filter((item) => item.group === '소제목').map((item) => item.title)).toEqual([
			'접을 수 있는 제목1',
			'접을 수 있는 제목2',
			'접을 수 있는 제목3',
			'접을 수 있는 제목4',
		]);
	});

	it.each([
		['제목4', false],
		['접을 수 있는 제목4', true],
	] as const)('%s 선택 시 해당 제목4 블록을 삽입한다', (title, isToggleable) => {
		const instance = editor();
		editors.push(instance);
		const item = getPostWriteSlashMenuItems(instance).find((entry) => entry.title === title);
		expect(item).toBeDefined();
		item?.onItemClick();
		expect(instance.getTextCursorPosition().block).toMatchObject({
			type: 'heading',
			props: { level: 4, isToggleable },
		});
	});
});
