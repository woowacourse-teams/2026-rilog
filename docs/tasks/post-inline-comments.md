# 게시글 인라인 댓글 상세 설계 및 구현 계획

프론트엔드의 단계별 작업 단위와 백엔드 없이 먼저 구현할 thin slice는 `docs/tasks/post-inline-comments-frontend-plan.md`를 따른다.

## 1. 목표

게시글 상세 본문의 한 BlockNote 블록 안에서 선택한 텍스트 범위에 댓글을 작성하고, 인용문과 평면 댓글 목록을 하나의 앵커 스레드로 조회한다. 같은 게시글·블록·범위·선택 문자열에는 하나의 앵커만 존재한다.

백엔드는 본문 수정에 따른 drift, 앵커 상태, 그룹핑과 권한을 책임진다. 프론트엔드는 서버가 반환한 `state`, `range`, 배열 순서와 권한 값을 그대로 표현한다.

## 2. 비목표

- 댓글 답글 또는 대댓글
- 내 댓글 모아보기
- 실시간 갱신, 웹소켓, polling
- 여러 블록을 하나의 앵커로 묶는 댓글
- 모바일 인라인 댓글 작성
- 작성/수정 화면의 인라인 댓글 표시
- `OUTDATED` 앵커의 본문 위치 이동
- 프론트엔드의 drift 검사, 문자열 재검색, offset 보정 또는 상태 재분류

## 3. 현재 저장소 기준 영향 범위

### 프론트엔드

- `BasePostDetail`은 본문과 목차를 조립하며, 현재 넓은 화면에서 목차가 본문 오른쪽에 있다. 데스크톱 3열을 `목차 / 본문 / 댓글 도구·패널` 순서로 바꿔야 한다.
- `PostDetailContent`는 이미 브라우저 이벤트와 DOM 참조를 가진 최소 Client Component다. 선택 판독, 서버 Range 복원, 하이라이트 hit-test는 이 경계 또는 그 아래 전용 controller에 둔다.
- `renderPostDetailContent`가 BlockNote HTML을 서버에서 만들며 `.bn-block-outer[data-id]`와 `.bn-inline-content`가 존재한다. 여기서 지원 블록의 선택 루트를 명시적으로 표식한다.
- `shared/ui/modal/BottomSheet`는 모바일 전체/단일 스레드 표면에 재사용할 수 있다.
- `shared/api`에는 댓글 resource가 없으므로 `/v1/posts/...`의 첫 segment 규칙에 따라 `shared/api/posts` 아래 comments concern을 추가한다.

### 백엔드

- 현재 `comment` 도메인은 게시글 단위 루트 댓글과 1단계 답글, 작성자 전용 수정·삭제를 구현한다.
- 현재 `comment` 테이블에는 `parent_id`와 `anchor_type=POST`만 있고 범위 앵커 테이블이 없다.
- `PostService`에는 게시글 작성자 또는 ACTIVE OWNER/ADMIN의 게시글 삭제 권한 계산이 이미 있다. 인라인 댓글도 동일한 정책 함수를 재사용할 수 있도록 별도 policy로 추출한다.
- 게시글 본문은 JSON으로 저장되며 `PostContent`는 현재 파일 URL만 순회한다. 댓글용 block lookup/텍스트 직렬화 책임을 별도 도메인 서비스에 둔다.

### 공통 계약

- 응답의 `blockId -> anchors[] -> comments[]` 형태, UTF-16 offset, 상태, 권한 필드가 프론트/백엔드 계약이다.
- 게시글 수정과 댓글 조회가 앵커 정합성에 영향을 주므로 ADR 0001을 함께 적용한다.

## 4. API 계약

### 4.1 endpoint

현재 댓글 경로를 유지한다.

- `GET /v1/posts/{postId}/comments`: 게시글의 모든 인라인 댓글 조회. 인증은 선택 사항이며 로그인 사용자가 있으면 그 사용자를 기준으로 권한을 계산한다.
- `POST /v1/posts/{postId}/comments`: 인라인 댓글 작성. 로그인 필수.
- `PATCH /v1/comments/{commentId}`: 댓글 내용 수정. 로그인 필수.
- `DELETE /v1/comments/{commentId}`: 댓글 삭제. 로그인 필수.
- 답글 endpoint `POST /v1/posts/{postId}/comments/{commentId}/replies`는 인라인 댓글 계약에서 제거한다.

모든 응답은 기존 `ApiResponse` envelope를 유지한다. 아래 구조는 `data`의 block item이며, 전체 조회의 `data`는 이 item의 배열이다. 빈 댓글은 빈 배열이다.

