# 방문 기록 Caffeine 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 조회수 집계 엔진의 방문 기록 관리를 Caffeine으로 전환하고 기존 원자성과 교체 계약을 유지한다.

**Architecture:** `PostViewCounterRegistry implements PostViewStore`와 Counter의 게시글별 `ReentrantLock`을 유지한다. Registry의 방문 기록 factory로 `CaffeineViewerRecordStore implements ViewerRecordStore`를 주입한다. 조회수 상태와 배치 관리 규칙은 Counter에 남긴다.

**Tech Stack:** Java 21, 현재 Spring Boot, Spring Boot BOM이 관리하는 Caffeine, JUnit 5, 기존 H2/MySQL Gradle 검증.

**Spec:** `docs/superpowers/specs/2026-10-07-post-view-caffeine-adoption-design.md`

## Global Constraints

- 마지막 인정 이후 1시간 미만은 거절하고, 정확히 1시간부터 다시 인정한다.
- 거절한 중복 요청은 기록을 갱신하지 않는다.
- `PostViewCounter`의 게시글별 `ReentrantLock`을 유지한다.
- 현재 조회수는 `confirmedCount + pendingDelta + inFlightBatch.delta()`다.
- DB 반영 확인 후 해당 배치만 확정한다. 실패·결과 불명확 상태는 같은 배치를 유지한다.
- Counter 제거와 임의의 `maximumSize`를 도입하지 않는다.
- 별도 정리 스케줄러와 Caffeine scheduler는 도입하지 않는다.
- DB 초기화 I/O를 Counter 락이나 Map 원자적 연산 안으로 이동하지 않는다.
- Java 21과 기존 Spring Boot·DB·검증 도구를 유지한다.
- 이번 범위는 집계 엔진의 방문 기록 구현 전환이다. 프론트엔드와 공개 HTTP 계약은 변경하지 않는다.

## Review Focus

- 59분의 중복 요청이 1시간 재방문 인정을 늦추지 않아야 한다. Task 1의 명시적 시각 테스트로 고정한다.
- 회원 ID와 익명 UUID 및 서로 다른 게시글의 방문 기록이 섞이지 않아야 한다. Task 1의 식별자·게시글 분리 테스트로 고정한다.
- 방문 기록이 만료되거나 내부 정리가 실행돼도 미확정 배치와 총 조회수는 보존돼야 한다. Task 3에서 검증한다.
- 저장 중 새 조회, 저장 결과 미확정 및 오래된 완료 요청으로 증가분을 잃거나 중복 확정하면 안 된다. Task 3에서 검증한다.
- Spring 조립이 실제로 Caffeine을 선택하며 초기화 조회 실패를 0으로 숨기지 않아야 한다. Task 2에서 검증한다.

---

## 현재 상태와 선별 이식 범위

- 현재 브랜치에는 `PostViewStore`, `ViewerRecordStore`, factory 생성자, Counter 락과 배치 상태가 이미 있다.
- 현재 `PostViewConfig`는 Registry 기본 생성자를 사용해 Queue 방문 기록 구현을 선택한다.
- 실험 브랜치 `be/test/#697-조회수-로컬-캐시-비교`에 Caffeine 구현과 `ViewerRecordStoreContractTest`가 있다.
- 실험 worktree: `/Users/jinriro/.codex/worktrees/post-view-cache-benchmark/2026-rilog`.
- benchmark 서버/API, source set, k6 실행 코드와 전체 실험 결과는 현재 기능 브랜치로 병합하지 않는다. 기존 결과는 선택 근거로 참조한다.
- 구현 시 현재 브랜치의 진행 중인 변경을 먼저 확인한다. 전체 실험 브랜치 cherry-pick이나 Registry 덮어쓰기를 하지 않는다.

### Task 1: Caffeine 방문 기록 구현과 공통 계약 이식

