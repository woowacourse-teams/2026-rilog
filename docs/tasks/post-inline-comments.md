# 게시글 인라인 댓글 설계

- 상위 이슈: #570
- 분할 계획: [프론트엔드 작업 계획](post-inline-comments-frontend-plan.md)
- 책임 결정: [ADR 0001](../adr/0001-post-inline-comments.md)

초기 BlockNote comment 기능 활용 검토에서, 서버 렌더링한 본문에 Selection·Range와 별도 하이라이트를 연결하는 구조로 변경했다. 아래는 #570 작업 브랜치의 구현을 나누어 통합하기 위한 계약이며, 각 기능의 develop 반영 상태는 분할 계획에서 추적한다.

## 사용자 흐름

1. 지원 블록의 텍스트를 드래그하면 댓글 추가 버튼을 제공한다. 작성 UI는 #642에서 연결한다.
2. 본문 하이라이트는 한 선택 영역, 블록 버튼은 해당 블록, 전체 댓글 버튼은 게시글 전체 목록을 연다.
3. 사이드바에서는 인용문과 댓글을 확인하고 본문 위치로 이동한다. 모바일에서는 전체 너비 사이드바를 사용한다.
4. 신규 선택 영역 또는 기존 선택 영역에 댓글을 작성하며, 작성 초안은 세션에 보관한다.
5. 서버의 canEdit·canDelete에 따라 수정·삭제를 제공한다. 댓글은 평면 목록이며 답글 구조가 아니다.
6. 전체 피드와 블로그 목록에서 서버가 반환한 댓글 수를 표시한다.

## 본문·선택 계약 — #639

- 본문 HTML은 기존 서버 렌더러가 생성한다. 댓글을 위해 글 작성 에디터를 상세 페이지에 올리지 않는다.
- 지원 블록의 단일 텍스트 루트에 data-inline-comment-root와 data-inline-comment-block-id를 부여한다.
- paragraph, heading, bulletListItem, numberedListItem, checkListItem, quote, toggleListItem의 텍스트를 선택할 수 있다.
- 코드 블록의 신규 댓글 선택을 차단한다. 문단 안의 인라인 코드는 선택과 하이라이트를 지원한다. 일반 코드 블록에는 기존 범위 복원용 루트가 남지만 Mermaid 코드에는 루트를 만들지 않는다.
- 한 블록 내부 선택만 허용한다. 여러 블록 횡단, 본문 밖, 접힌 선택, 공백만 있는 선택은 거부한다.
- blockId, startOffset, endOffset, selectedText를 추출한다. offset은 UTF-16 code unit이며 시작 포함·끝 제외인 [startOffset, endOffset)이다.
- Range는 브라우저 좌표용 일시 값이며 API payload에 넣지 않는다.
- 서버 범위를 DOM Range로 복원하고 ACTIVE만 표시한다. 복원 실패한 하이라이트만 생략하며 텍스트 재검색·offset 보정·상태 재판정을 하지 않는다.
- 중첩 범위의 우선순위는 전달받은 배열 순서이며 뒤쪽 앵커가 우선한다.
- hover·클릭·키보드 진입점은 blockId, anchorIds, source를 controller에 전달한다. 블록 진입점에는 해당 블록의 ACTIVE 앵커를 포함한다.
- API 연결 전에는 화면 모델을 선택적 prop으로 주입해 검증한다. 실제 페이지에 개발 fixture를 자동 주입하지 않는다.

## API와 화면 모델 경계 — #640 이후

아래 endpoint는 #570 작업 브랜치의 API 구현 기준이다. #640은 두 GET API와 consumer hook까지 제공하며 실제 페이지 조립은 #641에서 연결한다. 작성·수정·삭제 API는 해당 후속 이슈에서 추가한다.

| 기능 | method / path | 통합 이슈 |
| --- | --- | --- |
| 본문 앵커 조회 | GET /v1/posts/{postId}/comment-anchors | #640 |
| 사이드바 조회 | GET /v1/posts/{postId}/comment-anchors/sidebar | #640 |
| 신규 선택 영역에 작성 | POST /v1/posts/{postId}/comment-anchors | #642 |
| 기존 선택 영역에 작성 | POST /v1/posts/{postId}/selections/{selectionId}/comment-anchors | #642 |
| 댓글 수정 | PATCH /v1/posts/{postId}/comment-anchors/{commentAnchorId} | #643 |
| 댓글 삭제 | DELETE /v1/posts/{postId}/comment-anchors/{commentAnchorId} | #643 |

- 서버 DTO의 selectionId는 화면의 anchorId, commentAnchorId는 화면의 commentId에 대응한다.
- 서버 ORPHANED는 화면 OUTDATED로 변환한다. 서버 상태·range·배열 순서는 프론트가 재판정하지 않는다.
- 본문 조회는 blocks 안의 anchorGroups, 사이드바 조회는 blockId가 포함된 anchorGroups를 소비한다.
- raw API, query key/options, mutation과 공통 캐시 처리는 shared/api/posts에 둔다. 화면 모델과 mapper는 features/post-detail에 둔다.
- InlineComment*Model은 화면 내부 계약이다. anchorCount는 commentCount, isEdited는 같은 이름으로 보존한다. 서버의 댓글 수를 댓글 배열 길이로 다시 계산하지 않는다.
- 본문과 사이드바의 query key는 게시글 ID와 로그인 여부를 포함하며 authenticated 캐시 정리 범위에 속한다. 인증 초기화 전에는 요청하지 않는다. 게시글 수정 시 해당 게시글의 네 조회 캐시(본문/사이드바 × 로그인/비회원)를 무효화하며 다른 게시글 댓글 캐시는 유지한다.
- 게시글 수정과 댓글 mutation 후 본문·사이드바가 오래된 정보를 유지하지 않도록 관련 조회를 무효화한다.
- 백엔드는 앵커 정합성과 권한 판정의 책임을 가진다. 이 프론트 분할 PR들은 백엔드 구현을 변경하지 않는다.

## 사이드바·작성·수정·삭제 — #641~#643

- 전체·블록·단일 선택 영역 진입점에 따라 목록과 접기·펼치기 동작을 제공한다.
- OUTDATED는 전체 목록에서 인용문과 함께 표시하고, 본문 위치 이동은 제공하지 않는다.
- 작성자는 아바타, 작성자/멤버 배지와 블로그 링크로 표시한다.
- 로딩, 빈 목록, 조회 실패와 재시도를 제공한다.
- 신규 작성과 기존 선택 영역 추가는 별도 mutation으로 연결한다.
- 로그인 상태, 빈 입력, 중복 제출을 처리하며 실패 시 입력을 보존한다. 본문 변경 충돌은 다시 선택하도록 안내한다.
- 수정 취소·실패 시 기존 댓글을 유지한다. 삭제는 확인 모달을 거쳐 요청하며 요청 중 재제출을 방지한다.

## 검증

선택·복원·중첩·렌더러 계약은 Vitest/RTL, 브라우저 Selection·Range 좌표와 반응형 동작은 Playwright로 검증한다. 공유 본문 스타일 변경은 기존 글쓰기 브라우저 흐름도 함께 확인한다. UI·API 통합과 CRUD·오류·권한 흐름은 해당 하위 PR에서 검증하며, 각 PR에 실행 결과와 미실행 항목을 기록한다.