```json
{
  "blockId": "block-123",
  "anchors": [
    {
      "anchorId": 1,
      "range": { "startOffset": 0, "endOffset": 11 },
      "selectedText": "Spring Boot",
      "state": "ACTIVE",
      "comments": [
        {
          "commentId": 10,
          "content": "Spring Framework와 차이도 설명해주세요.",
          "author": {
            "userId": 1,
            "nickname": "송송",
            "slug": "koreaioi",
            "profileImageUrl": "https://example.com/profiles/1.png",
            "isAuthor": true,
            "isBlogMember": true
          },
          "canEdit": true,
          "canDelete": true,
          "createdAt": "2026-09-17T10:20:00",
          "updatedAt": "2026-09-17T10:20:00"
        }
      ]
    }
  ]
}
```

응답 규칙:

- `GET`은 `ACTIVE`와 `OUTDATED` 앵커를 모두 반환한다.
- block과 anchor의 서버 배열 순서를 보존한다. 프론트는 재정렬하지 않는다.
- 삭제된 댓글과 댓글이 하나도 남지 않은 앵커는 응답에서 제외한다. 빈 앵커는 별도 정리 작업 없이 남아도 UI 계약에는 노출하지 않는다.
- comments는 `createdAt ASC, commentId ASC`로 고정한다.
- anchors는 생성 순서인 `anchorId ASC`를 기본 순서로 고정한다. 이 순서가 곧 z-index 계약이므로 repository query에 명시한다.
- blocks는 현재 게시글의 BlockNote 문서 순서로 반환하고, 현재 본문에 없는 `OUTDATED` block은 안정적인 최초 앵커 생성 순서로 뒤에 붙인다.
- `profileImageUrl`은 nullable이다.
- `isAuthor`는 댓글 작성자가 게시글 작성자인지, `isBlogMember`는 조회 시점에 해당 블로그의 ACTIVE 멤버인지 뜻한다.

### 4.2 작성 요청

```json
{
  "blockId": "block-123",
  "startOffset": 0,
  "endOffset": 11,
  "selectedText": "Spring Boot",
  "content": "Spring Framework와 차이도 설명해주세요."
}
```

검증 순서:

1. 게시글이 조회·댓글 작성 가능한 공개 게시글인지 확인한다.
2. `blockId`가 현재 본문에 존재하며 댓글을 지원하는 블록인지 확인한다.
3. `0 <= startOffset < endOffset <= blockText.length()`를 UTF-16 기준으로 확인한다.
4. `blockText.substring(startOffset, endOffset)`과 `selectedText`가 code-unit 단위로 정확히 같은지 확인한다.
5. content의 기존 길이/공백 검증을 적용한다.
6. 불일치하면 stale 화면의 잘못된 앵커를 만들지 않고 `409 CONFLICT`의 `COMMENT_ANCHOR_RANGE_MISMATCH`를 반환한다. 지원하지 않는 블록은 `400 BAD_REQUEST`의 `COMMENT_BLOCK_UNSUPPORTED`, 범위 형식 오류는 `INVALID_COMMENT_RANGE`로 구분한다.
7. 동일 키의 앵커를 찾거나 원자적으로 생성한 후 댓글을 추가한다.

작성 성공 응답은 현재처럼 `{ "commentId": number }`를 유지해도 되며, mutation 성공 후 GET query를 invalidate하여 서버가 확정한 그룹·상태·권한을 다시 받는다.

### 4.3 수정과 삭제

- PATCH body는 기존처럼 `{ "content": string }`이다.
- 수정은 활성 댓글의 작성자만 허용한다.
- 삭제는 활성 댓글의 작성자이거나 해당 게시글 삭제 권한을 가진 사용자에게 허용한다.
- 프론트는 `canEdit` / `canDelete`만으로 메뉴를 표시한다. 서버는 같은 policy를 mutation에서 다시 계산한다.
- 삭제는 soft delete를 유지한다. 인라인 댓글은 답글 cascade가 없다.

## 5. 텍스트 직렬화와 offset 계약

### 5.1 기준

- offset 단위: UTF-16 code unit
- 범위: 시작 포함, 끝 제외 `[startOffset, endOffset)`
- JavaScript: 문자열 `.length`, `slice`와 DOM Range를 누적 text-node 길이로 변환하면 별도 code point 변환 없이 UTF-16 기준이 된다.
- Java: `String.length()`와 `substring()`이 동일한 UTF-16 code unit 기준이다. `codePointCount` 또는 code point index로 변환하지 않는다.
- 비교는 Unicode normalization이나 trim 없이 저장된 문자열 그대로 수행한다.

### 5.2 지원 텍스트 루트

`renderPostDetailContent`가 각 지원 블록의 댓글 대상 요소에 아래 표식을 추가한다.

```html
<div class="bn-block-outer" data-id="block-123">
  <div data-inline-comment-root data-inline-comment-block-id="block-123">...</div>
</div>
```

