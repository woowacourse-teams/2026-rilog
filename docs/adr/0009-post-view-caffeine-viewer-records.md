# ADR 0009: Caffeine 방문 기록과 Counter의 집계 책임 분리

- 상태: 승인
- 날짜: 2026-10-07
- 소유자: Backend
- 관련 이슈: #697
- 이전 결정: [ADR 0008](0008-post-view-counter-lifecycle.md)

## 맥락

기존 구현은 게시글별 HashMap과 PriorityQueue로 방문 기록을 보관하고 조회 요청마다 만료 항목을 최대 100개 정리한다. 방문 기록 저장소를 교체하는 ViewerRecordStore와 집계 전체를 교체하는 PostViewStore 계약은 이미 분리돼 있다.

실험 브랜치에서 같은 Counter·락·배치 상태를 유지한 채 Queue와 Caffeine 방문 기록 구현을 비교했다. 일반 조회에서 보편적인 승자는 확인하지 못했다. 초기 기록 10만 개를 만료시킨 조건에서 동시 사용자 100명의 요청 p95 반복 중앙값은 Queue 9.14ms, Caffeine 4.34ms였다. 초기 동일 데이터의 GC 후 유지 힙 증가량은 글 1개에 집중했을 때 12.92/13.45 MiB, 글 1,000개에 분산했을 때 11.67/13.90 MiB였다.

이는 같은 로컬 머신에서 테스트 API와 k6를 실행한 결과이며 운영 인증·DB writer·실제 API의 성능을 증명하지 않는다. 이번 전환에서 부하 실험을 새로 실행한 수치도 아니다. 기존 실험 기록은 `be/test/#697-조회수-로컬-캐시-비교` 브랜치의 `backend/docs/post-view-k6-concurrency-comparison.md`와 원시 결과에 보존돼 있다.

## 결정

Spring 기본 조립은 Registry의 factory에 CaffeineViewerRecordStore::new를 전달한다. Caffeine은 게시글별 방문자 ID → 마지막 인정 tick을 보관하고 expireAfterWrite로 1시간 만료를 관리한다. 경과 시간은 기존 ElapsedTimeSource로 주입한다. 거절된 중복 요청은 put하지 않아 만료 시간을 연장하지 않는다.

Counter의 ReentrantLock, confirmedCount·pendingDelta·inFlightBatch와 배치 전환 규칙은 유지한다. 중복 확인·방문 기록 갱신·증가·현재 값 읽기·배치 준비와 완료의 원자성은 Counter가 보장한다. Caffeine의 개별 연산 안전성만으로 이 전체 작업의 원자성을 대신하지 않는다.

기존 Queue 구현과 Registry 기본 생성자는 비교·회귀 테스트용으로 유지한다. Queue의 100개 정리 제한은 Caffeine에 적용하지 않는다. 별도 정리 스케줄러와 Caffeine scheduler는 추가하지 않는다. Caffeine 만료 항목의 실제 메모리 회수가 정확히 1시간에 끝난다고 보장하지 않는다.

Counter는 기존처럼 JVM 종료까지 유지한다. 누계·미저장 증가분·미확정 배치에 TTL을 적용하거나 저장 완료 후 Counter를 제거하지 않는다. 방문 기록에도 임의 maximumSize를 적용하지 않는다. 유효한 기록을 일찍 퇴거시키면 같은 독자를 1시간 안에 다시 인정할 수 있다.

## 교체 경계와 대안

- ViewerRecordStore는 JVM 내부 방문 기록 구현의 교체 경계다. 조회수 숫자와 배치 상태는 옮기지 않는다.
- PostViewStore는 집계 구현 전체의 교체 경계다. 상위 서비스와 writer는 이 계약에 의존하고 Counter를 직접 수정하지 않는다.
- Caffeine compute로 동기화를 옮기는 대안은 가능하다. 하지만 가변 Counter의 모든 상태 접근을 같은 게시글 compute로 보호해야 하며, 이번에는 상태와 보호 코드를 Counter에 함께 두는 현재 구조를 유지한다. compute 방식의 비교 성능은 측정하지 않았다.
- Redis 전환 시에는 PostViewStore 구현에서 공유 상태·서버 측 원자적 중복 판정과 증가·배치 재시도 및 완료를 함께 구현한다. 로컬 Counter를 유지한 채 방문 기록만 Redis로 바꾸는 것으로 다중 JVM 원자성이 보장되지는 않는다.

## 결과와 후속 작업

방문 기록 만료 자료구조를 직접 유지하는 코드를 기본 집계 경로에서 줄인다. Caffeine의 추가 메모리 비용은 감수하지만 전체 JVM heap 상한은 보장하지 않는다. 단일 활성 JVM, 재시작 시 방문 기록 초기화, 비정상 종료 시 미저장 증가분 유실 전제를 유지한다.

조회 등록 POST·쿠키 해석·권한 검증·상세/피드 연결·실제 DB batch writer·저장 스케줄·종료 drain은 후속 이슈다. 운영 POST 활성화 전에 모든 API에 적용하는 공통 rate limiter가 조회수 경로도 보호하게 하고, 정상 요청 분포와 서버 전체 요청 속도·동시 처리량을 기준으로 정책을 검증한다. 조회수 중복 제거와 캐시 TTL은 요청 제한을 대체하지 않는다.

이번 변경은 FE와 공개 API 계약, 인증용 Redis를 변경하지 않는다. 실험용 HTTP 서버와 benchmark source set도 기능 브랜치로 가져오지 않는다.
