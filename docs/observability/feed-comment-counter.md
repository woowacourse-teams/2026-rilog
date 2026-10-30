# 최신순·트렌딩 피드 댓글 카운터 전환

## 변경과 집계 기준

최신순·트렌딩 피드는 `Post.commentCount`를 읽는다. 기존 인라인 댓글 JOIN, COUNT 및 넓은 GROUP BY를 제거하고, 작성자·블로그·챕터 JOIN과 기존 필터·정렬·Slice·응답 구조는 유지한다. 트렌딩 점수 계산 배치는 변경하지 않는다.

카운터는 기존 피드 쿼리와 동일하게 `comment_anchor.deleted_at IS NULL`인 인라인 댓글 수다. 선택 영역의 ORPHANED 상태, 선택 영역의 삭제 여부, 작성자의 삭제 여부로 추가 필터링하지 않는다. 댓글 내용 변경이나 본문 수정으로 선택 영역이 ORPHANED가 되어도 카운터는 바뀌지 않는다.

## 쓰기와 동시성

- 새 선택 영역 작성과 기존 선택 영역 추가 모두 같은 트랜잭션에서 카운터를 원자적으로 증가시킨다. 첫 INSERT 전에 Post UPDATE를 실행해 동시 생성 시 FK 공유 잠금의 승격 충돌을 피한다.
- 삭제 권한은 도메인이 검증한다. `deleted_at IS NULL` 조건부 UPDATE로 실제 삭제한 1행에 대해서만 카운터를 감소시킨다. 중복 삭제는 기존 COMMENT_ANCHOR_NOT_FOUND 오류로 끝난다.
- 감소에는 `comment_count > 0` 조건을 둔다. 카운터 갱신이 1행에 적용되지 않으면 POST_COMMENT_COUNT_INVALID로 실패하고 댓글 쓰기까지 롤백한다. 불일치를 0으로 덮어 감추지 않는다.
- `Post.commentCount`는 `updatable=false`로 일반 엔티티 UPDATE에서 제외한다. 오래된 Post 수정이 새 카운터를 덮어쓰지 않는다.
- `CommentAnchor`에는 DynamicUpdate를 적용한다. 오래된 댓글 내용 수정이 논리 삭제의 deleted_at 값을 null로 되돌리지 않는다.
- 네이티브 UPDATE는 이미 로딩한 Post 객체의 카운터를 자동으로 갱신하지 않는다. 현재 댓글 응답은 그 필드를 사용하지 않는다. 같은 영속성 컨텍스트에서 최신 카운터가 필요해지는 경로는 명시적 재조회/refresh가 필요하다.
- 원자적 UPDATE의 행 잠금은 트랜잭션 종료까지 유지된다. 같은 글에 댓글 쓰기가 집중되면 직렬화 비용이 생기므로 읽기 개선과 별도로 쓰기 지연도 관찰한다.

## 배포 순서

V8은 컬럼을 추가하고 **전체 게시글**을 기존 기준으로 백필한다. 구버전 앱은 댓글을 써도 새 카운터를 갱신하지 않으므로 일반 롤링 배포로 섞어 실행하면 안 된다.

기존 이미지 자산용 V8 삭제가 반영된 develop을 통합한 뒤 이 마이그레이션을 V9에서 V8로 변경했다. 부하테스트용 개발 DB의 적용 이력은 V7까지임을 읽기 전용 조회로 확인했고, 운영 DB도 V7까지 적용됐다는 사용자 확인을 받았다. 기존 V8이 적용된 DB에는 이 번호 변경을 그대로 적용하면 안 된다.

1. 댓글 쓰기와 직접 SQL 시딩을 중지하고, 진행 중인 댓글 트랜잭션을 종료한다. 구버전 앱 인스턴스가 쓰기를 재개하지 않도록 정지한다.
2. V8 마이그레이션과 새 앱 전환을 완료한다. 이미 시작한 새 앱에도 확인 완료 전 댓글 쓰기를 허용하지 않는다.
3. 아래 조회에서 불일치가 0건인지 확인한다.
4. 댓글 쓰기를 재개한다. 이후 직접 SQL로 댓글을 추가·삭제하면 카운터도 함께 반영해야 한다.

```sql
SELECT p.id, p.comment_count, COALESCE(actual.comment_count, 0) AS actual_count
FROM post p
LEFT JOIN (
    SELECT s.post_id, COUNT(a.id) AS comment_count
    FROM comment_anchor_selection s
    JOIN comment_anchor a ON a.comment_anchor_selection_id = s.id
    WHERE a.deleted_at IS NULL
    GROUP BY s.post_id
) actual ON actual.post_id = p.id
WHERE p.comment_count <> COALESCE(actual.comment_count, 0);
```

## 검증 기록