초기 지원 대상은 하나의 명확한 inline-content root를 갖고 서버 JSON과 DOM 문자열의 동등성을 보장할 수 있는 블록으로 제한한다.

- 지원: paragraph, heading, bulletListItem, numberedListItem, checkListItem, quote, toggleListItem의 제목, codeBlock의 code text
- 미지원: image, file, video/audio 등 비텍스트 블록, table처럼 한 blockId 아래 여러 셀 텍스트 루트가 생기는 블록, Mermaid preview처럼 원문 외 파생 UI
- link와 inline style은 텍스트 leaf만 이어 붙이므로 지원한다.
- toggle 자식은 각각 자신의 `.bn-block-outer[data-id]`와 root를 사용하며 부모 제목과 합치지 않는다.

프론트는 `[data-inline-comment-root]` 밖의 selection을 거부한다. 선택의 양 끝이 같은 root에 있고 selection이 collapse되지 않았을 때만 작성 후보를 만든다. 단순히 같은 article 또는 같은 `.bn-block-outer`에 있다는 조건으로 완화하지 않는다.

### 5.3 canonical block text

백엔드 serializer는 block의 inline content를 문서 순서대로 순회하며 text leaf의 `text` 값을 연결한다. link content는 재귀적으로 같은 방식으로 연결한다. UI label, list marker, checkbox, toggle button, 이미지 alt, Mermaid preview와 자식 block 텍스트는 포함하지 않는다.

프론트는 선택 root 아래의 DOM `Text` node만 TreeWalker로 문서 순서대로 이어 붙인다. 서버 렌더 시 root의 `textContent`와 백엔드 canonical text가 정확히 같음을 block type별 계약 테스트로 고정한다. Shiki가 code text를 여러 span으로 나눠도 Text node 연결 결과는 같아야 한다.

### 5.4 DOM selection을 request range로 변환

1. `selection.rangeCount === 1`, 비-collapse인지 확인한다.
2. Range 시작/끝 container에서 각각 가장 가까운 댓글 root를 찾는다. Text node면 parent element부터 찾는다.
3. 두 root가 동일하지 않으면 플로팅 작성 버튼을 숨긴다. 여러 블록에 걸친 드래그 자체는 건드리지 않는다.
4. root 시작부터 selection 시작/끝까지 임시 DOM Range를 만들고 `toString().length`로 offset을 얻는다.
5. 브라우저의 역방향 드래그와 무관하게 DOM Range의 정규화된 start/end를 쓴다.
6. `selectedText = canonicalText.slice(startOffset, endOffset)`으로 만든다. `Selection.toString()`은 브라우저가 시각적 개행을 삽입할 수 있으므로 요청 값의 출처로 쓰지 않는다.
7. empty/whitespace-only selection은 작성 버튼을 표시하지 않는다.

## 6. 백엔드 데이터 모델

### 6.1 `comment_anchor`

- `id BIGINT PK`
- `post_id BIGINT NOT NULL FK`
- `block_id VARCHAR(...) NOT NULL`
- `start_offset INT NOT NULL`
- `end_offset INT NOT NULL`
- `selected_text TEXT NOT NULL` (binary/case-sensitive 비교)
- `selected_text_hash BINARY(32) NOT NULL`
- `state ENUM('ACTIVE','OUTDATED') NOT NULL`
- `created_at`, `updated_at`, `deleted_at`

동일 앵커 키는 `(post_id, block_id, start_offset, end_offset, selected_text_hash)`다. 해시는 UTF-8로 인코딩한 원문 bytes의 SHA-256이며, 조회 후 반드시 `selected_text`도 exact compare한다. unique index로 동시 생성 경쟁을 막고 duplicate key가 발생하면 기존 row를 다시 조회해 재사용한다. 해시 충돌로 원문이 다르면 재사용하지 않고 충돌 오류로 중단한다.

`start_offset < end_offset`, offset non-negative check constraint를 둔다. MySQL/H2 양쪽 migration/test 호환성을 확인한다.

### 6.2 `comment`

- `anchor_id BIGINT NOT NULL FK`를 추가하고 인라인 댓글은 이 FK로만 앵커에 속한다.
- `parent_id`와 답글 생성 로직은 제거한다.
- `anchor_type`은 단일 값만 남으므로 제거하거나 migration 호환 단계에서 `INLINE`으로 전환한다. 최종 모델에는 중복 discriminator를 두지 않는다.
- 기존 운영 데이터가 있으면 배포 전에 보존/폐기/별도 legacy endpoint 중 하나를 결정해야 한다. 운영 데이터가 없다는 것이 확인되면 schema와 코드를 직접 전환한다.