**Files:**
- Create: `backend/src/main/java/kr/rilog/domain/post/view/CaffeineViewerRecordStore.java`
- Create: `backend/src/test/java/kr/rilog/domain/post/view/ViewerRecordStoreContractTest.java`
- Modify: `backend/build.gradle.kts`
- Reference: 기존 `ViewerRecordStore.java`, `ViewPolicy.java`, `ViewCounterTestSupport.java`

**Interfaces:**
- Consumes: `ViewerRecordStore.lastAcceptedTick(ViewerIdentity): Long`, `recordAccepted(ViewerIdentity, long): void`, `cleanupExpired(long): void`, `ElapsedTimeSource.readNanos(): long`.
- Produces: `CaffeineViewerRecordStore(ElapsedTimeSource)`와 `Function<ElapsedTimeSource, ViewerRecordStore>`로 전달할 수 있는 생성자 참조.

- [x] **Step 1: 공통 계약 테스트를 먼저 가져온다.** 실험의 6개 계약 사례를 유지하고 모든 외부 작업을 `PostViewStore` 타입으로 실행한다. 테스트용 시간을 `AtomicLong`으로 주입하고 실제 sleep은 사용하지 않는다.
- [x] **Step 2: 세 가지 정책 사례를 추가한다.** `duplicatesDoNotExtendWindow`는 t=0 첫 인정, t=59분 중복 거절, t=1시간 재인정(+2)을 확인한다. `identitiesAreIndependent`는 회원 1과 고정 익명 UUID를 각각 한 번 인정하고 각 반복을 거절한다. `recordsAreIsolatedByPost`는 같은 독자가 글 1과 2에서 각각 인정되고 글 1의 갱신이 글 2에 영향을 주지 않는 시각 사례를 확인한다.
- [x] **Step 3: 추가 테스트의 실패를 확인한다.** `cd backend` 후 `./gradlew testH2 --tests 'kr.rilog.domain.post.view.ViewerRecordStoreContractTest' --console=plain --no-daemon --max-workers=2`. 아직 없는 Caffeine 구현으로 실패하는 것을 확인한 뒤 의존성과 구현을 추가한다.
- [x] **Step 4: Caffeine 의존성과 구현을 선별 이식한다.** `implementation("com.github.ben-manes.caffeine:caffeine")`만 추가하고 benchmark Gradle 설정은 가져오지 않는다. `expireAfterWrite(ViewPolicy.DUPLICATE_WINDOW)`와 `.ticker(timeSource::readNanos)`를 사용한다. `cleanupExpired`는 Caffeine 유지보수에 맡기므로 no-op으로 둔다. 수동 큐나 100개 정리 제한을 Caffeine 구현에 추가하지 않는다.
- [x] **Step 5: 공통 계약을 검증한다.** 같은 명령으로 Queue·Caffeine 모두 통과하는지 확인한다. 기존 tick 순환·동시 독자 100명·같은 독자 100회·상한 거절·배치 전환 사례를 유지한다. `./gradlew dependencyInsight --dependency caffeine --configuration runtimeClasspath --console=plain`으로 실제 버전을 기록한다.
- [x] **Step 6: 구현과 테스트·의존성만 커밋한다.** 실제 제목: `feature: Caffeine 방문 기록 저장소와 공통 계약 추가`. 현재 작업과 무관한 파일은 stage하지 않는다.

### Task 2: Spring 기본 조립을 Caffeine으로 전환

**Files:**
- Modify: `backend/src/main/java/kr/rilog/domain/post/view/PostViewConfig.java`
- Create: `backend/src/test/java/kr/rilog/domain/post/view/PostViewConfigTest.java`
- Reference: `PostViewCounterRegistry.java`, `PostViewCounterIntegrationTest.java`

**Interfaces:**
- Consumes: 기존 `PostViewCounterRegistry(LongUnaryOperator, ElapsedTimeSource, Clock, Function<ElapsedTimeSource, ViewerRecordStore>)`.
- Produces: `PostViewStore`로 주입 가능한 기존 Registry bean. 기존 bean 이름과 구체 반환 타입은 유지해 현재 통합 테스트와 호환한다.