- 변경 전 기존 댓글·최신순·트렌딩 서비스 통합 테스트 통과.
- 신규 작성 테스트는 컬럼 추가 후 기대값 1 / 실제값 0으로 실패하는 것을 확인한 뒤 증가 경로를 구현했다.
- 실제 MySQL 8.4.6 동시성 테스트: 새 선택 영역 작성, 기존 영역 추가, 서로 다른 댓글 삭제, 동일 댓글 중복 삭제, 추가·삭제 혼합, 오래된 Post 수정, 오래된 댓글 수정, 동시 작성 중 일부 롤백.
- 일반 서비스 테스트: 생성 두 경로, 삭제, 생성·추가 도중 실패 롤백, 0 카운터에서 삭제 실패와 롤백. 두 피드의 댓글 수와 정렬·필터·페이지 기존 테스트 유지.
- 마이그레이션 전용 테스트와 DTO 전용 테스트는 backend/.agents 규칙에 따라 추가하지 않았다. MySQL 테스트 앱 기동 시 기존 Flyway 경로로 마이그레이션을 적용한다.

2026-10-28 develop 통합 전 로컬 검증 결과:

| 검증 | 결과 |
| --- | --- |
| `./gradlew testMySql` 전체 | 1,436건, 실패·오류·스킵 0건 |
| `./gradlew clean testH2 testMySql`의 H2 단계 | 1,428건 중 기존 이미지 제약 테스트 2건 실패, 1건 스킵. H2 실패로 다음 MySQL 단계는 실행되지 않아 위 명령으로 별도 실행 |
| 최종 변경 영역 H2 통합 테스트 | 112건, 실패·오류·스킵 0건 |
| 최종 변경 영역 MySQL 통합 테스트 | 120건, 실패·오류·스킵 0건. 카운터 일반 테스트 6건 및 실제 동시성 테스트 8건 포함 |
| `./gradlew build -x test` | 성공. 위 최종 관련 테스트와 함께 실행 |
| `git diff --check` | 통과 |

H2 실패는 `ImageAssetRepositoryIntegrationTest.objectKeyIsUnique`, `assetAndSourceAreUnique`다. 작업 변경을 포함하지 않은 HEAD `9ad51901`을 임시 디렉터리에 추출하고 해당 클래스만 실행해 동일한 두 실패를 재현했다(5건 중 실패 2건, 스킵 1건). 관련 없는 테스트나 스키마를 수정하거나 검증을 약화하지 않았다. MySQL 전체 실행에서는 두 테스트도 통과했다.

최종 관련 테스트의 대상은 `CommentAnchorCounterIntegrationTest`, `CommentAnchorServiceIntegrationTest`, `FeedServiceIntegrationTest`, `TrendingServiceIntegrationTest`이며, MySQL에는 `CommentAnchorCounterConcurrencyIntegrationTest`를 추가했다. 독립 코드 리뷰에서 중대한 결함은 발견되지 않았다.

### V8 버전 정리 후 재검증

2026-10-28 develop `d35f4bfb`를 통합하고 댓글 수 마이그레이션을 V8로 변경한 뒤 `./gradlew clean testH2 testMySql build -x test`를 실행했다. SQL 내용은 기존 V9와 동일하다.

| 검증 | 결과 |
| --- | --- |
| H2 전체 | 1,417건, 실패·오류·스킵 0건 |
| MySQL 전체 | 1,425건, 실패·오류·스킵 0건 |
| 패키징 빌드 | 성공 |
| 변경 파일 검사 | `git diff --cached --check` 통과 |

테스트 수 차이는 develop에서 이미지 자산·참조 코드와 관련 테스트가 제거된 결과다. 앞서 기록한 이미지 중복 제약 H2 실패도 현재 통합 상태에서는 남아 있지 않다. 이번 버전 변경을 위해 테스트를 삭제하거나 검증을 약화하지 않았다.

## 변경 파일

- 운영 코드: Post, PostRepository, PostErrorInformation, CommentAnchor, CommentAnchorRepository, CommentAnchorService, PostFeedQueryRepository, TrendingPostQueryRepository.
- DB: V8__add_post_comment_count.sql.
- 테스트: 신규 CommentAnchorCounterIntegrationTest, CommentAnchorCounterConcurrencyIntegrationTest 및 기존 댓글·최신순·트렌딩 서비스 통합 테스트.
- 피드 Service와 응답 DTO, 트렌딩 점수 배치, 의존성, 서버 설정은 변경하지 않았다.

## 성능 측정

이번 로컬 검증은 정합성과 기능 회귀 검증이다. 개발 서버 배포, 원격 데이터 변경 및 k6 재실행은 수행하지 않는다. 이 구현의 개선 후 실행계획·SQL 시간·API P95는 아직 측정하지 않았다. 이전 페이지 선조회 진단 SQL의 10ms/23ms를 이 카운터 구현의 측정값으로 사용하지 않는다.

배포 후에는 실제 게시글·댓글 건수와 카운터 불일치 0건을 기록하고, 기존 요청 비율·75 RPS 목표·5분 증가·55분 유지 조건으로 비교한다. 완주 여부, 실패율, dropped_iterations, 피드별 P95, DB 연결 대기를 함께 기록한다.
