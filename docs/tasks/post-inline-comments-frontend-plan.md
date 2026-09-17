# 게시글 인라인 댓글 프론트엔드 작업 계획

- 기준 설계: `docs/tasks/post-inline-comments.md`
- 범위: frontend만 구현
- 백엔드 변경: 하지 않음
- 권장 첫 완료 지점: F0~F3

## 0. 진행 상태

- [x] F0 계약 타입·fixture·DOM root 표식
- [x] F1 drag selection → `blockId`, UTF-16 offset, `selectedText` 추출 순수 로직
- [x] F2 server range → DOM Range 복원 순수 로직
- [x] F3 ACTIVE 4px 상단선 하이라이트와 fixture 주입 경계
- [ ] F4 클릭/hover/focus 및 중첩 우선순위
- [ ] F5 실제 조회 API 연결
- [ ] F6 이후 sidebar, mutation, 모바일 UI

F0~F3 구현은 실제 API를 호출하지 않는다. `PostDetailContent`의 선택적 `inlineCommentBlocks` prop으로 서버 응답 형태의 데이터를 주입할 수 있으며, 데이터가 없으면 기존 게시글 상세 UI를 유지한다.

## 1. 이번 작업의 목표

프론트엔드 작업을 서로 독립적으로 검증 가능한 작은 단위로 나눈다. 백엔드가 준비되지 않은 동안에는 고정 fixture를 서버 응답으로 간주하고 다음 두 기반 기능을 먼저 완성한다.

1. 사용자가 한 지원 블록 안의 텍스트를 선택했을 때 서버 요청에 필요한 `blockId`, UTF-16 `startOffset`, `endOffset`, `selectedText`를 추출한다.
2. 서버가 보냈다고 가정한 `blockId`, `range`, `selectedText`, `state`와 배열 순서로 ACTIVE 하이라이트를 복원한다. OUTDATED는 본문에 표시하지 않는다.

이 기반이 안정된 뒤 API query, 댓글 rail/sidebar, 작성·수정·삭제, 모바일 BottomSheet 순서로 확장한다.

## 2. 이번 단계의 비목표

- 백엔드 코드, DB migration 또는 API 구현
- 프론트에서 drift 탐지, `selectedText` 재검색, offset 보정, ACTIVE/OUTDATED 재판정
- 첫 작업 단위에서 실제 댓글 API 호출
- 첫 작업 단위에서 sidebar, 댓글 입력, 수정·삭제, 모바일 BottomSheet 완성
- 작성/수정 화면의 인라인 댓글
- 답글

## 3. 진행 원칙

### 3.1 서버 계약과 DOM 계약을 분리한다

- API DTO는 `shared/api/posts/types.ts`의 서버 계약이다.
- DOM selection/Range 변환은 `features/post-detail/lib`의 게시글 상세 전용 로직이다.
- 하이라이트와 선택 event는 `features/post-detail/ui`의 최소 Client Component가 담당한다.
- DOM utility가 TanStack Query, sidebar 상태 또는 댓글 mutation을 import하지 않게 한다.

### 3.2 fixture를 서버 응답처럼 취급한다

백엔드가 준비되기 전에는 테스트 fixture를 사용한다. fixture를 화면에서 재정렬하거나 정정하지 않는다.

- `ACTIVE`: 전달된 range로만 DOM Range 복원을 시도한다.
- `OUTDATED`: 본문 Range 복원 자체를 시도하지 않는다.
- ACTIVE range가 DOM으로 변환되지 않으면 그 하이라이트만 생략한다.
- `selectedText`는 인용 표시와 작성 payload에 사용하되 ACTIVE 검증이나 재검색에 사용하지 않는다.

### 3.3 새 의존성을 추가하지 않는다

브라우저의 `Selection`, `Range`, `TreeWalker`, `ResizeObserver`와 기존 React/Vitest/RTL을 사용한다. 전역 상태 또는 range 라이브러리를 도입하지 않는다.

## 4. 작업 단위 개요

