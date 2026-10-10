# 조회수 메모리 집계 — #697

## 구현 범위

#694의 DB 누계를 초기값으로 사용하는 게시글별 메모리 카운터를 구현한다. 회원/익명 독자 식별자, 1시간 중복 제한, 동시성, 배치 상태 전환, 초기화 공유/실패 복구 및 만료 독자 기록 관리를 포함한다. Spring 기본 조립은 게시글별 CaffeineViewerRecordStore를 사용한다. 초기화된 Counter는 JVM이 종료될 때까지 유지한다.

HTTP 등록 API·쿠키 발급·상세 GET 연결·DB batch writer·배치 저장 스케줄러·종료 drain은 후속 이슈다. 별도 메모리 정리 스케줄러와 @EnableScheduling은 도입하지 않는다. 기존 GET이 메모리 값을 읽거나 조회수가 자동 증가하지 않는다. FE 파일과 기존 HTTP 응답 계약을 변경하지 않는다.

## 사용 흐름

등록 API는 후속 구현에서 공개/발행/미삭제 상태와 읽기 권한을 먼저 검증해야 한다. 이후 인증된 회원 ID 또는 서버 쿠키에서 해석한 익명 UUID를 ViewerIdentity로 만들어 PostViewStore.recordView(postId, viewer)를 호출한다. Registry는 게시글 자격이나 HTTP 인증을 대신 검사하지 않는다. getOrLoad와 Counter의 recordView는 패키지 내부 기능으로 두며 서비스에서 Counter를 직접 수정하지 않는다.

회원 ID와 익명 UUID는 서로 다른 식별자 타입이다. 로그인 전후·다른 기기·쿠키 삭제는 같은 사람으로 합치지 않는다. 쿠키 발급과 전달은 아직 구현하지 않았다.

PostViewStore.currentCount(postId)는 이미 초기화된 카운터가 있으면 메모리 현재 값을 읽고, 없으면 DB 누계만 읽는다. 읽기만으로 카운터나 중복 기록을 만들지 않는다. 누계 누락·조회 실패·저장된 수량 범위 오류는 0으로 대체하지 않는다.

## 상태와 동시성

현재 조회수 = confirmedCount + pendingDelta + inFlightBatch.delta

PostViewCounter가 숫자와 배치를 소유하며 게시글별 ViewerRecordStore에 독자 기록을 위임한다. 같은 게시글의 중복 판정·시각 갱신·증가·현재 값 읽기·배치 전환은 Counter의 ReentrantLock으로 처리한다. Caffeine 내부 만료 유지보수는 Caffeine의 동시성 제어로 수행한다. 다른 게시글의 Counter는 독립적으로 처리한다.

중복 제한은 마지막 인정 시점에서 정확히 1시간이 지난 경우에만 해제된다. 거절된 요청은 시각과 순서를 바꾸지 않는다. 경과 시간은 주입 가능한 System.nanoTime 기반 공급자로 판단하고, 배치 생성 시각은 기존 UTC Clock으로 기록한다.

prepareFlush는 대기분을 불변 UUID 배치로 이동한다. 미확정 배치가 있으면 같은 ID/증가분을 반환한다. 그동안 새 조회는 pendingDelta에 쌓인다. completeFlush는 일치하는 배치만 확정 누계로 옮기며 중복/오래된 완료 호출은 무효다.

후속 writer는 DB 반영이 확인된 뒤에만 completeFlush를 호출해야 한다. 저장 실패나 결과 불명확 상태에는 배치를 유지한다. 메모리 상태 전환만으로 DB 중복 반영을 막을 수 없으며, 후속 이슈에서 배치 원장과 증가 UPDATE를 같은 트랜잭션으로 구현한다.

## 구현 교체 경계

사용하는 서비스와 후속 writer는 PostViewStore 계약에 의존한다. 현재 구현은 PostViewCounterRegistry다. recordView·currentCount·prepareFlushBatches·completeFlush(postId, batchId)를 제공하며 Counter 객체를 외부에 전달하지 않는다. prepareFlushBatches는 이미 초기화된 Counter의 대기분을 배치로 옮기고, 같은 미확정 배치를 재반환한다. completeFlush는 알 수 없는 게시글의 Counter를 생성하지 않는다.

JVM 내부 방문 기록 관리만 교체할 때는 ViewerRecordStore를 구현하고 Registry의 factory 생성자에 전달한다. Spring의 PostViewConfig는 factory로 CaffeineViewerRecordStore::new를 전달한다. Registry 기본 생성자는 기존 QueueViewerRecordStore를 유지해 비교와 Queue 전용 회귀 검증에 사용한다. 정리·중복 확인·기록 갱신·조회수 증가를 묶는 원자성은 Counter의 ReentrantLock이 보장한다. 저장소 객체 하나만 교체해도 이 잠금과 숫자·배치 로직은 공유한다.