- [x] **Step 1: 선택을 검증하는 테스트를 작성한다.** `ApplicationContextRunner`에 `PostViewConfig`, mock `PostViewCountRepository`, 고정 `Clock`을 등록한다. `context.getBean(PostViewStore.class)`로 작업하며 DB 초기값 42, 첫 등록 43, 동일 독자 반복 43을 확인한다. 같은 패키지 테스트에서만 Counter의 `viewerRecordStore`가 Caffeine 구현인지 확인해 기본 조립 선택을 검증한다.
- [x] **Step 2: 조회 실패를 숨기지 않는 사례를 추가한다.** mock repository가 빈 값을 반환하면 `currentCount`와 `recordView`가 `POST_VIEW_COUNT_MISSING`을 반환하고 0으로 시작하지 않는지 확인한다. 기존 초기화 공유·실패 재시도 테스트는 그대로 유지한다.
- [x] **Step 3: `./gradlew testH2 --tests 'kr.rilog.domain.post.view.PostViewConfigTest' --console=plain --no-daemon --max-workers=2`로 Caffeine 선택 검증이 Queue 때문에 실패하는지 확인한다.**
- [x] **Step 4: 기존 Registry 생성에 네 번째 인자 `CaffeineViewerRecordStore::new`를 전달한다.** 기존 기본 생성자의 Queue 선택은 유지한다. Counter를 캐시에 넣거나 `compute()`로 동기화하지 않는다. 선택용 프로퍼티·새 전략 인터페이스·Spring Cache 어노테이션은 추가하지 않는다.
- [x] **Step 5: 설정 테스트와 기존 Spring/DB 통합 테스트를 실행한다.** `./gradlew testH2 --tests 'kr.rilog.domain.post.view.PostViewConfigTest' --tests 'kr.rilog.domain.post.view.PostViewCounterIntegrationTest' --console=plain --no-daemon --max-workers=2`. DB 초기 누계 읽기와 조회 요청 중 DB 쓰기 없음도 확인한다.
- [x] **Step 6: 설정과 테스트를 커밋한다.** 제목 예: `refactor: 조회수 방문 기록의 기본 구현을 Caffeine으로 전환`.

### Task 3: PostViewStore 계약으로 동시 조회와 배치 경계 검증

**Files:**
- Create: `backend/src/test/java/kr/rilog/domain/post/view/PostViewStoreContractTest.java`
- Reference: `PostViewStore.java`, `PostViewCounterTest.java`, `PostViewCounterRegistryTest.java`

**Interfaces:**
- Consumes: `recordView(long, ViewerIdentity): ViewResult`, `currentCount(long): long`, `prepareFlushBatches(): List<ViewFlushBatch>`, `completeFlush(long, UUID): void`.
- Produces: 구현체를 교체할 때 재사용할 수 있는 공개 계약 테스트. 현재 Queue·Caffeine factory 두 개로 같은 사례를 실행한다.

- [x] **Step 1: 공개 계약만 사용하는 테스트를 작성한다.** 테스트의 저장소 타입은 `PostViewStore`로 두며 Counter 객체, `getOrLoad`, `snapshot`, 내부 필드를 사용하지 않는다. 초기 누계 100에서 조회 10회 → 배치 delta=10 → 새 조회 3회 → 합계 113 → 완료 후 합계 113 → 다음 배치 delta=3을 확인한다.
- [x] **Step 2: 재시도와 멱등적 완료를 검증한다.** 완료를 호출하지 않으면 `prepareFlushBatches`가 같은 배치 ID와 delta를 반환한다. 같은 배치를 두 번 완료하거나 이전 배치 ID를 다시 전달해도 합계와 다음 배치는 바뀌지 않는다. 이 검증은 메모리 상태 계약이며 실제 DB 멱등성을 증명한다고 표현하지 않는다.
- [x] **Step 3: 만료와 병렬 상태 접근을 검증한다.** 미확정 배치를 둔 채 1시간을 전진하고 동일 독자 재방문을 인정해도 기존 배치와 합계가 보존돼야 한다. 기존 배치 delta=10을 준비한 상태에서 새로운 독자 100명의 조회와 배치 완료를 동시에 실행한 뒤 합계 210, 다음 배치 delta=100을 확인한다. 현재 값 읽기와 배치 준비가 병렬 실행돼도 관찰한 합계가 210을 넘거나 증가분을 잃지 않는지 확인한다.
- [x] **Step 4: `./gradlew testH2 --tests 'kr.rilog.domain.post.view.*' --console=plain --no-daemon --max-workers=2`를 실행한다.** 기존 Counter·Registry·Queue 정리 전용 테스트도 통과해야 한다. 이미 만족하는 계약은 불필요하게 제품 코드를 바꾸거나 인위적으로 실패시키지 않는다. 실패하면 해당 회귀를 먼저 고정하고 최소 범위로 수정한다.
- [x] **Step 5: 공개 계약 테스트를 커밋한다.** 제목 예: `test: 조회수 저장소의 배치와 동시성 계약 검증`.