## 7. drift 판정과 갱신

### 7.1 알고리즘

각 앵커를 해당 `blockId`의 현재 canonical text와 비교한다.

1. block이 없거나 더 이상 지원되는 텍스트 block이 아니면 `OUTDATED`.
2. 저장 range가 유효하고 `currentText.substring(start, end).equals(selectedText)`이면 `ACTIVE`, offset 유지.
3. 아니면 current text에서 `selectedText`의 모든 정확 일치 시작 offset을 UTF-16 기준으로 찾는다. 빈 selectedText는 생성 단계에서 금지한다.
4. 후보가 정확히 하나면 그 위치로 start/end를 갱신하고 `ACTIVE`.
5. 후보가 없거나 둘 이상이면 잘못된 위치를 추측하지 않고 `OUTDATED`, 기존 offset 유지.

반복 문자열에서 이전 위치와 가장 가까운 후보를 고르는 방식은 잘못된 인용으로 연결될 수 있으므로 사용하지 않는다. 현재 계약에 주변 문맥 정보가 없기 때문에 유일 일치만 안전하게 재탐색한다.

### 7.2 실행 시점과 동시성

- 게시글 수정 성공 트랜잭션에서 본문 저장 후 해당 게시글 앵커를 일괄 reconcile한다. 이 경로가 주 갱신 지점이다.
- GET에서도 응답 조립 전 reconcile을 수행해 migration 이전 데이터나 누락된 이벤트를 self-heal한다. 따라서 조회 service는 read-only가 아니다.
- 게시글 수정과 댓글 작성/조회가 겹칠 때 같은 post row에 대한 lock 또는 동일한 transaction serialization 정책으로 본문 version과 anchor 판정의 snapshot을 맞춘다.
- dirty anchor만 update하여 불필요한 `updatedAt` 변경을 피한다.
- `OUTDATED`도 이후 본문 수정으로 유일 일치가 다시 생기면 `ACTIVE`로 복귀할 수 있다.

## 8. 권한 모델

서버의 단일 `InlineCommentPermissionPolicy`가 응답과 mutation 모두에 사용된다.

| 조회자 | canEdit | canDelete |
|---|---:|---:|
| 비로그인 | false | false |
| 댓글 작성자 | true | true |
| 게시글 작성자 | false | true |
| 팀 블로그 OWNER | false | true |
| 팀 블로그 ADMIN | false | true |
| 팀 블로그 MEMBER | false | false |
| 관계없는 사용자 | false | false |

댓글 작성자 여부를 먼저 계산하되, 삭제는 `isCommentAuthor || canDeletePost`다. MEMBER가 게시글 작성자이면 `canDeletePost`가 true이므로 삭제 가능하다. 수정은 오직 `isCommentAuthor`다.

개인 블로그도 기존 게시글 권한 정책을 재사용한다. 탈퇴/삭제된 멤버는 권한이 없다. `author.isBlogMember` 역시 ACTIVE membership만 true다.

## 9. 프론트엔드 구조

### 9.1 데이터 계층

`frontend/src/shared/api/posts`에 다음을 추가한다.

- `types.ts`: 이름 있는 응답 객체 interface와 `InlineCommentAnchorState` union
- raw API 함수: 전체 조회, 작성, 수정, 삭제
- `queries/comments/query-options.ts`, `use-query.ts`
- `mutations/use-create-comment-mutation.ts`, `use-update-comment-mutation.ts`, `use-delete-comment-mutation.ts`

mutation 성공 시 해당 post의 comments query만 invalidate한다. 실시간 refresh나 polling option을 넣지 않는다. 게시글 상세 진입 시 한 번 조회하며 일반 TanStack Query stale 정책 안에서만 재요청한다.

### 9.2 상태 모델

사이드바와 바텀시트가 같은 content model을 사용한다.

```ts
type CommentPanelMode =
  | { type: 'ALL' }
  | { type: 'BLOCK'; blockId: string }
  | { type: 'ANCHOR'; anchorId: number }
  | { type: 'CREATE'; draft: SelectionDraft };
```

- `ALL`: ACTIVE와 OUTDATED를 모두 서버 순서로 렌더.
- `BLOCK`: 해당 block의 ACTIVE anchor 전부를 서버 순서로 렌더.
- `ANCHOR`: 선택한 ACTIVE anchor 하나.
- `CREATE`: 선택 인용과 작성 form. 데스크톱에서만 진입 가능.

`InlineCommentThreadContent`는 인용 + 상태 안내 + 댓글 목록 + 권한 메뉴를 렌더하는 공통 콘텐츠다. Desktop shell은 sidebar, mobile shell은 BottomSheet만 담당한다.