다중 JVM에서 공유 상태가 필요하면 PostViewStore 전체를 Redis 구현으로 교체해야 한다. 로컬 ViewerRecordStore를 Redis Map처럼 바꾸는 것만으로는 로컬 Counter와 원격 기록의 원자성이 보장되지 않는다. 원격 저장소에서는 중복 판정·등록·증가를 서버 측 원자적 연산으로 묶고 배치의 재시도·확정을 같은 계약으로 구현해야 한다.

## 초기화와 만료 정리

Registry는 recordView 진입 시 입력을 검증한 뒤 ConcurrentMap.putIfAbsent로 생성 예정인 Future를 등록하고, 성공한 요청만 DB 누계를 읽어 Counter를 생성한다. Registry는 만료 정리를 오케스트레이션하지 않는다. 전역 등록 잠금과 카운터 개수 한도는 사용하지 않는다. 같은 글의 요청은 하나의 초기화를 기다리며 다른 글의 DB 로딩은 독립적으로 진행한다. 실패하면 해당 Future만 제거하고, 기다리던 요청에 원인을 전달한 뒤 다음 요청이 재시도하게 한다. DB I/O는 Map 연산과 카운터 잠금 밖에서 실행한다.

비교 구현 QueueViewerRecordStore는 Counter마다 하나씩 생성되며 자신의 PriorityQueue에 해당 게시글의 인정 기록을 마지막 인정 acceptedTick 순서로 보관한다. acceptedTick에는 System.nanoTime 값을 기록하며, 만료 여부와 정렬은 tick 차이로 판단한다. 인정된 조회는 해당 Counter 잠금 안에서 독자별 마지막 인정 tick을 갱신하고 큐에 (viewer, acceptedTick) 항목을 넣는다. 중복 요청과 조회수 상한 초과로 거절된 요청은 큐 항목을 만들지 않는다.

정리는 같은 recordView 요청의 기존 Counter ReentrantLock 안에서 수행한다. 요청 1회당 해당 게시글의 만료 큐 항목을 최대 100개만 처리하며, 큐의 첫 항목이 아직 만료되지 않았으면 그대로 두고 정리를 멈춘다. 현재 독자 기록에 저장된 acceptedTick이 큐 항목의 acceptedTick과 아직 일치할 때만 stale이 아닌 기록으로 보고 삭제한다. 더 최근 조회로 갱신된 stale 항목은 아무 상태도 바꾸지 않는다. 독자별 마지막 인정 시각 조회는 기존 Map.get 기반 중복 판정을 유지한다.

누계 행이 없으면 POST_VIEW_COUNT_MISSING, DB 누계가 허용 범위를 벗어나면 POST_VIEW_COUNT_INVALID 오류를 RilogInfrastructureException으로 전달한다. 기존 게시글 상세 조회도 누계 누락에 동일한 오류 코드를 사용한다. 기존 오류 응답 형식과 HTTP 500 상태는 유지하며 오류 코드를 구체화한다. 진단용 게시글 ID는 예외 메시지에만 포함하고 공개 응답은 오류 코드와 고정 메시지를 사용한다.

DB 접근에서 발생한 RuntimeException이나 Error는 초기화 요청과 대기 중인 요청에 원본 그대로 전달한다. 그 외 초기화 실패는 원인을 보존한 INTERNAL_SERVER_ERROR로 전달한다. 초기화 실패 후에는 해당 Future를 제거해 다음 요청이 재시도할 수 있다.

조회수는 0..9,007,199,254,740,991 범위다. 이미 최대값이면 새 인정은 증가·인정 시각 갱신 없이 거절한다. 중복 요청은 증가 없이 현재 값을 반환한다.

## 만료 독자 기록 관리와 Counter 유지

Spring 기본 구현 CaffeineViewerRecordStore는 Counter마다 Cache<ViewerIdentity, Long> 하나를 생성한다. expireAfterWrite(ViewPolicy.DUPLICATE_WINDOW)와 주입된 ElapsedTimeSource ticker를 사용한다. 마지막으로 인정된 방문 기록을 put하고 중복 요청은 getIfPresent로 확인만 하므로 중복 요청이 만료 시점을 연장하지 않는다. 마지막 인정부터 정확히 1시간이 지나면 Counter가 재방문을 인정한다.