### Task 4: 선택 근거·검증·후속 범위 문서화

**Files:**
- Modify: `backend/docs/post-view-memory-counter.md`
- Create: `docs/adr/0009-post-view-caffeine-viewer-records.md` (실행 시 같은 번호 사용 여부를 다시 확인)
- Reference: 실험 브랜치의 `backend/docs/post-view-k6-concurrency-comparison.md`

- [x] **Step 1: 기본 구현과 수명을 문서화한다.** Counter의 락과 유지 정책, 두 교체 경계, Caffeine의 논리적 만료와 기회적 물리 정리, 단일 JVM 및 비정상 종료 유실 전제를 명시한다. Queue는 비교 구현이며 100개 정리 제한이 Caffeine에도 적용되는 것처럼 쓰지 않는다. ADR 0008의 기존 결정은 이력을 보존하고 새 ADR에서 전환을 설명한다. 운영 POST 활성화 전에 요청 속도·동시 처리량 보호가 필요하며 중복 제거와 캐시 용량 제한이 이를 대신하지 않는다고 명시한다.
- [x] **Step 2: 측정 근거를 정확히 기록한다.** 일반 조회의 보편적 우위를 주장하지 않는다. 만료 조건 VU 100의 p95 반복 중앙값 Queue 9.14ms/Caffeine 4.34ms, 초기 동일 데이터 유지 힙 차이 약 0.53~2.23 MiB와 로컬 테스트 한계를 기록한다. 기존 결과를 구현 후 새 부하 측정이라고 표현하지 않는다.
- [x] **Step 3: 필수 검증을 실행한다.** backend에서 `./gradlew testH2 testMySql build --console=plain --no-daemon --max-workers=2`를 실행하고 테스트 보고서의 실패·오류·건너뛰기 및 실제 수행 여부를 확인한다. MySQL 실행이 불가능하면 이유와 미검증 범위를 기록한다. 설정 파일이나 테스트를 약화해 통과시키지 않는다.
- [x] **Step 4: 최종 diff를 검토한다.** `git diff --check`를 실행한다. 프론트엔드 변경, benchmark API/source set 유입, Counter 락 제거, 조회수 상태에 TTL 적용, 인증 Redis 제거가 없는지 확인한다. 실제 해결할 위험이 없으면 전체 k6 72회 재실행을 필수로 삼지 않는다.
- [x] **Step 5: 문서와 검증 기록을 커밋한다.** 제목 예: `docs: Caffeine 방문 기록 선택과 전환 검증 기록`. 완료 보고에는 변경 파일·실행 결과·미실행 항목·운영 연결 후속 작업을 포함한다.

## 후속 이슈: 운영 조회수 경로 연결

이번 전환은 이미 구현한 집계 코어의 저장소 변경이다. 다음 단계의 상세 계획은 해당 작업을 시작할 때 현재 인증·권한·응답 계약에 맞춰 작성한다.