데스크톱 sidebar는 별도의 `composerTargetAnchorId`를 가진다. `ANCHOR`와 `CREATE` mode는 대상이 명확하고, `ALL`/`BLOCK`처럼 여러 anchor를 보여주는 mode에서는 사용자가 ACTIVE thread의 인용 또는 "이 스레드에 댓글 달기" control을 선택해 작성 대상을 정한다. OUTDATED anchor는 작성 대상으로 선택할 수 없다. 이 값은 서버 데이터의 순서나 상태를 바꾸지 않는 UI 선택 상태다.

### 9.3 상세 레이아웃

넓은 화면의 `contentLayout`을 `목차 / 42rem 본문 / 댓글 rail`로 변경한다.

- 기존 오른쪽 목차는 왼쪽 sticky column으로 이동한다.
- 기존 목차가 있던 오른쪽 rail 상단에는 sticky `All Comments` 버튼을 둔다. 댓글이 없어도 전체 목록의 진입점은 유지하되 count는 0으로 표시할 수 있다.
- ACTIVE 인라인 댓글이 있는 block의 오른쪽 상단에는 comments 아이콘과 해당 block의 ACTIVE 댓글 count를 표시한다. block button은 block wrapper 기준 absolute 배치하고 같은 값을 accessible name에도 포함한다. OUTDATED만 있는 block에는 이 버튼을 표시하지 않는다.
- `All Comments`, block comments 버튼, ACTIVE 하이라이트 중 하나를 누르면 오른쪽에서 sidebar가 열린다.
- sidebar 너비는 25~28rem 범위(약 400~448px)로 두고 viewport 여유에 따라 clamp한다. 본문 폭은 유지하고 sidebar는 오른쪽 rail 위에 확장하거나 overlay한다.
- sidebar 본문은 `[인용 + 댓글 목록]` 단위이며, ALL/BLOCK mode에서는 이 단위를 서버 anchor 순서대로 반복한다.
- sidebar 하단에는 하나의 sticky 댓글 입력 영역을 둔다. 단일 anchor mode에서는 즉시 해당 anchor를 대상으로 하고, 여러 anchor mode에서는 선택된 ACTIVE thread를 대상으로 한다. 아직 선택하지 않았다면 input은 disabled 상태와 "댓글을 추가할 인용을 선택해 주세요" 안내를 표시한다. 비로그인 사용자는 입력 대신 로그인 안내를 본다.
- viewport가 기준 폭보다 작아지면 모바일/좁은 layout으로 전환한다.
- 작성/수정 route는 이 widget을 조립하지 않으므로 댓글 UI가 나타나지 않는다.

모바일:

- 게시글 상단에 전체 댓글 보기 버튼.
- ACTIVE 하이라이트 클릭은 단일 thread BottomSheet.
- selection listener, 선택 작성 버튼과 CREATE mode/form을 mount하지 않는다.
- CSS media query만으로 숨기지 않고 `matchMedia` 기반 interaction gate도 적용해 숨겨진 작성 동작이 실행되지 않게 한다. 서버 API는 viewport를 신뢰하지 않는다.

## 10. 하이라이트, 중첩과 클릭 우선순위

### 10.1 Range 복원

각 ACTIVE anchor에 대해 root Text node를 TreeWalker로 순회해 누적 UTF-16 길이로 DOM Range의 start/end node와 local offset을 찾는다.

- 서버 range가 root 길이를 벗어나거나 Text node boundary로 변환되지 않으면 그 anchor의 하이라이트만 생략한다.
- 프론트는 `selectedText` 비교, 재검색, offset 수정, state 변경을 하지 않는다.
- 실패한 anchor는 여전히 전체/블록 목록에서 접근 가능하다. 개발 환경에서 postId/blockId/anchorId만 포함한 진단 로그를 남기고 본문 문자열은 기록하지 않는다.

### 10.2 렌더링 전략

교차 범위도 안전하게 표현하기 위해 원문 DOM을 `<mark>`로 감싸지 않는다.

1. 각 block wrapper에 `position: relative; isolation: isolate`를 적용한다.
2. 복원된 DOM Range의 `getClientRects()`로 시각 rect를 얻는다.
3. block wrapper 안의 전용 overlay layer에 rect별 highlight 요소를 absolute로 그린다. 각 rect는 에디터 본문의 배경색과 underline을 덮지 않도록 텍스트 범위 상단에 약 4px 두께의 line만 그린다. line은 실제 줄 상자의 위쪽에 붙이며 layout을 밀지 않는다.
4. overlay layer 자체는 새 stacking context를 만들지 않고, highlight line은 `position: absolute`를 명시한다.
5. anchor의 서버 배열 index를 `i`라 할 때 `z-index: var(--inline-comment-z-base) + i`를 쓴다. 개수 상한이나 clamp를 두지 않는다.
6. 마지막 anchor가 가장 높은 시각 우선순위를 가진다. 프론트는 state filter 외 배열 정렬을 하지 않는다.
7. resize, font load, toggle 펼침/접힘으로 layout이 바뀌면 `ResizeObserver`와 관련 UI event 뒤 rect만 다시 계산한다. API 데이터나 offset은 바꾸지 않는다.