| 단위 | 결과물 | 백엔드 필요 | 독립 배포 가능 |
|---|---|---:|---:|
| F0 | 프론트 타입·fixture·DOM 계약 고정 | 아니요 | 예 |
| F1 | drag selection → request selection 값 추출 | 아니요 | 예 |
| F2 | server range → DOM Range 복원 | 아니요 | 예 |
| F3 | ACTIVE 4px 상단선 하이라이트 | 아니요 | 예 |
| F4 | 클릭/hover/focus 및 중첩 우선순위 | 아니요 | 예 |
| F5 | 실제 조회 API 연결 | 예 | 아니요 |
| F6 | 데스크톱 rail·sidebar read UI | 조회 API 또는 fixture | 예 |
| F7 | 작성·수정·삭제 UI | mutation API | 아니요 |
| F8 | 모바일 BottomSheet와 최종 접근성/E2E | 조회 API | 부분적 |

권장 첫 PR은 F0~F3이다. 범위가 커지면 F0~F2와 F3을 별도 PR로 나눈다.

## 5. F0 — 계약 타입과 fixture

### 변경 후보

- `frontend/src/shared/api/posts/types.ts`
- `frontend/src/features/post-detail/model/inline-comment.fixture.ts`
- `frontend/src/features/post-detail/lib/render-post-detail-content.ts`
- `frontend/src/features/post-detail/lib/render-post-detail-content.unit.test.ts`

### 작업

1. 이름 있는 객체 계약을 interface로 정의한다.

```ts
export type InlineCommentAnchorState = 'ACTIVE' | 'OUTDATED';

export interface InlineCommentRangeResponse {
  startOffset: number;
  endOffset: number;
}

export interface InlineCommentAnchorResponse {
  anchorId: number;
  range: InlineCommentRangeResponse;
  selectedText: string;
  state: InlineCommentAnchorState;
  comments: InlineCommentResponse[];
}

export interface InlineCommentBlockResponse {
  blockId: string;
  anchors: InlineCommentAnchorResponse[];
}
```

2. ACTIVE, OUTDATED, 중첩, emoji/surrogate pair, inline link/style을 포함한 fixture를 만든다.
3. `renderPostDetailContent`가 댓글 지원 블록의 단일 텍스트 root에 다음 표식을 추가한다.

```html
data-inline-comment-root
data-inline-comment-block-id="block-id"
```

4. 초기 지원 범위는 paragraph, heading, bullet/number/check list item, quote, toggle title, codeBlock으로 고정한다. table과 비텍스트 블록은 표식하지 않는다.
5. root의 Text node 연결 결과가 BlockNote JSON에서 기대한 plain text와 같은지 renderer unit test로 고정한다.

### 완료 조건

- 같은 blockId에 선택용 root가 정확히 하나다.
- nested toggle 자식은 각자의 blockId/root를 가진다.
- editor UI label, list marker, checkbox, Mermaid preview는 root text에 포함되지 않는다.
- API 배열 순서가 보존되는 fixture가 있다.

## 6. F1 — drag selection 값 추출

### 변경 후보

- `frontend/src/features/post-detail/lib/inline-comment-selection.ts`
- `frontend/src/features/post-detail/lib/inline-comment-selection.unit.test.ts`
- 필요할 때만 `frontend/src/features/post-detail/hooks/use-inline-comment-selection.ts`

### 순수 함수 경계

```ts
export interface InlineCommentSelectionDraft {
  blockId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  range: Range;
}

export function createInlineCommentSelectionDraft(
  selection: Selection,
  article: HTMLElement,
): InlineCommentSelectionDraft | null;
```

`Range`는 플로팅 버튼 위치 계산에만 쓰는 일시적인 client 값이며 API request에는 포함하지 않는다. sidebar를 열 때는 직렬화 가능한 네 필드만 별도 state로 복사한다.

### 알고리즘

1. `rangeCount === 1`이고 selection이 collapse되지 않았는지 확인한다.
2. start/end container가 article 안에 있는지 확인한다.
3. Text node boundary는 parent element부터, Element boundary는 해당 element부터 가장 가까운 `[data-inline-comment-root]`를 찾는다.
4. 양 끝 root가 같은 DOM element인지 확인한다. 다르면 `null`을 반환하고 브라우저 selection은 유지한다.
5. root의 `data-inline-comment-block-id`를 읽는다. 없거나 빈 값이면 `null`이다.
6. root 시작부터 normalized DOM Range의 start/end까지 임시 Range를 만들고 `toString().length`로 UTF-16 offset을 계산한다.
7. root Text node를 이어 붙인 canonical DOM text에서 `slice(startOffset, endOffset)`을 수행해 `selectedText`를 만든다.
8. `selectedText`가 empty/whitespace-only이면 `null`이다. trim한 값을 payload로 바꾸지는 않는다.
9. 유효하면 immutable draft를 반환한다.

