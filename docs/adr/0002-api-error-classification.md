# ADR-0002: API 오류 의미 분류와 비동기 태깅 관측 경계

- 상태: 승인 (아래 확정 범위)
- 날짜: 2026-09-26
- 소유자: Frontend, Backend 계약 확인

## 맥락

BE에 정의된 오류 중 FE 코드표에 없는 항목을 모두 미정의 오류로 처리하면 정상 권한·부재·중복 거부도 시스템 장애로 오인한다.
또한 이미지 태깅은 커밋 후 비동기로 실행되어 FE mutation 오류 수집으로 관측할 수 없다.

## 결정

- 현행 BE enum의 누락 코드를 FE에 추가하고 HTTP 숫자보다 의미에 따라 기존 `ApiErrorKind`로 분류한다.
- 정상 업무 제약과 요청 구조 오류가 모두 `request`일 수 있으므로 `kind`만으로 수집 여부를 확정하지 않는다. 코드와 operation의 의미를 함께 판단한다.
- 사용자가 입력을 고쳐 해결하는 정상 검증은 제외하고, 앱이 잘못 생성한 요청은 수집한다. `kind: field`라는 이유로 앱 내부 필드 누락까지 일괄 제외하지 않는다.
- 코드표를 동기화한 뒤에도 실제 계약에 없는 errorCode는 Sentry 수집 대상으로 한다. 403/404/409라는 이유로 계약 위반을 숨기지 않는다.
- 기존 FE 전용 코드는 계약 폐기 여부가 확인될 때까지 호환성을 유지하되 정상 제외 코드로 자동 간주하지 않는다.
- 이미지 비동기 태깅 실패는 BE 로그·알림·복구 범위로 다루며 Sentry에는 연동하지 않는다.
- GitHub 로그인에서 `OAUTH_CALLBACK_PARAMETER_MISSING`, `GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED`, `GITHUB_USER_FETCH_FAILED`를 수집한다. 확인된 동의 취소는 제외하고, `INVALID_OAUTH_STATE`는 기본 개별 수집 대신 집계한다. 취소로 확인되지 않은 `OAUTH_REQUEST_FAILED`는 수집한다.
- 현재 자사 API의 재시도 후 최종 429는 예상 밖 제한으로 수집한다. 일반 조회는 warning, 핵심 작업 최종 차단은 error로 분류하고 반복 전송을 억제한다. 정상 복구된 중간 429는 집계한다. 외부 서비스와 Sentry ingest의 429는 자사 계약 위반과 분리한다.

- UI용 정규화 객체는 유지한다. 원본 Error는 cause에 내부 보관하고, Sentry에는 별도의 안전한 Error로 변환해 전달한다. 에러 클래스 전면 교체는 하지 않는다.

## 이유

보고 진입점은 apiErrorReporter.report이며, ApiErrorReporter 클래스가 정책 평가와 중복·429 제한 상태를 소유한다. ErrorTracker를 주입받아 전송하며 SentryErrorTracker는 안전한 Error 변환과 SDK 호출을 담당한다. initialize-sentry.ts가 공통 SDK 초기화와 beforeSend 연결을 담당하며 client/server/edge 진입점은 환경별 설정만 전달한다. reporter 인스턴스 파일은 생성만 담당한다.
수집 정책은 순수 함수로 유지하고 UI/BE 메시지 문자열에 의존하지 않는다. 실제 요청의 입력 제약 위반은 API 경계에서 확인해 필드명만 전달한다.

정상 제품 거부와 앱의 요청 생성 오류를 구분하면서 계약에 없는 응답은 놓치지 않기 위함이다.
태깅 실패는 이미 BE에서 구조화 로그를 남기므로 실제 실패를 볼 수 있는 위치에서 운영 대응을 확인한다.

## 검토한 대안

- 모든 4xx 제외: 본문 구조·요청 계약 오류까지 누락한다.
- FE 표에 없는 모든 코드 수집: 코드표 누락을 시스템 장애로 오인한다.
- 태깅 실패를 FE mutation에서 수집: 커밋 후 비동기 처리 경계와 맞지 않는다.

## 결과와 후속 작업

- FE 코드표에 42개를 추가한다. `DATA_INTEGRITY_VIOLATION`은 server로 정정한다. BE 응답과 status는 변경하지 않는다.
- 기존 FE 전용 4개는 BE와 현재 계약 여부를 확인한다. 양측은 앞으로 오류 코드 추가·변경 시 FE 의미 분류를 함께 검토한다.
- 코드 분류 변경은 정규화와 field 오류 위임에 영향을 줄 수 있으므로 관련 단위 검증 및 FE 검증을 수행한다.
- migration: BE 배포 없이 FE가 기존 코드를 인식한다. rollback: FE 코드표·분류만 원복 가능하며 BE 계약은 그대로다.
- 핵심 mutation/OAuth/업로드·최종 조회 실패의 보고 호출과 입력 제약 확인을 구현했다. 429는 reporter 인스턴스/operation당 60초에 1건으로 제한한다. 정규화 객체의 cause 보존, 중복 억제, 안전한 전송도 구현했다. state 오류의 비정상 증가 자동 탐지와 분산 rate-limit 정책은 후속 범위다.
- 이미지 태깅 관련 BE 문의는 보내지 않는다. 상세 코드별 판정과 검토 기록은 [추가 수집 검토](../observability/api-error-collection-review.md)를 따른다.

## operation별 계약과 이벤트 식별 보완

정상 제외 후보와 조건은 `shared/api/api-error-contracts.ts`에서 operation별로 관리하고 수집 정책이 직접 참조한다. 공통 정상 권한·부재·중복 제외는 유지한다. Co-log 참여 제한처럼 특정 작업의 정상 업무 오류가 다른 핵심 작업에서 반환되면 보고한다. 공개 코드·BE 근거·갱신 절차는 [operation별 계약](../observability/api-error-operation-contracts.md)에 기록한다.

제목에는 고정 feature·operation·errorCode·httpStatus·error_type을 사용한다. request_id는 요청별 값이므로 제목 대신 태그로만 보존한다. 기존 error_code·status 태그는 검색 호환성을 위해 유지하고, 응답 없는 오류에 HTTP 상태나 request_id를 만들어 넣지 않는다.

자동 수집 경계에서 정규화되지 않은 ky 오류에도 동일 정책과 안전한 변환을 적용하고 원본 AbortError를 제외한다. NetworkError는 network로 정규화하며 원본 cause와 멱등성을 유지한다. 일반 TypeError는 API 경계 밖에서 통신 오류로 단정하지 않는다.

공통 API 클라이언트를 우회하는 토큰 갱신의 최종 실패도 `auth.refresh`로 보고한다. 정상 토큰 만료는 제외하고 5xx·통신·미정의 코드는 수집하며, 이전 세션 응답 무시와 기존 로그아웃 동작은 유지한다.