overlay는 텍스트 선택을 방해하지 않도록 visual rect에 `pointer-events: none`을 사용한다. article의 click/pointer handler가 클릭 지점의 caret을 해당 root의 UTF-16 offset으로 변환하고, 그 offset을 포함하는 ACTIVE anchor를 서버 배열 순서로 검사해 마지막 anchor 하나만 연다. 이는 화면 z-index와 같은 우선순위를 명시적으로 보장한다. 드래그로 새 selection이 생긴 pointerup은 thread click으로 처리하지 않는다.

pointermove/focus로 가장 높은 ACTIVE anchor가 활성화되면 4px line의 색·두께 또는 opacity를 강화하고 해당 Range의 텍스트도 함께 피드백한다. 원문 DOM을 감싸지 않고 CSS Custom Highlight API의 공용 hover/focus highlight에 현재 Range만 등록해 text color 또는 text-shadow를 바꾼다. 기본 상태에서는 텍스트 색·배경·underline을 건드리지 않는다. 지원 환경 검증이 실패하면 시각 line 강화와 block 상단선 피드백은 유지하고, 지원 브라우저 범위를 구현 PR에 기록한다.

키보드 사용자는 block 댓글 버튼에서 모든 ACTIVE anchor에 접근할 수 있고, 각 overlay anchor의 첫 rect 옆에 한 개의 focus proxy button을 둔다. proxy는 `인용 댓글 열기: {selectedText 요약}` accessible name을 가지며 포커스 시 해당 anchor 전체 rect에 focus style을 적용한다. 같은 anchor의 여러 줄이 여러 tab stop을 만들지 않는다.

hover/focus 시 block 상단선, 해당 anchor의 4px line과 텍스트를 함께 강조한다. 애니메이션은 `prefers-reduced-motion: reduce`에서 제거하고 즉시 상태 전환한다.

## 11. 선택 버튼과 작성 흐름

- desktop pointer/keyboard selection이 유효할 때 Range 첫 rect 상단 중앙을 기준으로 floating 작성 버튼을 배치하되 viewport collision을 보정한다.
- scroll/resize/selectionchange 때 위치를 갱신하거나 selection이 무효면 닫는다.
- 버튼을 누를 때 request용 immutable `SelectionDraft`를 먼저 저장한 뒤 browser selection이 사라져도 form을 유지한다.
- 버튼 activation은 sidebar CREATE mode를 열고 focus를 댓글 textarea로 옮긴다.
- 성공하면 draft를 지우고 생성된 anchor가 포함된 query를 refetch한 뒤 해당 thread mode로 전환한다.
- 409 range mismatch이면 작성 내용을 보존하고 "본문이 변경되어 선택 영역을 확인할 수 없습니다. 다시 선택해 주세요."를 표시한다.
- 답글 UI, parent id, reply count를 만들지 않는다.

## 12. 전체·블록·단일 thread 표현

- 각 thread는 인용문, 상태, 댓글 목록을 하나의 묶음으로 렌더한다.
- 전체 목록은 ACTIVE/OUTDATED 모두 포함한다. OUTDATED에는 "본문 수정으로 인용 위치를 찾을 수 없습니다."를 표시하고 이동 control을 렌더하지 않는다.
- 블록 목록은 그 block의 ACTIVE anchor를 모두 보여준다. Range 복원이 실패한 ACTIVE도 서버상 ACTIVE이므로 목록에서는 제외하지 않는다.
- 하이라이트 click은 해당 ACTIVE 하나만 연다.
- DOM Range가 복원된 ACTIVE thread의 인용은 button/link 역할을 가지며 누르면 sidebar를 닫고 anchor 위치로 scroll한 뒤 focus proxy로 focus를 옮긴다. reduced-motion에서는 즉시 이동한다. ACTIVE지만 방어적으로 Range 복원에 실패한 경우에는 서버 상태를 바꾸지 않은 채 navigation control만 제공하지 않는다.
- OUTDATED thread는 상태 label을 명시하고 인용을 navigation control로 만들지 않는다. 인용문은 읽을 수 있지만 클릭해도 sidebar를 닫거나 본문으로 이동하지 않는다.
- sidebar 하단 composer는 현재 `composerTargetAnchorId`의 기존 ACTIVE thread에 `blockId`, 현재 `range`, `selectedText`를 다시 보내 평면 댓글을 추가한다. 서버의 동일 범위 재사용 규칙으로 기존 anchor에 연결한다. 여러 anchor mode에서 ACTIVE thread 선택 전에는 disabled이고, thread 선택 시 인용 요약을 입력 영역 위에 표시한다. OUTDATED thread에는 작성 control을 제공하지 않는다.
- 프로필 이미지와 nickname은 모두 사용자 profile route의 링크이며 같은 accessible name을 중복 낭독하지 않도록 한 링크로 묶는 것을 우선한다.
- comment menu는 `canEdit`, `canDelete`에 따라 항목을 독립적으로 표시한다.
- 비어 있음, 조회 실패, mutation 진행/실패 상태를 sidebar와 BottomSheet 모두에서 제공한다.