방문 기록의 논리적 만료와 실제 메모리 삭제는 다르다. 만료된 기록은 조회에서 없는 것으로 취급되며 실제 회수는 Caffeine의 쓰기와 일부 읽기 시 유지보수로 진행된다. 요청이 없는 게시글의 모든 만료 기록이 정확히 1시간 시점에 메모리에서 제거된다는 보장은 없다. 별도 정리 스케줄러·Caffeine scheduler·@EnableScheduling은 도입하지 않는다. Caffeine 구현의 cleanupExpired는 no-op이며 요청당 100개라는 수동 정리 제한은 적용되지 않는다.

비교 구현 QueueViewerRecordStore는 해당 게시글 요청 시 만료 큐를 최대 100개씩 정리하는 기존 동작을 유지한다. Queue 전용 테스트는 정리량·stale 항목·tick 순환·다른 게시글과의 독립성을 검증하며, 두 구현의 공통 계약은 중복 정책과 집계 결과를 검증한다.

Counter의 누계·미저장 증가분·미확정 배치는 방문 기록 만료와 별개로 보존한다. 배치 저장이 완료되거나 방문 기록이 비어도 Counter를 Registry에서 제거하지 않는다. Counter 제거 정책은 변경하지 않았고, 집계 상태에 TTL을 적용하지 않는다.

Counter 개수와 방문 기록 개수의 절대 상한은 없다. Caffeine maximumSize도 설정하지 않는다. 유효한 중복 기록을 용량 때문에 먼저 퇴거시키면 1시간 안의 동일 독자를 다시 인정할 수 있기 때문이다. Caffeine 도입이 전체 JVM heap 상한을 보장하지는 않는다. 현재 단계에는 실제 batch writer가 없어 집계한 증가분이 자동 저장되지 않는다.

운영 POST 활성화 전에 공통 API rate limiter와 서버 전체 요청 속도·동시 처리량 보호를 설계한다. 조회수 전용 limiter를 중복 도입하기보다 공통 limiter가 이 API도 보호하도록 한다. 식별자를 변경하는 봇과 분산 IP 요청, 학교·교육장 공유 IP를 고려해 정상 요청 분포와 실제 API 부하로 한도를 정한다. 중복 제거·TTL·캐시 최대 개수는 요청 제한을 대체하지 않는다. 이번 전환에는 HTTP API나 rate limiter 구현을 추가하지 않았다.

Counter 수, 방문 기록 수, heap과 저장 지연을 운영 연결 후 측정한다. Counter 유지와 Queue 비교 구현의 이력은 ADR 0008, Caffeine 선택은 [ADR 0009](../../docs/adr/0009-post-view-caffeine-viewer-records.md)에 기록한다.

## 운영 전제와 검증

단일 활성 JVM 전제다. 비정상 종료 시 미저장 증가분과 독자 기록은 유실될 수 있다. 메모리 집계가 연결되기 전인 이번 단계에는 신규 HTTP 집계 경로가 없다.

정책/식별자/카운터/Registry 단위 시험에서 1시간 경계, 동시 같은 독자 100회=+1, 서로 다른 독자 100명=+100, 배치 전환 합 보존, 초기화 공유·실패 전파, 수량 범위, Counter 소유 큐 기반 만료 정리, stale 큐 항목 무시, 정리와 조회의 경쟁, 빈 Counter와 저장 완료된 Counter의 유지 및 불필요한 DB 재조회 방지를 검증한다. 실제 Spring/DB 통합 시험은 누계 초기화, 누계 누락 오류와 DB 쓰기 없는 집계를 검증한다.

통합 시험은 전용 H2 DB와 MySQL 테스트 컨테이너를 사용한다. 종료되는 컨텍스트가 다른 테스트의 공유 H2 스키마를 삭제하지 않도록 격리한다.

backend 검증 명령: ./gradlew testH2 testMySql build --console=plain --no-daemon --max-workers=2

2026-10-05 Counter 유지 정책으로 변경하기 전 검증 기록: H2 1,016개, MySQL 1,017개, 기본 test 1,017개 전부 통과 및 BUILD SUCCESSFUL. 당시 집계 관련 시험은 40개였다. 독립 코드 리뷰에서 중요 문제는 발견되지 않았고 FE 914개 파일의 hash 변경은 없었다. 이 기록은 Counter 제거 로직을 포함하던 이전 구현의 결과다. 운영 배포와 부하 시험은 후속 단계에서 진행한다.

2026-10-05 Counter 제거 로직 삭제 후 검증 결과: H2 1,015개, MySQL 1,016개, 기본 test 1,016개 모두 실패·오류·건너뛰기 없이 통과하고 BUILD SUCCESSFUL을 확인했다. 집계 관련 시험은 39개이며 독립 코드 리뷰에서 수정이 필요한 문제는 발견되지 않았다. 이번 작업 전후 frontend 추적 파일 911개의 hash 변경은 없다. 기존 빌드 디렉터리의 테스트 결과 파일 읽기에서 검증이 지연돼 해당 실행을 중단하고, 임시 Gradle init script로 buildDirectory만 새 임시 디렉터리로 지정해 testH2 testMySql build 전체를 다시 실행했다. 저장소 build 설정과 테스트 선택 조건은 변경하지 않았다.