### 반드시 테스트할 경계

- 한 paragraph의 plain text 선택
- inline `<strong>`, `<code>`, `<a>`를 가로지르는 선택
- emoji 앞/뒤와 surrogate pair가 포함된 선택
- 역방향 drag가 정규화된 start/end를 반환
- 같은 block 내부 선택
- 서로 다른 block을 가로지르는 선택은 `null`
- article 밖에서 시작하거나 끝나는 선택은 `null`
- collapse, whitespace-only, 미지원 block은 `null`
- blockId가 누락된 root는 `null`
- DOM Range 위치용 값과 API 직렬화 값이 분리됨

### UI 연결 범위

F1에서는 실제 작성 API나 sidebar를 연결하지 않는다. `PostDetailContent`의 작은 hook이 desktop에서만 `selectionchange`/`pointerup`을 관찰해 draft를 보관할 수 있지만, production 작성 버튼은 다음 UI 단위까지 숨겨도 된다. 우선순위는 순수 함수와 테스트다.

### 완료 조건

- 네 request 값이 UTF-16 기준으로 안정적으로 추출된다.
- 블록 횡단 selection에서는 작성 후보가 생성되지 않는다.
- 프론트가 서버용 offset을 code point 단위로 변환하지 않는다.

## 7. F2 — 서버 range를 DOM Range로 복원

### 변경 후보

- `frontend/src/features/post-detail/lib/inline-comment-range.ts`
- `frontend/src/features/post-detail/lib/inline-comment-range.unit.test.ts`

### 순수 함수 경계

```ts
export function restoreInlineCommentRange(
  root: HTMLElement,
  range: InlineCommentRangeResponse,
): Range | null;
```

필요하면 별도의 `findInlineCommentRoot(article, blockId)` 함수를 같은 파일에 둔다. CSS selector에 넣기 전에 `CSS.escape(blockId)`를 사용하거나 모든 root를 순회해 dataset exact match를 수행한다.

### 알고리즘

1. `0 <= startOffset < endOffset`만 구조적으로 확인한다.
2. `TreeWalker(SHOW_TEXT)`로 root 아래 Text node를 문서 순서대로 순회한다.
3. 각 node의 `nodeValue.length`를 UTF-16 누적 길이에 더한다.
4. start/end가 속한 node와 node-local offset을 찾는다. end가 node 경계와 같을 때 일관된 규칙을 적용한다.
5. 두 boundary를 찾으면 DOM Range를 반환한다.
6. root 총 길이를 벗어나거나 Text node가 없으면 `null`이다.

중요: 이 함수는 `selectedText`를 받지 않는다. 문자열 비교, 검색, offset 보정 또는 OUTDATED 판정을 수행할 여지를 API부터 제거한다.

### 반드시 테스트할 경계

- 단일 Text node
- 여러 inline element로 나뉜 Text node
- emoji/surrogate pair offset
- start/end가 Text node 경계와 정확히 일치
- 마지막 문자까지 선택하는 end-exclusive range
- 음수, 역전, zero-length, root 범위 초과는 `null`
- 빈 root는 `null`

### 완료 조건

- 유효한 server range가 예상 DOM Range로 복원된다.
- 복원 실패는 예외가 아니라 `null`이다.
- selectedText를 통한 fallback이 존재하지 않는다.

## 8. F3 — ACTIVE 하이라이트 thin slice

### 변경 후보

- `frontend/src/features/post-detail/ui/InlineCommentHighlights.tsx`
- `frontend/src/features/post-detail/ui/InlineCommentHighlights.component.test.tsx`
- `frontend/src/features/post-detail/hooks/use-inline-comment-highlight-layout.ts`
- `frontend/src/features/post-detail/ui/PostDetailContent.tsx`
- 게시글 상세 전용 style 파일 또는 기존 post detail CSS

### 입력 경계

```ts
interface InlineCommentHighlightsProps {
  article: HTMLElement;
  blocks: InlineCommentBlockResponse[];
}
```

F3에서는 `blocks`를 fixture 또는 상위 prop으로 주입한다. fetch를 컴포넌트 안에 섞지 않는다.