## 13. 접근성과 focus 관리

- 모든 icon-only control에 한국어 accessible name을 제공한다.
- sidebar/BottomSheet open 시 제목 또는 첫 actionable control로 focus를 이동한다.
- 닫을 때 열었던 전체 버튼, block 버튼, focus proxy 중 아직 DOM에 존재하는 trigger로 focus를 복원한다. 없으면 본문 heading으로 보낸다.
- Escape로 panel을 닫되 작성 내용이 있으면 기존 confirm modal 정책으로 유실을 막는다.
- sidebar가 modal 성격이면 focus trap과 background inert를 적용한다. 비모달 보조 panel로 구현할 경우 trap을 쓰지 않고 명확한 landmark/title과 닫기 경로를 제공한다. BottomSheet는 modal dialog로 처리한다.
- 하이라이트는 색만으로 상태를 전달하지 않고 hover/focus outline과 block button count를 병행한다.
- motion/scroll transition은 reduced-motion에서 제거한다.

## 14. 백엔드 구현 순서

1. migration과 `CommentAnchor`, `AnchorState` entity/repository를 추가하고 `Comment`를 anchor 소속 평면 모델로 전환한다.
2. `PostBlockTextSerializer`와 block type별 unit test를 먼저 추가한다.
3. `InlineCommentAnchorReconciler`의 exact-match, unique relocation, duplicate/no-match OUTDATED, 재활성화 테스트를 추가한다.
4. unique key 기반 `findOrCreate`와 동시 생성 integration test를 추가한다.
5. 게시글 권한 계산을 공용 policy로 추출하고 comment response/mutation에서 재사용한다.
6. 조회 DTO를 고정된 block/anchor/comment 구조로 교체하고 선택 인증을 연결한다.
7. 작성 request 검증과 PATCH/DELETE 정책을 구현하고 replies endpoint를 제거한다.
8. 게시글 update flow와 GET self-heal에 reconciler를 연결한다.
9. controller, service, repository integration test와 Swagger 설명을 갱신한다.

## 15. 프론트엔드 구현 순서

1. API types/raw 함수/query/mutation과 fixture를 추가한다.
2. server renderer에 선택 root marker를 추가하고 block별 serializer 동등성 unit test를 작성한다.
3. selection-to-offset와 offset-to-DOM-Range 순수 utility를 구현하고 emoji/surrogate pair, inline markup, code span, 경계/실패 case를 테스트한다.
4. post detail client controller와 공통 thread content를 구현한다.
5. Range overlay, 중첩 z-index, click hit-test, block buttons를 구현한다.
6. desktop layout을 좌측 TOC/본문/우측 rail로 변경하고 sidebar 작성 흐름을 연결한다.
7. mobile top button/BottomSheet를 연결하고 작성 UI가 mount되지 않는지 검증한다.
8. 수정·삭제, profile link, empty/error/loading과 focus 복원을 완성한다.
9. component test와 Playwright 주요 흐름을 추가한다.

## 16. 테스트 계획

### 백엔드 unit/integration

- emoji와 BMP 문자가 섞인 문자열의 UTF-16 range 검증
- 현재 offset exact match 유지
- 앞 텍스트 삽입 후 유일한 selectedText로 offset 이동
- block 삭제, no match, duplicate match의 OUTDATED
- OUTDATED가 유일 일치로 다시 ACTIVE
- 같은 앵커 동시 작성 시 anchor 1개/comment N개
- block/anchor/comment 정렬 보존
- 익명, 작성자, 게시글 작성자, OWNER, ADMIN, MEMBER, 관계없는 사용자 권한 matrix
- MEMBER이면서 게시글 작성자인 삭제 권한
- 응답 `can*`과 PATCH/DELETE 실제 강제가 같은 policy를 사용함
- private/unpublished/deleted post와 deleted user/member 처리
- 답글 endpoint가 계약에 노출되지 않음

### 프론트 unit/component

