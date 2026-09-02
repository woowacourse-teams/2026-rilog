import type { Block } from '@blocknote/core';

import type { PostDetail } from '@/domains/post/model/post';

const DEFAULT_TEXT_PROPS = {
	backgroundColor: 'default',
	textAlignment: 'left',
	textColor: 'default',
} as const;

const text = (value: string) => ({
	type: 'text' as const,
	text: value,
	styles: {},
});

const paragraph = (id: string, value: string): Block => ({
	id,
	type: 'paragraph',
	props: DEFAULT_TEXT_PROPS,
	content: [text(value)],
	children: [],
});

const heading = (id: string, value: string, level: 1 | 2 | 3): Block => ({
	id,
	type: 'heading',
	props: { ...DEFAULT_TEXT_PROPS, level, isToggleable: false },
	content: [text(value)],
	children: [],
});

const bullet = (id: string, value: string): Block => ({
	id,
	type: 'bulletListItem',
	props: DEFAULT_TEXT_PROPS,
	content: [text(value)],
	children: [],
});

const code = (id: string, value: string, language = 'typescript'): Block => ({
	id,
	type: 'codeBlock',
	props: { language },
	content: [text(value)],
	children: [],
});

export const POST_DETAIL_READABILITY_CONTENT: Block[] = [
	heading('readability-heading-level-1', '읽기 좋은 기술 글의 구조', 1),
	paragraph(
		'introduction',
		'이 글에서는 프로젝트를 진행하면서 마주쳤던 문제와 해결 과정을 공유하고자 합니다. 처음에는 단순한 기능 추가로 시작했지만, 점점 코드가 복잡해지면서 구조적인 문제를 인식하게 되었습니다.',
	),
	paragraph(
		'introduction-context',
		'한 문단에는 하나의 중심 생각만 담고, 다음 문단에서는 그 생각이 실제 코드와 협업 방식에 어떤 영향을 주었는지 이어서 설명합니다. 문장이 여러 줄로 흐를 때에도 시선이 자연스럽게 다음 줄을 찾을 수 있어야 합니다.',
	),
	paragraph(
		'introduction-conclusion',
		'연속된 세 문단은 본문 행간과 문단 사이 간격을 함께 비교하기 위한 예시입니다. 데스크톱뿐 아니라 화면이 좁은 모바일에서도 같은 읽기 흐름이 유지되는지 확인합니다.',
	),
	heading('problem', '문제 상황', 2),
	paragraph('problem-description', '기존 코드베이스는 다음과 같은 문제를 가지고 있었습니다.'),
	bullet('problem-coupling', '컴포넌트와 비즈니스 로직이 강하게 결합되어 있음'),
	{
		...bullet('problem-duplication', '동일한 로직이 여러 곳에 중복 작성됨'),
		children: [
			bullet('problem-duplication-child', '페이지마다 유사한 데이터 변환 로직이 반복됨'),
			bullet('problem-spacing-child', '중첩 목록에서도 항목 간 리듬을 유지해야 함'),
		],
	},
	bullet('problem-tests', '테스트 코드 작성이 어려운 구조'),
	{
		id: 'problem-priority',
		type: 'numberedListItem',
		props: { ...DEFAULT_TEXT_PROPS, start: 1 },
		content: [text('사용자 흐름을 기준으로 문제의 우선순위를 정합니다.')],
		children: [],
	},
	{
		id: 'problem-check',
		type: 'checkListItem',
		props: { ...DEFAULT_TEXT_PROPS, checked: true },
		content: [text('긴 문단과 중첩 목록을 모바일에서도 확인했습니다.')],
		children: [],
	},
	paragraph('problem-result', '새로운 기능 추가 시 사이드 이펙트 발생 빈도도 함께 증가했습니다.'),
	{
		id: 'guiding-quote',
		type: 'quote',
		props: { backgroundColor: 'default', textColor: 'default' },
		content: [text('좋은 구조는 코드를 짧게 만드는 것이 아니라 다음 변경의 이유와 위치를 분명하게 만듭니다.')],
		children: [],
	},
	heading('goal', '개선 목표 정하기', 2),
	paragraph(
		'goal-description',
		'구조를 한 번에 완성하려 하기보다 다음 기능을 추가할 때 수정해야 하는 범위를 줄이는 것을 첫 번째 목표로 삼았습니다.',
	),
	{
		id: 'goal-reference',
		type: 'paragraph',
		props: DEFAULT_TEXT_PROPS,
		content: [
			text('세부 규칙은 '),
			{
				type: 'link',
				href: 'https://www.rilog.dev/docs/architecture',
				content: [text('Rilog 아키텍처 가이드')],
			},
			text('를 참고하고, 모듈 경계는 '),
			{ ...text('@/features/post-detail'), styles: { code: true } },
			text('처럼 실제 경로로 확인합니다.'),
		],
		children: [],
	},
	bullet('goal-page', '페이지는 경로와 메타데이터, 화면 조립을 담당합니다.'),
	bullet('goal-widget', '위젯은 여러 도메인과 사용자 행동을 하나의 큰 화면으로 조합합니다.'),
	bullet('goal-feature', '기능은 사용자가 달성하려는 행동과 상태 전이를 담당합니다.'),
	bullet('goal-domain', '도메인은 게시글처럼 제품의 핵심 개념과 표현을 담당합니다.'),
	heading('solution', '구조 개선', 2),
	paragraph(
		'solution-description',
		'역할이 다른 코드를 분리하고, 데이터가 화면까지 전달되는 흐름을 한 방향으로 정리했습니다.',
	),
	heading('component-boundary', '컴포넌트 경계 나누기', 3),
	paragraph(
		'component-boundary-description',
		'페이지는 조립만 담당하고 사용자 행동과 도메인 표현은 각 계층의 컴포넌트가 맡도록 구성했습니다.',
	),
	code(
		'component-example',
		`interface PageDependencies {
\tdomain: PostDomain;
\tfeature: PostFeature;
\twidget: PostWidget;
}

export const composePostPage = ({ domain, feature, widget }: PageDependencies) => {
\tconst description = domain.summary ?? '<설명이 없습니다>';

\treturn widget.render({ description, onPublish: feature.publish });
};`,
	),
	code(
		'long-line-example',
		'const longResult = createPostReadabilityFixture({ title: "가로 폭을 넘어가는 코드가 페이지 전체를 밀어내지 않고 코드 블록 안에서만 스크롤되는지 확인합니다.", preserveCurrentLayout: true });',
	),
	code('plain-code-example', '+++[>++++<-]>.<script>alert("escaped")</script>', 'unknown-language'),
	{
		id: 'comparison-table',
		type: 'table',
		props: { textColor: 'default' },
		content: {
			type: 'tableContent',
			columnWidths: [undefined, undefined],
			headerRows: 1,
			headerCols: 0,
			rows: [
				{
					cells: [[text('영역')], [text('확인 기준')]],
				},
				{
					cells: [[text('본문')], [text('행간과 문단 간격')]],
				},
				{
					cells: [[text('코드')], [text('구문 강조와 가로 스크롤')]],
				},
			],
		},
		children: [],
	},
	{
		id: 'readability-toggle',
		type: 'toggleListItem',
		props: DEFAULT_TEXT_PROPS,
		content: [text('추가 점검 항목 보기')],
		children: [
			paragraph('readability-toggle-content', '토글을 펼쳤을 때 중첩 본문도 같은 행간과 문단 간격을 사용합니다.'),
		],
	},
	{
		id: 'readability-image',
		type: 'image',
		props: {
			backgroundColor: 'default',
			caption: '이미지와 본문 사이 간격 확인',
			name: '가독성 점검 예시 이미지',
			previewWidth: 640,
			showPreview: true,
			textAlignment: 'left',
			url: '/images/default-post-cover.svg',
		},
		content: undefined,
		children: [],
	},
];