### 렌더링

1. blocks와 anchors 배열 순서를 그대로 순회한다.
2. `state !== 'ACTIVE'`이면 root 탐색과 Range 복원을 건너뛴다.
3. blockId로 root를 찾고 F2 함수로 Range를 복원한다.
4. 복원 실패 anchor만 생략하고 서버 상태나 다른 anchor에는 영향 주지 않는다.
5. `Range.getClientRects()`를 block wrapper 좌표로 변환한다.
6. 각 rect 상단에 약 4px line을 absolute overlay로 표시한다. 본문 background/underline은 변경하지 않는다.
7. anchor의 원래 배열 index를 z-index 증가값으로 쓴다. ACTIVE filter 뒤 새 index를 만들지 않는다. 즉 OUTDATED가 중간에 있어도 서버 원본 index가 유지된다.
8. line은 `pointer-events: none`으로 텍스트 selection을 방해하지 않는다.
9. resize, font load와 toggle layout 변화 후 rect를 다시 계산한다. offset이나 서버 데이터는 바꾸지 않는다.

### 첫 구현에서 의도적으로 미루는 것

- highlight 클릭으로 sidebar 열기
- hover text color 피드백
- focus proxy
- block comments count/button
- API loading/error 상태

### 반드시 테스트할 동작

- ACTIVE만 line이 생기고 OUTDATED는 생성되지 않음
- 같은 block의 여러 anchor가 모두 표시됨
- invalid ACTIVE range 하나만 생략됨
- 서버 anchor 배열 index가 z-index로 보존됨
- 여러 줄 Range는 rect 수만큼 line을 생성함
- rerender와 resize 뒤 stale overlay가 남지 않음
- unmount 시 observer/listener 정리

jsdom은 실제 layout rect를 계산하지 못하므로 `Range.prototype.getClientRects`와 element rect를 좁게 mock한다. 실제 줄 배치와 4px 시각 품질은 후속 Playwright에서 검증한다.

### 완료 조건

- fixture만으로 실제 PostDetailContent 위에 ACTIVE 상단선이 보인다.
- OUTDATED와 invalid ACTIVE range는 본문을 깨뜨리지 않는다.
- 원문 DOM을 감싸거나 수정하지 않는다.

## 9. F4 — 하이라이트 상호작용과 중첩

F3 이후 별도 단위로 진행한다.

- pointer 위치를 root UTF-16 offset으로 변환한다.
- 해당 offset을 포함하는 ACTIVE anchors 중 서버 배열의 마지막 anchor 하나를 선택한다.
- click은 선택된 anchor id를 상위 panel controller에 전달한다.
- pointermove/focus 시 4px line을 강화하고 CSS Custom Highlight API로 해당 Range text에 피드백한다.
- anchor당 focus proxy는 하나만 생성한다.
- block 우측 상단 comments 아이콘/count를 추가하고 해당 block의 모든 ACTIVE anchor 목록을 여는 event를 제공한다.
- 드래그 selection이 생긴 pointerup은 thread click으로 처리하지 않는다.

완료 조건은 중첩 구간 click이 마지막 ACTIVE 하나만 선택하고, 가려진 anchor가 block 버튼 event를 통해 모두 노출되는 것이다.

## 10. F5 이후 — 제품 UI 연결 순서

### F5 실제 조회 API

- `shared/api/posts/api.ts`에 raw GET 추가
- `queries/comments/query-options.ts`, `use-query.ts` 추가
- postId를 query key에 포함
- polling/refetchInterval 없음
- mapper에서 정렬하거나 상태를 재계산하지 않음
- API가 준비될 때까지 fetch 코드는 merge하지 않거나 disabled feature boundary 뒤에 둔다.

### F6 데스크톱 read UI

1. 기존 ToC를 왼쪽 sticky column으로 이동
2. 기존 오른쪽 ToC 영역에 sticky `All Comments` 버튼 배치
3. 오른쪽 400~450px sidebar shell 구현
4. 공통 `[인용 + 댓글 목록]` read component 구현
5. ALL은 ACTIVE/OUTDATED, BLOCK은 ACTIVE 전체, ANCHOR는 하나만 표시
6. ACTIVE 인용은 sidebar를 닫고 Range/focus proxy로 이동
7. OUTDATED 또는 Range 복원 실패 인용은 navigation control을 제공하지 않음