- 같은 root selection만 작성 draft 생성
- 블록 횡단, collapse, whitespace, 미지원 root는 버튼 없음
- 모바일에서 작성 버튼/form 없음
- UTF-16 offset과 DOM Range round trip, surrogate pair 경계
- ACTIVE만 overlay 생성, OUTDATED는 전체 목록에만 표시
- invalid ACTIVE range는 overlay만 생략하고 상태/목록은 유지
- API anchor 순서를 정렬하지 않음
- 겹친 지점 click이 마지막 ACTIVE anchor 하나를 선택
- block mode가 모든 ACTIVE anchor를 표시하고 OUTDATED는 제외
- Range가 복원된 ACTIVE 인용은 sidebar를 닫고 anchor로 이동하며 OUTDATED 또는 Range 복원 실패 인용은 이동하지 않음
- ALL/BLOCK mode의 하단 input은 선택된 thread에만 작성하고 선택 전에는 disabled
- 약 4px 상단선, hover/focus 시 line과 range text의 동시 피드백
- canEdit/canDelete 조합별 메뉴
- profile 링크, keyboard activation, focus open/restore, Escape, reduced-motion

### E2E

- desktop 단일 블록 선택 -> 작성 -> 같은 범위 두 번째 댓글 -> 하나의 thread에 두 댓글
- 여러 블록 drag 시 작성 버튼 없음
- 중첩 anchor 최상위 click과 block 목록을 통한 가려진 anchor 접근
- 전체 목록의 OUTDATED 안내와 위치 이동 control 부재
- mobile 전체/단일 BottomSheet 조회 및 작성 UI 부재
- 수정/삭제 권한별 메뉴와 서버 403 방어

## 17. acceptance criteria 추적

- [ ] 블록 횡단 선택에는 작성 버튼이 없다.
- [ ] 모바일에는 작성 버튼과 작성 form이 없다.
- [ ] 동일 범위에는 하나의 앵커 thread만 생성된다.
- [ ] 답글을 제공하지 않는다.
- [ ] 프론트는 ACTIVE만 하이라이트하고 OUTDATED를 재판정하지 않는다.
- [ ] 전체 댓글에는 ACTIVE와 OUTDATED가 모두 표시된다.
- [ ] OUTDATED는 전체 댓글에서만 접근 가능하고 위치 이동이 없다.
- [ ] 중첩 지점은 서버 anchors 배열의 마지막 ACTIVE 하나만 연다.
- [ ] 가려진 anchor는 block 댓글 목록에서 접근 가능하다.
- [ ] block 댓글 목록은 해당 block의 모든 ACTIVE anchor를 표시한다.
- [ ] 데스크톱 목차는 왼쪽, sticky All Comments는 오른쪽 기존 목차 영역에 표시된다.
- [ ] ACTIVE 댓글이 있는 block 우측 상단에 comments 아이콘과 ACTIVE count가 표시된다.
- [ ] ACTIVE range는 약 4px 상단선으로 표시되고 hover/focus 시 line과 텍스트가 함께 피드백한다.
- [ ] All Comments, block comments와 하이라이트는 약 400~450px 오른쪽 sidebar를 연다.
- [ ] sidebar는 `[인용 + 댓글 목록]`을 anchor 수만큼 반복하고 하단에 대상 anchor용 input을 둔다.
- [ ] ACTIVE 인용은 sidebar를 닫고 anchor로 이동하며 OUTDATED 인용은 이동하지 않는다.
- [ ] UI 버튼과 서버 mutation 모두 동일한 `canEdit` / `canDelete` 정책을 따른다.
- [ ] 프로필 링크, keyboard focus, panel focus 관리와 reduced-motion을 지원한다.

## 18. 구현 전에 확인할 결정 항목

아래 두 항목만 실제 구현/배포 방식에 직접 영향을 주며 제품 동작 자체는 위 설계로 확정한다.

1. **기존 댓글 운영 데이터 존재 여부**: 데이터가 있으면 root/reply 데이터를 폐기할지, 별도 legacy API로 보존할지 migration 정책이 필요하다. 데이터가 없으면 인라인 모델로 직접 전환한다.
2. **sidebar의 modal 여부**: 데스크톱에서 본문과 동시에 상호작용해야 하면 비모달 complementary panel, 열려 있는 동안 댓글 작업에 focus를 가둬야 하면 modal dialog로 구현한다. 모바일 BottomSheet는 modal로 확정한다.

## 19. 검증 명령

- 프론트: 변경 중 관련 Vitest를 우선 실행하고 완료 전 `cd frontend && pnpm check`; 핵심 흐름은 관련 Playwright spec 실행
- 백엔드: `cd backend && ./gradlew test`
- 공통: API 예시, migration과 ADR/task 문서의 필드·상태·권한 matrix 일치 확인
