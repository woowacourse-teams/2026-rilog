# 조회수 저장 구조와 상세 응답 — #694

## 구현 범위

- V4에서 누계·배치 원장 테이블을 만들고 기존 PUBLISHED 글을 0으로 초기화한다. 비공개·soft-deleted 글도 포함하고 초안은 발행 때 생성한다.
- 일반 발행과 초안 발행이 같은 트랜잭션에서 누계를 생성한다. 이후 작업이 실패하면 누계와 발행 상태 모두 롤백된다.
- `GET /v1/blogs/{slug}/posts/{postId}`와 작성자용 `GET /v1/posts/{postId}`의 `data`에 `viewCount`를 추가한다. 기존 wrapper·본문·권한은 유지한다.
- GET은 저장된 누계를 읽기만 한다. 누계 행이 없으면 500 오류이며 DB 조회 실패를 0으로 변환하지 않는다.
- 조회 등록 POST, 메모리 집계, 배치 writer와 스케줄러는 후속 이슈다. 이번 단계에서 신규 누계는 0으로 시작한다.

응답에 추가된 필드는 `"viewCount": 0`과 같은 JSON 정수이며 0..9,007,199,254,740,991 범위다. 기존 소비자는 기존 필드를 사용할 수 있다. 미등록 필드를 거부하는 소비자의 호환성은 별도로 확인해야 한다. FE 파일은 수정하지 않았다.

## 배포와 롤백

V4 적용부터 새 backend가 활성화될 때까지 일반·초안 발행 쓰기를 중단한다. 기존 binary는 누계 행을 생성하지 않기 때문이다. 실제 DB 작업은 배포 담당자가 환경을 확인한 뒤 수행하며, 아래 SQL은 운영에서 자동 실행되지 않는다.

이전 binary로 롤백해도 두 테이블과 기록은 보존한다. 이전 binary가 발행한 글이 있다면 새 backend 전환 전에 발행을 중단하고 누락된 누계 행만 보충한다.

```sql
insert into post_view_count (post_id, view_count)
select p.id, 0
from post p
left join post_view_count vc on vc.post_id = p.id
where p.status = 'PUBLISHED' and vc.post_id is null;
```

기존 누계와 배치 기록을 삭제하거나 기존 누계를 0으로 UPDATE하지 않는다. 설계 결정은 [ADR 0007](../../docs/adr/0007-post-view-count-storage.md)을 따른다.

## 검증

- `PostViewCountIntegrationTest`: 일반·초안 발행, GET 반복 시 무증가, 누계 누락 오류, 발행 실패 롤백, 비공개 읽기 권한.
- `PostViewMigrationTest`: 격리된 MySQL 8.4.6에서 V1~V3 → 기존 글 fixture → V4를 적용해 초기화, InnoDB, PK/FK/CHECK, migration 재실행 시 기존 누계 보존을 검증한다.
- MySQL 테스트 profile의 `ddl-auto=validate`로 Flyway 결과를 사용한다. Hibernate가 테이블을 다시 생성해 migration 결과를 대체하지 않는다.
- 실행 명령: `./gradlew testH2 testMySql build --console=plain` (backend 디렉터리).
