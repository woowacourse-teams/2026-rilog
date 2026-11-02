# 전체 게시글 수 캐시 구현 계획

**요구사항:** [#841](https://github.com/woowacourse-teams/2026-rilog/issues/841), 이 채팅에서 합의한 단일 서버·TTL 없음·커밋 후 무효화.

**목표:** 집계 결과가 바뀌지 않으면 COUNT를 재실행하지 않고, 변경 커밋 이후 첫 조회에서 다시 집계한다.

**구조:** `PostCountCache`가 Caffeine 조회와 동기 `AFTER_COMMIT` 무효화를 맡는다. 빈 `PostCountChangedEvent`를 각 쓰기 서비스에서 발행한다. 집계 포함 여부는 `Post.isIncludedInTotalCount()`가 기존 쿼리와 같은 조건으로 판단한다.

**범위:** 기존 #841 브랜치에서 작업한다. API·쿼리·인덱스·의존성을 변경하지 않는다. TTL, 스케줄러, 분산 캐시, 별도 이관 완료 API를 추가하지 않는다. 기존 미추적 파일은 보존한다.

## 작업과 검증

- [x] 캐시 재사용 통합 테스트를 먼저 작성하고 기존 구현에서 실패하는지 확인한다.
- [x] 집계 포함 여부의 도메인 테스트를 작성하고, 도메인 판단 메서드를 구현한다.
- [x] 실제 Caffeine과 DB 경계 대역으로 0 캐싱, 재조회, 로딩 실패 복구, 동시 로딩·무효화를 검증한다.
- [x] 캐시·이벤트를 구현하고 전체 글 수 조회를 연결한다.
- [x] 일반 발행·임시글 발행·관리자 이관·삭제·공개 범위 변경·Colog 벌크 삭제에 이벤트를 연결한다.
- [x] 실제 커밋·롤백, 각 변경 경로, 집계 포함 여부가 유지되는 수정의 캐시 보존을 통합 테스트한다.
- [x] 기존 생성자 기반 단위 테스트와 `ServiceSupport`의 메모리 캐시 격리를 갱신한다.
- [x] 관련 테스트 → 전체 `testH2` → `testMySql` 및 `build -x test`를 실행한다. 실패나 실행 제한은 결과에 남긴다.
- [x] 별도 리뷰에서 이벤트 누락, 트랜잭션 시점, 동시 로딩, 테스트 격리를 확인한다.

## 검토 기준

- 캐시 값 0과 로딩 실패를 구분한다.
- 이벤트는 활성 쓰기 트랜잭션 안에서 발행하며, 롤백 시 캐시를 지우지 않는다.
- 리스너는 비동기로 실행하거나 COUNT를 직접 수행하지 않는다.
- Colog 벌크 삭제는 개별 엔티티를 거치지 않으므로 직접 이벤트를 발행한다.
- `getIfPresent → COUNT → put`으로 원자적 로딩을 분리하지 않는다.
- 미커밋 쓰기 결과를 공용 캐시에 적재하는 호출을 추가하지 않는다.
- 기존 조회 트랜잭션은 유지한다. API 응답 시점에 이미 진행 중인 모든 읽기가 최신 값을 반환한다고 보장하지 않는다.

소스 소유권은 주 에이전트가 맡고, 독립 테스트 에이전트는 새 통합 테스트 파일만 작성한다.


## 검증 결과

- Java 21.0.10으로 기존 `PostServiceIntegrationTest` 기준선 통과.
- 캐시 구현 전 재사용 테스트가 실제 값 2 / 기대 값 1로 실패함을 확인.
- 캐시 조회만 연결한 상태에서는 커밋 무효화 경로 7건이 실패하고, 이벤트 연결 후 통과함을 확인.
- 최종 전체 검증: `testH2` 1,527건, `testMySql` 1,535건 모두 통과. 실패·오류·skip 0건.
- `build -x test` 및 `git diff --check` 통과. 새 3개 테스트 클래스는 집계 정책, 캐시 로딩·복구·동시성, 실제 서비스 커밋·롤백을 검증한다.
- 독립적인 읽기 전용 코드 리뷰에서 조치가 필요한 발견 사항 없음.
- 기존 MySQL 결과 폴더에 iCloud의 `dataless` 파일이 있어 첫 전체 검증이 파일 접근에서 정지했다. 해당 검증 프로세스를 종료하고 저장소 설정 변경 없이 임시 Gradle init script로 빌드 경로를 `/private/tmp/rilog-841-build`로 바꿔 전체 검증을 다시 완료했다.

실행 명령:

```sh
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home \
./gradlew --no-daemon \
  --project-cache-dir /private/tmp/rilog-841-project-cache \
  --init-script /private/tmp/rilog-841-local-build.gradle \
  testH2 testMySql build -x test
```

검증 리포트: `/private/tmp/rilog-841-build/reports/tests/testH2/index.html`, `/private/tmp/rilog-841-build/reports/tests/testMySql/index.html`.

## 후속 중복 정리 계획

- 범위: `PostService`의 반복되는 조건부 `PostCountChangedEvent` 발행 네 곳만 정리한다.
- 기존 `PostCountCacheIntegrationTest`를 먼저 실행해 발행·삭제·공개 범위 변경·롤백의 동작을 고정한다.
- 조건은 호출부에서 판단하고, `publishPostCountChangedEventIf(boolean countChanged)` private 메서드에 조건부 발행을 모은다. 새 클래스나 의존성은 추가하지 않는다.
- 이벤트의 발행 조건·트랜잭션 시점·리스너는 유지한다. 해당 범위에 fallback이나 예외 은폐 처리는 없다.
- 변경 후 전체 H2 테스트·빌드, 관련 MySQL 통합 테스트와 diff 검사를 수행한다.

후속 정리 결과: `PostService`의 네 조건부 이벤트 발행을 private 메서드 하나로 모았다. 변경 전 캐시 통합 테스트, 변경 후 전체 `testH2`·`build -x test`와 `testMySql --tests kr.rilog.domain.post.service.PostCountCacheIntegrationTest`가 모두 통과했다. 별도 읽기 전용 리뷰에서도 조건·발행 시점의 변경이나 추가 수정 사항이 없음을 확인했다. 새 클래스·의존성·테스트는 추가하지 않았다.