1. 조회 등록 POST, 회원 ID/익명 방문자 쿠키 해석, 게시글 읽기 권한 검증 → `PostViewStore.recordView` 호출. 공통 API rate limiter가 조회수 경로도 보호하도록 집계 전에 요청 제한을 적용한다. 필요할 때 정책을 추가하며 조회수 전용 limiter를 중복 구현하지 않는다. 계정·방문자별 제한, 학교·교육장 등 공유 IP를 고려한 보조 IP 제한, 전체 요청 속도·동시 처리량 보호를 설계한다. 기존 인프라·정상 요청 분포·목표 지연·힙을 기준으로 수치를 정하고 초과 요청은 기존 오류 계약에 맞춰 429 등으로 거절한다. 같은 독자 100만 요청과 매번 새 ID인 요청을 나눠 시험하고, 차단된 요청이 새 방문 기록이나 증가분을 만들지 않는지 검증한다. limiter 자체의 기록 보관량도 제한·만료되는지 확인한다.
2. 상세·피드에서 `PostViewStore.currentCount`를 읽어 메모리 증가분 표시. GET 자체는 증가시키지 않는다.
3. 배치 원장과 누계 증가 UPDATE의 동일 DB 트랜잭션, 저장 성공 확인 후 `completeFlush`, 미확정 결과 재시도.
4. DB 저장 스케줄과 종료 drain, 실제 API의 DB 쓰기 수·응답 지연·힙·저장 지연 측정. 방문 기록 정리 스케줄과 DB 저장 스케줄은 책임이 다르다.

Redis 전환과 Caffeine `compute()` 기반 동기화는 이번 구현에 포함하지 않는다. 필요해지면 같은 공개 계약 테스트를 기준으로 별도 구현을 검증한다.

## 실행 결과 — 2026-10-07

- `6496996b`: Caffeine 방문 기록 저장소·공통 계약 추가. 초기 테스트는 구현 클래스 부재로 실패했고 이식 후 9개 계약 테스트가 통과했다. BOM 해석 버전은 3.2.4다.
- `fc436da8`: Spring 기본 조립을 Caffeine으로 전환. 변경 전 Queue 선택 때문에 설정 테스트 1개가 실패했고 변경 후 설정 2개와 실제 DB 통합 1개가 통과했다.
- `52f7a6c7`: PostViewStore의 배치·동시성 공개 계약 추가. 깨끗한 빌드에서 조회수 테스트 62개가 통과했다.
- 최종 전체 검증: H2 1,039개, MySQL 1,040개, 기본 test 1,040개. 모두 실패·오류·건너뛰기 0, BUILD SUCCESSFUL. `--rerun-tasks`로 전체를 실제 재실행했다.
- 별도 코드 리뷰: 수정이 필요한 문제와 보류한 minor 없음.
- 기존 backend/build에는 잘못된 이름의 `* 2.class` 34개가 있어 최초 조회수 suite 실행은 이름 오류로 실패했다. 소스에는 복제 Java 파일이 없었다. 기존 산출물을 삭제하거나 테스트를 제외하지 않고 임시 init script로 buildDirectory만 `/private/tmp/rilog-caffeine-adoption-xl0naps0/build`로 지정해 재컴파일했다. 검증 명령은 아래와 같다.

```bash
./gradlew -I /private/tmp/rilog-caffeine-adoption-xl0naps0/build-directory.init.gradle \
  testH2 testMySql build --rerun-tasks --console=plain --no-daemon --max-workers=2
```

실행 판단: 승인된 기존 기능 브랜치에서 작업하고 사용자 진행 문서는 보존했다. 커밋 타입은 팀 규칙의 `feature`를 사용했다. 공통 rate limiter는 운영 API 연결의 후속 작업으로 남겼다. 임시 빌드 위치 사용은 산출물 격리만 바꾸며 테스트 선택·profile·제품 설정은 바꾸지 않는다. 새 k6 부하 시험, 운영 API·writer·rate limiter 구현 및 FE 검증은 이번 범위에서 실행하지 않았다.