2026-10-05 조회수 오류 분류 개선 후 검증 결과: H2 1,016개, MySQL 1,017개, 기본 test 1,017개 모두 실패·오류·건너뛰기 없이 통과하고 BUILD SUCCESSFUL을 확인했다. 누계 누락·범위 오류와 기존 상세 조회의 누계 누락 시험을 변경 전 실패로 확인한 뒤 수정했으며, DB 접근 예외 원본과 원인 보존 및 초기화 재시도도 검증했다. 독립 코드 리뷰에서 수정이 필요한 문제는 발견되지 않았다. 앞선 검증과 같이 임시 Gradle init script로 buildDirectory만 새 임시 디렉터리로 지정했으며 저장소 build 설정과 FE 파일은 변경하지 않았다.

2026-10-06 방문자 기록 한도·정리 스케줄러 제거 및 요청 시 만료 큐 정리 적용 후 검증 결과: H2 1,018개, MySQL 1,019개, 기본 test 1,019개 모두 실패·오류·건너뛰기 없이 통과하고 BUILD SUCCESSFUL을 확인했다. 새 회귀 시험 4개의 변경 전 실패를 확인했으며, 변경 후 조회수 관련 시험 41개에서 10만 개를 넘는 독자 기록, 다른 글의 만료 기록 회수, 요청당 전역 정리량, tick 순환 경계 및 재조회와 정리의 경쟁을 검증했다. 독립 코드 리뷰에서 수정이 필요한 문제는 발견되지 않았다. 임시 Gradle init script로 buildDirectory만 새 임시 디렉터리로 지정했으며 저장소 build 설정과 FE 파일은 변경하지 않았다.

2026-10-06 게시글별 만료 큐로 리팩토링한 후 검증 결과: H2 1,017개, MySQL 1,018개, 기본 test 1,018개 모두 실패·오류·건너뛰기 없이 통과하고 BUILD SUCCESSFUL을 확인했다. 변경 전 새 정책 회귀 시험 7개 중 3개의 예상 실패를 확인한 뒤 변경했으며, 변경 후 조회수 관련 시험 40개가 통과했다. 전역 큐 전용 시험은 제거하고 게시글별 요청당 100개 정리, 다른 글의 정리와 독립적인 집계, 오래된 항목의 갱신 기록 보존, 1시간 경계·tick 순환 및 중복 요청의 정리를 검증했다. 독립 코드 리뷰에서 수정이 필요한 문제는 발견되지 않았다. 임시 Gradle init script로 buildDirectory만 새 임시 디렉터리로 지정했으며 저장소 build 설정과 FE 파일은 변경하지 않았다.

## 2026-10-07 Caffeine 전환 검증

Spring 기본 방문 기록 구현을 Caffeine 3.2.4로 전환했다. Counter의 락·숫자·배치 상태 및 두 교체 인터페이스는 유지했다. 공통 방문 기록 계약 9개와 설정 테스트 2개, 공개 PostViewStore 배치·동시성 계약 10개를 추가했다. 독립 코드 리뷰에서 수정이 필요한 문제는 발견되지 않았다.

H2 1,039개, MySQL 1,040개, 기본 test 1,040개가 실패·오류·건너뛰기 없이 통과했고 BUILD SUCCESSFUL을 확인했다. 기존 build 폴더의 잘못된 이름 `* 2.class` 34개 때문에 최초 suite 실행에 오류가 발생해, 임시 Gradle init script로 buildDirectory만 깨끗한 `/private/tmp/rilog-caffeine-adoption-xl0naps0/build`로 변경하고 전체를 `--rerun-tasks`로 재실행했다. 제품 build 설정과 테스트 선택 조건은 변경하지 않았다.

실행 명령은 `./gradlew -I /private/tmp/rilog-caffeine-adoption-xl0naps0/build-directory.init.gradle testH2 testMySql build --rerun-tasks --console=plain --no-daemon --max-workers=2`다. 초기 계약 테스트의 구현 클래스 부재와 Spring의 Queue 선택 실패를 변경 전에 확인했다. FE와 공개 HTTP 계약, 기존 Redis 인증 코드는 변경하지 않았다. 새 k6 실험과 운영 API·DB writer·공통 rate limiter·종료 저장은 이번 전환의 검증 대상이 아니다.