### F7 mutation UI

- desktop selection floating 작성 버튼
- sidebar 하단 sticky composer
- ALL/BLOCK mode에서 ACTIVE thread 선택 전 disabled
- create request는 F1의 네 값과 content 사용
- update/delete는 API의 `canEdit`/`canDelete`만으로 control 표시
- 성공 후 comments query invalidate
- 로그인 안내, pending/error와 409 stale selection 처리

### F8 모바일·접근성·E2E

- 상단 All Comments 버튼과 BottomSheet read UI
- ACTIVE highlight click으로 단일 thread 표시
- 모바일에는 selection listener, 작성 버튼과 form을 mount하지 않음
- focus open/restore, Escape, accessible name, reduced-motion 검증
- 실제 브라우저에서 multi-line rect, zoom, font load, link/code selection과 scroll 이동 E2E

## 11. 권장 PR 구성

### PR 1 — 텍스트 좌표 기반

- F0~F2
- renderer root 표식
- selection → payload 순수 로직
- response range → DOM Range 순수 로직
- unit test 중심

PR 제목 예시: `[Feature] #이슈번호 인라인 댓글 텍스트 범위 기반 추가`

### PR 2 — 읽기 전용 하이라이트

- F3
- fixture 주입
- 4px line overlay
- component test

PR 제목 예시: `[Feature] #이슈번호 인라인 댓글 하이라이트 추가`

### PR 3 — 상호작용과 데스크톱 읽기 UI

- F4 + F6 read-only 부분
- 중첩 click, block count, ToC 이동, sidebar
- 조회 API가 없으면 fixture adapter를 유지하고 network layer는 포함하지 않음

### PR 4 — API와 mutation

- F5 + F7
- 백엔드 계약이 실제로 제공된 뒤 진행

### PR 5 — 모바일과 E2E

- F8

## 12. 첫 구현 범위의 acceptance criteria

F0~F3만 먼저 구현할 때의 완료 기준이다.

- [ ] 지원 가능한 한 block root 안의 drag에서 정확한 `blockId`가 추출된다.
- [ ] offset은 UTF-16, `[startOffset, endOffset)`이다.
- [ ] `selectedText`는 root canonical DOM text를 offset으로 slice한 값이다.
- [ ] block을 가로지른 drag에는 draft가 생성되지 않는다.
- [ ] link/style/code span과 emoji가 있어도 offset round trip이 성립한다.
- [ ] ACTIVE만 본문에 약 4px 상단선으로 표시된다.
- [ ] OUTDATED는 본문 하이라이트 복원을 시도하지 않는다.
- [ ] invalid ACTIVE range는 해당 하이라이트만 생략한다.
- [ ] 프론트는 selectedText 재검색, offset 보정과 state 재판정을 하지 않는다.
- [ ] 서버 anchors 배열의 원래 index가 z-index에 반영된다.
- [ ] 원문 DOM과 에디터의 background/underline을 변경하지 않는다.

## 13. 검증 순서

각 PR에서 가장 작은 검사부터 실행한다.

1. 변경한 pure utility unit test
2. renderer unit test
3. highlight component test
4. `cd frontend && pnpm typecheck`
5. `cd frontend && pnpm lint`
6. PR 완료 전 `cd frontend && pnpm check`
7. 실제 layout을 포함하는 F3/F4 이후 관련 Playwright spec

백엔드가 없으므로 F0~F4에서는 network 성공을 완료 조건으로 두지 않는다. 대신 fixture가 실제 응답 shape와 배열 순서를 그대로 사용한다.

## 14. 중단·확장 판단 기준

다음 중 하나가 발생하면 F0~F3에서 멈추고 기반 PR을 먼저 완료한다.

- 지원 block마다 텍스트 root가 둘 이상 생겨 serialization 계약이 불명확함
- BlockNote renderer의 DOM text와 기대 canonical text가 일치하지 않음
- emoji/inline markup round trip test가 실패함
- overlay가 원문 selection 또는 link interaction을 방해함
- F3에 sidebar/API/mutation 상태가 섞이기 시작함

F0~F3이 통과한 뒤에만 F4 이상의 UI를 진행한다. 이렇게 하면 백엔드 일정과 무관하게 가장 위험한 offset·Range 계약을 먼저 확정할 수 있다.