const cologPostContent: Block[] = [
	paragraph(
		'colog-introduction',
		'함께 만드는 기록 공간을 운영하며 합의한 컴포넌트 설계 원칙과 실제 적용 사례를 정리합니다.',
	),
	heading('shared-rule', '함께 지키는 기준', 2),
	paragraph('shared-rule-description', '공통 규칙은 구현을 제한하기보다 판단의 기준을 맞추는 데 사용합니다.'),
	bullet('shared-rule-one', '도메인 책임을 컴포넌트 이름에 드러냅니다.'),
	bullet('shared-rule-two', '공통 UI는 특정 화면의 정책을 알지 않게 합니다.'),
];

const MOCK_POST_DETAILS: Readonly<Record<string, PostDetail>> = {
	'1': {
		id: 1,
		title: '컴포넌트 시스템, 이렇게 도입했어요',
		content: POST_DETAIL_READABILITY_CONTENT,
		publishedAt: '2024-05-20T09:00:00+09:00',
		thumbnailUrl: null,
		category: 'IT',
		viewerPermissions: { canEdit: true, canDelete: true },
		author: {
			id: 1,
			nickname: '김지연',
			slug: 'kim-jiyeon',
			profileImageUrl: null,
		},
		blog: {
			id: 1,
			type: 'RILOG',
			name: '김지연',
			slug: 'kim-jiyeon',
			profileImageUrl: null,
			owner: {
				id: 1,
				nickname: '김지연',
				slug: 'kim-jiyeon',
				profileImageUrl: null,
			},
		},
	},
	'5': {
		id: 5,
		title: '함께 만드는 컴포넌트 설계 원칙',
		content: cologPostContent,
		publishedAt: '2024-06-03T11:30:00+09:00',
		thumbnailUrl: '/images/default-post-cover.svg',
		category: 'IT',
		viewerPermissions: { canEdit: true, canDelete: true },
		author: {
			id: 2,
			nickname: '박리로그',
			slug: 'park-rilog',
			profileImageUrl: null,
		},
		blog: {
			id: 5,
			type: 'COLOG',
			name: '리로그',
			slug: 'rilog',
			description: 'React와 클린 아키텍처를 함께 공부합니다.',
			profileImageUrl: null,
			coverImageUrl: null,
			memberCount: 7,
			postCount: 6,
		},
	},
};

export const getMockPostDetail = (postId: string): PostDetail | null => MOCK_POST_DETAILS[postId] ?? null;
