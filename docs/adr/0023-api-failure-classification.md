# ADR 0023: API 최종 실패의 분류와 원인 요청 표시

- 상태: 제안 (코드 구현, 운영 미반영)
- 관련 이슈: #816, #812
- 선행 변경: #815 / PR #821

## 배경

prod는 실행 환경이다. timeout/network는 관찰된 브라우저 통신 실패이며 서버 장애를 확정하지 않는다. 기존 API 정책은 취소·오프라인·일부 정상 거부를 제외하지만 보고 이유를 구조화하지 않았다. Slack의 최근 breadcrumb 세 개는 오류 발생 요청이 아닐 수 있다.

## 결정

기존 보고 여부를 유지하며 `classifyApiError`가 종류와 수집 여부를 함께 반환한다. 원래 Error와 stack, 중복 억제, query/mutation 재시도 및 UI 동작은 보존한다.

| error_kind                      | 의미                                                    | 수집   |
| ------------------------------- | ------------------------------------------------------- | ------ |
| timeout / network / unknown     | 응답 시간 초과 / 네트워크 실패 / 분류 불가              | 예     |
| server_response / rate_limit    | HTTP 5xx / 429 응답 관찰                                | 예     |
| storage_rejected                | upload.put의 일반 HTTP 403/404                          | 예     |
| unexpected_response             | 알려진 정상 거부가 아닌 나머지 응답, 원인 불명 400 포함 | 예     |
| cancelled / offline             | 명시적 취소 / navigator offline인 network               | 아니오 |
| validation / expected_rejection | 기존 입력 검증 코드 / 기존 인증·없음·충돌 등 제외 조건  | 아니오 |
| disabled_operation              | 조회 등록의 명시적 비활성화 503 코드                    | 아니오 |

HTTP 400 전체를 제외하지 않는다. M_ID나 timeout 전체를 필터링하지 않는다. 서버 응답 5xx 역시 전체 서비스 중단 여부나 원인 컴포넌트를 확정하지 않는다. 기존 401/403/404/409 등 제외 규칙의 타당성 전면 재검토는 별도 정책 변경이다.

`error_kind`, `user_impact`, `runtime`을 Slack 허용 태그에 포함한다. `user_impact`는 실제 실패 경계이며 장애 심각도·영향 사용자 수를 추정하지 않는다.

- `load_failed`: query cache 데이터 없이 최종 조회 실패
- `load_failed_with_data`: 기존 cache 데이터가 있는 조회 실패 (재조회·추가 페이지 포함)
- `action_failed`: 공통 mutation 최종 실패
- `save_failed`: 초안 저장·덮어쓰기 실패 (서버 저장 여부는 응답 실패만으로 확정 불가)
- `unknown`: 호출부가 명시하지 않은 경우

피드, 게시글 상세, 초안 상세·목록은 query meta에 구체적 operation을 둔다. endpoint 등록표는 만들지 않는다.

원인 요청은 기존 WeakMap의 api_request context에서만 가져온다. 화면 route, 마지막 breadcrumb를 원인 요청으로 추측하지 않는다. optional `apiRequest`를 SDK 요약·수신 parser·서명 webhook·Slack 본문에 연결한다.

- method: 지정 HTTP method만 허용
- URL: HTTPS api.rilog.kr/api.rilog.test의 기본 포트만 허용, query/fragment 제거, 숫자·UUID path segment를 [id]로 치환, 길이 제한
- statusCode: 해당 오류의 정수 100~599
- requestId: 백엔드 상관관계 조회용 UUID만 허용
- 외부 presigned 저장소 URL은 object key와 서명을 보내지 않고 method/status만 남김
- body/header/임의 추가 키는 복사하지 않음

UUID가 아닌 request ID나 원인 context가 없는 이벤트는 해당 필드가 생략된다. webhook payload에 context가 없다면 breadcrumb로 대체하지 않는다. 일반 문자열 path segment(예: slug)까지 제거하는 전체 개인정보 정책은 #817에서 검토한다. 기존 breadcrumb/title/SDK 개인정보 정책 전체 변경은 이 PR 범위가 아니다.

구형 클라이언트 요약에는 apiRequest가 없어도 허용한다. 신규 클라이언트와 구형 수신 서버를 혼합하면 새 태그를 구형 parser가 거부할 수 있으므로 본 변경은 선행 #821과 함께 서버/클라이언트에 일관되게 배포한다. Sentry 자체 수집 경로에는 영향을 주지 않는다.

## 검증과 운영 확인

단위 테스트는 HTTP 400/5xx 분류, timeout 유지, 취소·오프라인 제외, 원본 오류와 중복 억제, 추가 원인 요청 필드의 정제와 parser 왕복을 검증한다. 실제 SDK 메모리 transport로 기존 stack/context/privacy 경계를 확인한다. QueryProvider 통합 테스트는 cache 유무와 데이터 보존을 검증한다. 서명 webhook handler 및 실제 Slack formatter의 외부 fetch만 대체해 새 필드의 전달을 확인한다.

운영 반영 후 실제 피드/초안 실패에서 operation/error_kind/user_impact와 request ID를 백엔드 로그와 대조한다. 실제 실패를 인위적으로 발생시키지 않는다. #815 운영 전환 전에는 기존 SDK 전송 전 Slack 경로가 남으며, 이 PR이 그 신뢰성 문제를 단독으로 해결하지 않는다.
