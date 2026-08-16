import type { Block } from '@blocknote/core';

import type { PostDetail } from '@/domains/post/model/post-detail';

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

const heading = (id: string, value: string, level: 2 | 3): Block => ({
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

const code = (id: string, value: string): Block => ({
	id,
	type: 'codeBlock',
	props: { language: 'typescript' },
	content: [text(value)],
	children: [],
});

const personalPostContent: Block[] = [
	paragraph(
		'introduction',
		'이 글에서는 프로젝트를 진행하면서 마주쳤던 문제와 해결 과정을 공유하고자 합니다. 처음에는 단순한 기능 추가로 시작했지만, 점점 코드가 복잡해지면서 구조적인 문제를 인식하게 되었습니다.',
	),
	heading('problem', '문제 상황', 2),
	paragraph('problem-description', '기존 코드베이스는 다음과 같은 문제를 가지고 있었습니다.'),
	bullet('problem-coupling', '컴포넌트와 비즈니스 로직이 강하게 결합되어 있음'),
	bullet('problem-duplication', '동일한 로직이 여러 곳에 중복 작성됨'),
	bullet('problem-tests', '테스트 코드 작성이 어려운 구조'),
	paragraph('problem-result', '새로운 기능 추가 시 사이드 이펙트 발생 빈도도 함께 증가했습니다.'),
	paragraph(
		'problem-context',
		'특히 화면 하나를 수정하기 위해 데이터 요청, 상태 갱신, 표현 컴포넌트까지 동시에 살펴봐야 했습니다. 작은 변경도 어느 영역까지 영향을 미치는지 예측하기 어려웠고, 작업자는 기존 구현을 모두 이해한 뒤에야 코드를 수정할 수 있었습니다.',
	),
	paragraph(
		'problem-symptom',
		'문제는 파일의 개수보다 책임의 경계가 보이지 않는다는 점이었습니다. 비슷하게 생긴 컴포넌트가 서로 다른 정책을 처리하거나, 반대로 같은 정책이 여러 컴포넌트에 흩어져 있어 이름만으로 역할을 판단하기 어려웠습니다.',
	),
	heading('goal', '개선 목표 정하기', 2),
	paragraph(
		'goal-description',
		'구조를 한 번에 완성하려 하기보다 다음 기능을 추가할 때 수정해야 하는 범위를 줄이는 것을 첫 번째 목표로 삼았습니다. 코드의 위치만 바꾸는 것이 아니라 각 계층이 어떤 질문에 답해야 하는지 팀이 함께 설명할 수 있어야 했습니다.',
	),
	bullet('goal-page', '페이지는 경로와 메타데이터, 화면 조립을 담당합니다.'),
	bullet('goal-widget', '위젯은 여러 도메인과 사용자 행동을 하나의 큰 화면으로 조합합니다.'),
	bullet('goal-feature', '기능은 사용자가 달성하려는 행동과 상태 전이를 담당합니다.'),
	bullet('goal-domain', '도메인은 게시글처럼 제품의 핵심 개념과 표현을 담당합니다.'),
	heading('solution', '구조 개선', 2),
	paragraph(
		'solution-description',
		'역할이 다른 코드를 분리하고, 데이터가 화면까지 전달되는 흐름을 한 방향으로 정리했습니다.',
	),
	paragraph(
		'solution-order',
		'먼저 기존 파일을 이동하지 않고 실제 변경 이유가 발생하는 지점을 관찰했습니다. 이후 책임이 분명한 컴포넌트부터 경계를 세우고, 상위 계층은 하위 계층을 조립하기만 하도록 의존 방향을 정리했습니다.',
	),
	heading('component-boundary', '컴포넌트 경계 나누기', 3),
	paragraph(
		'component-boundary-description',
		'페이지는 조립만 담당하고 사용자 행동과 도메인 표현은 각 계층의 컴포넌트가 맡도록 구성했습니다.',
	),
	paragraph(
		'component-boundary-example',
		'예를 들어 게시글 상세 화면은 게시글 제목과 작성자 정보를 표현하는 도메인 UI, 목차 이동을 처리하는 기능, 이들을 본문과 함께 배치하는 위젯으로 나눴습니다. 덕분에 라우트는 게시글 식별자를 해석하고 결과를 화면에 전달하는 역할에만 집중합니다.',
	),
	code('component-example', 'const page = compose(domain, feature, widget);'),
	heading('state-ownership', '상태의 소유자 정하기', 3),
	paragraph(
		'state-ownership-description',
		'상태는 사용하는 컴포넌트와 가장 가까운 곳에 두고, 여러 영역이 함께 사용해야 할 때만 상위 경계로 올렸습니다. 서버에서 받은 데이터와 사용자가 화면에서 만든 임시 상태도 구분해 서로의 생명주기에 영향을 주지 않도록 했습니다.',
	),
	paragraph(
		'state-ownership-effect',
		'이 원칙을 적용하자 불필요한 전역 상태가 줄었고 컴포넌트 테스트에서 준비해야 하는 환경도 단순해졌습니다. 어떤 이벤트가 어떤 상태를 바꾸는지 한 파일 안에서 추적할 수 있어 리뷰 시간도 짧아졌습니다.',
	),
	heading('dependency-direction', '의존 방향 고정하기', 2),
	paragraph(
		'dependency-direction-description',
		'공유 모듈은 특정 게시글 정책을 알지 못하고, 도메인은 페이지 경로나 모달의 존재를 알지 못하도록 했습니다. 상위 계층만 하위 계층을 참조하게 만들면 기능을 제거하거나 교체할 때 함께 흔들리는 범위를 제한할 수 있습니다.',
	),
	bullet('dependency-shared', 'shared는 도메인과 기능의 이름을 import하지 않습니다.'),
	bullet('dependency-domain', 'domains는 사용자 유스케이스나 route 조립을 알지 않습니다.'),
	bullet('dependency-widget', 'widgets는 필요한 domain과 feature를 명시적으로 조합합니다.'),
	heading('shared-ui', '공통 UI의 기준', 3),
	paragraph(
		'shared-ui-description',
		'두 화면에서 사용된다는 이유만으로 컴포넌트를 공통 영역으로 옮기지 않았습니다. 색상, 크기, 접근성처럼 도메인과 무관한 계약이 확인되고 사용하는 쪽에서 제품 정책을 주입할 수 있을 때만 공통 UI로 분리했습니다.',
	),
	paragraph(
		'shared-ui-result',
		'이 기준은 작은 중복을 잠시 허용하는 대신 잘못된 추상화가 여러 화면에 퍼지는 것을 막아 주었습니다. 반복되는 형태가 아니라 반복되는 책임을 찾는 것이 공통화의 출발점이라는 합의도 만들 수 있었습니다.',
	),
	heading('migration', '작은 단위로 이전하기', 2),
	paragraph(
		'migration-description',
		'전체 구조를 한 번에 바꾸면 기능 변경과 파일 이동이 섞여 검토하기 어려워집니다. 그래서 사용자 행동 하나를 기준으로 관련 컴포넌트와 테스트를 함께 옮기고, 각 단계에서 기존 동작이 유지되는지 확인했습니다.',
	),
	bullet('migration-step-one', '현재 동작을 재현하는 테스트로 변경 전 기준을 남깁니다.'),
	bullet('migration-step-two', '책임이 가장 분명한 하위 컴포넌트부터 이동합니다.'),
	bullet('migration-step-three', '상위 조립 컴포넌트의 import와 이름을 마지막에 정리합니다.'),
	paragraph(
		'migration-review',
		'리뷰에서는 파일이 새 폴더에 들어갔는지보다 이동한 책임이 그 계층의 규칙과 맞는지 확인했습니다. 이전 전후의 화면과 테스트 결과를 함께 제시해 구조 변경이 사용자 동작을 바꾸지 않았다는 점도 검증했습니다.',
	),
	heading('testing-strategy', '검증 전략', 2),
	paragraph(
		'testing-strategy-description',
		'순수한 변환 규칙은 단위 테스트로, 사용자의 입력과 상태 전이는 컴포넌트 테스트로, 여러 경계를 통과하는 핵심 흐름은 E2E 테스트로 나눴습니다. 구현 세부보다 사용자가 관찰할 수 있는 결과를 검증하도록 테스트의 질문도 정리했습니다.',
	),
	heading('component-test', '컴포넌트 단위 확인', 3),
	paragraph(
		'component-test-description',
		'컴포넌트 테스트에서는 내부 state나 class 이름 대신 접근 가능한 이름으로 요소를 찾고 실제 사용자가 수행하는 이벤트를 발생시켰습니다. 이 방식은 마크업을 개선하면서도 테스트의 의도를 유지하게 해 주었습니다.',
	),
	heading('flow-test', '사용자 흐름 확인', 3),
	paragraph(
		'flow-test-description',
		'페이지 진입부터 결과 확인까지 중요한 흐름은 브라우저 환경에서 검증했습니다. 모든 조합을 E2E로 다루기보다 계층 사이의 연결이 실제 환경에서도 동작하는지 확인하는 짧은 시나리오에 집중했습니다.',
	),
	heading('team-rule', '팀의 판단 기준으로 만들기', 2),
	paragraph(
		'team-rule-description',
		'폴더 구조는 정답 목록이 아니라 변경할 때 대화를 시작하는 기준으로 사용했습니다. 새로운 파일의 위치가 애매하면 어떤 책임을 가지는지, 무엇을 알아도 되는지, 어느 사용자 행동과 함께 바뀌는지를 먼저 질문했습니다.',
	),
	paragraph(
		'team-rule-record',
		'결정 이유는 이슈와 리뷰에 짧게 남겼습니다. 이후 비슷한 상황이 생겼을 때 이전 결정을 그대로 따르기보다 당시 제약과 현재 상황이 같은지 비교할 수 있어 불필요한 논쟁도 줄었습니다.',
	),
	heading('result', '적용 결과', 2),
	paragraph(
		'result-description',
		'변경 범위가 명확해졌고, 각 컴포넌트를 독립적으로 검증할 수 있어 이후 작업의 예측 가능성이 높아졌습니다.',
	),
	paragraph(
		'result-detail',
		'기능을 추가할 때 먼저 수정할 계층을 좁힐 수 있었고 리뷰어도 파일의 책임을 기준으로 변경을 따라갈 수 있었습니다. 테스트 준비 코드가 줄어 실패 원인을 찾는 시간도 짧아졌으며, 공통 UI와 제품 정책 사이의 경계도 선명해졌습니다.',
	),
	paragraph(
		'result-next',
		'아직 모든 컴포넌트가 이상적인 위치에 있는 것은 아닙니다. 다만 완성된 구조를 미리 만드는 대신 실제 변경 과정에서 경계를 조정하는 원칙을 세웠고, 다음 기능에서도 같은 방식으로 작은 개선을 이어갈 수 있게 되었습니다.',
	),
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
	paragraph(
		'shared-rule-background',
		'여러 사람이 같은 화면을 나누어 작업할 때는 코드 스타일보다 경계를 판단하는 기준이 더 중요했습니다. 각자 익숙한 방식으로 구현하면 개별 파일은 깔끔해 보여도 조합하는 단계에서 책임이 겹치거나 빠지는 문제가 반복되었습니다.',
	),
	heading('naming-rule', '이름으로 책임 드러내기', 3),
	paragraph(
		'naming-rule-description',
		'컴포넌트 이름은 모양보다 제품에서 맡은 역할을 설명하도록 했습니다. 단순히 Card나 Section이라고 부르기보다 게시글 요약, CoLog 정보처럼 어떤 개념을 표현하는지 드러내면 사용하는 위치와 변경 이유를 함께 이해할 수 있습니다.',
	),
	paragraph(
		'naming-rule-exception',
		'반대로 버튼, 입력창, 모달처럼 제품 개념과 무관한 기반 컴포넌트는 시각적 역할을 이름에 사용했습니다. 이름만 보아도 도메인 UI와 공통 UI를 구분할 수 있어 의존 방향을 검토하기 쉬워졌습니다.',
	),
	heading('composition-rule', '조합을 우선하기', 2),
	paragraph(
		'composition-rule-description',
		'하나의 거대한 컴포넌트가 모든 변형을 boolean prop으로 처리하지 않도록 작은 책임을 조합했습니다. 각 요소가 독립적인 계약을 가지면 새로운 화면에서 필요한 부분만 선택할 수 있고 기존 사용처의 조건문도 줄어듭니다.',
	),
	bullet('composition-one', '데이터 표현과 사용자 이벤트 처리를 분리합니다.'),
	bullet('composition-two', '선택적인 영역은 값이 있을 때만 명시적으로 조합합니다.'),
	bullet('composition-three', '공통 레이아웃은 내부 도메인 정책을 추론하지 않습니다.'),
	heading('design-token', '디자인 토큰 사용하기', 3),
	paragraph(
		'design-token-description',
		'색상과 타이포그래피는 원시값 대신 의미가 담긴 토큰을 사용했습니다. 같은 남색이라도 배경, 본문, 강조 상태가 서로 다른 역할을 가지므로 컴포넌트는 실제 색상값보다 의도를 선택하도록 했습니다.',
	),
	paragraph(
		'design-token-review',
		'리뷰에서는 화면이 현재 시안과 비슷한지만 보지 않고 hover, focus, disabled 상태가 같은 의미의 토큰을 사용하는지 확인했습니다. 이를 통해 전체 테마가 바뀌더라도 개별 컴포넌트를 다시 해석하지 않도록 했습니다.',
	),
	heading('review-process', '리뷰 과정', 2),
	paragraph('review-process-description', '작은 단위로 변경하고 화면과 사용자 흐름을 함께 확인합니다.'),
	paragraph(
		'review-process-detail',
		'작성자는 변경 목적과 검증 결과를 먼저 제시하고 리뷰어는 책임의 위치, 사용자 동작, 접근성 순서로 확인했습니다. 표현 방식에 대한 취향보다 기존 합의와 달라진 이유를 중심으로 대화해 수정 방향을 빠르게 결정했습니다.',
	),
	heading('review-question', '리뷰에서 확인할 질문', 3),
	paragraph(
		'review-question-description',
		'이 책임이 현재 계층에 있는 이유를 코드만 보고 설명할 수 있는지 확인합니다.',
	),
	bullet('review-question-one', '이 컴포넌트가 알 필요 없는 도메인 정책을 참조하고 있지 않은가?'),
	bullet('review-question-two', '사용자 동작이 아니라 내부 구현만 검증하는 테스트가 추가되지 않았는가?'),
	bullet('review-question-three', '기존 공통 컴포넌트와 토큰으로 해결할 수 있는 표현을 다시 만들지 않았는가?'),
	heading('accessibility', '접근성을 기본 계약으로', 2),
	paragraph(
		'accessibility-description',
		'접근성은 구현이 끝난 뒤 추가하는 검사가 아니라 공통 컴포넌트의 기본 계약으로 정했습니다. 클릭할 수 있는 요소는 키보드로도 도달할 수 있어야 하고, 아이콘만 있는 버튼은 역할을 설명하는 접근 가능한 이름을 가져야 합니다.',
	),
	paragraph(
		'accessibility-focus',
		'focus 스타일은 브라우저 기본 동작을 제거하는 대신 디자인 시스템의 focus ring 토큰으로 통일했습니다. 마우스를 사용하지 않는 상황에서도 현재 위치가 분명하게 보이는지 실제 키보드 이동으로 확인했습니다.',
	),
	heading('decision-record', '결정 이유 기록하기', 2),
	paragraph(
		'decision-record-description',
		'규칙만 남기면 시간이 지난 뒤 예외를 판단하기 어렵습니다. 그래서 중요한 선택에는 당시의 제약, 검토한 대안, 선택하지 않은 이유를 함께 기록해 다음 작업자가 같은 탐색을 반복하지 않도록 했습니다.',
	),
	paragraph(
		'decision-record-use',
		'기록은 결정을 영구히 고정하기 위한 것이 아닙니다. 전제가 달라졌다면 이전 이유와 비교해 새로운 결정을 내리고, 변경된 기준을 다시 남기는 방식으로 팀의 공통 지식을 갱신했습니다.',
	),
	heading('collaboration', '작업 충돌 줄이기', 2),
	paragraph(
		'collaboration-description',
		'큰 파일 하나를 여러 사람이 동시에 수정하지 않도록 책임 단위로 작업 범위를 나눴습니다. 공통 파일 변경이 필요한 경우에는 먼저 영향을 공유하고, 한 사람이 경계를 정리한 뒤 다른 작업이 그 결과에 맞추도록 순서를 조정했습니다.',
	),
	bullet('collaboration-one', '변경 파일과 소유 범위를 작업 시작 전에 명확하게 정합니다.'),
	bullet('collaboration-two', '다른 작업자의 변경을 되돌리지 않고 현재 상태에 맞춰 조정합니다.'),
	bullet('collaboration-three', '공통 계약 변경은 관련 화면과 테스트 영향을 함께 기록합니다.'),
	heading('verification', '화면과 동작 함께 검증하기', 2),
	paragraph(
		'verification-description',
		'정적 검사만 통과했다고 작업이 끝난 것으로 보지 않았습니다. 단위 테스트와 컴포넌트 테스트 이후 실제 브라우저에서 주요 화면을 열어 반응형 배치, 긴 텍스트, 이미지 실패, 키보드 이동을 확인했습니다.',
	),
	paragraph(
		'verification-result',
		'이 과정에서 코드만 볼 때 발견하기 어려운 레이아웃 밀림과 focus 순서 문제를 일찍 찾을 수 있었습니다. 검증 결과를 리뷰에 남기면 리뷰어도 같은 조건을 빠르게 재현할 수 있어 피드백의 정확도가 높아졌습니다.',
	),
	heading('retrospective', '운영하며 배운 점', 2),
	paragraph(
		'retrospective-description',
		'좋은 규칙은 모든 상황을 미리 예측하는 규칙이 아니라 팀이 애매한 상황에서 같은 질문을 하게 만드는 규칙이었습니다. 실제 작업에서 반복적으로 도움이 되는 기준만 남기고 사용되지 않는 추상화와 문서는 과감히 줄였습니다.',
	),
	paragraph(
		'retrospective-next',
		'앞으로도 새로운 패턴을 바로 공통 규칙으로 승격하지 않고 여러 기능에서 책임이 반복되는지 관찰할 예정입니다. 충분한 사례가 모이면 기존 결정을 다시 검토하고 더 단순한 구조로 개선해 나가겠습니다.',
	),
];

const MOCK_POST_DETAILS: Readonly<Record<string, PostDetail>> = {
	'1': {
		title: '컴포넌트 시스템, 이렇게 도입했어요',
		content: personalPostContent,
		publishedAt: '2024-05-20T09:00:00+09:00',
		thumbnailImageUrl: null,
		author: {
			nickname: '김지연',
			slug: 'kim-jiyeon',
		},
		colog: null,
	},
	'5': {
		title: '함께 만드는 컴포넌트 설계 원칙',
		content: cologPostContent,
		publishedAt: '2024-06-03T11:30:00+09:00',
		thumbnailImageUrl: '/images/default-post-cover.svg',
		author: {
			nickname: '박리로그',
			slug: 'park-rilog',
		},
		colog: {
			name: '리로그',
			slug: 'rilog',
			description: 'React와 클린 아키텍처를 함께 공부합니다.',
			memberCount: 7,
			postCount: 6,
		},
	},
};

export const getMockPostDetail = (postId: string): PostDetail | null => MOCK_POST_DETAILS[postId] ?? null;
