# 리로그 프론트엔드 오류 추적

현재 구현 기준은 [ADR 0004](../adr/0004-sentry-sdk-context.md)다. [ADR 0003](../adr/0003-sentry-event-privacy.md)과 [이전 수집 검토](api-error-collection-review.md)는 변경 전 결정을 설명하는 기록이다.

Next.js client/server/edge의 Sentry SDK가 런타임 오류를 수집한다. 애플리케이션의 오류 보고와 사용자 ID 설정은 `errorTracker`를 통하고, SDK 호출은 `SentryErrorTracker`에 둔다. SDK 초기화와 Next.js 계측 진입점은 별도다. QueryCache와 MutationCache는 재시도가 끝난 API 실패를 보고한다. 작업별 진단이 필요한 mutation과 OAuth·업로드 등 직접 호출은 `api-error-reporter-instance.ts`의 `apiErrorReporter.report`를 사용하고, 공통 경계와 중복 보고하지 않는다.

보고 함수는 원본 Error를 유지한다. tracker의 tag에는 operation, HTTP 상태, 공개 오류 코드, `X-Request-ID`를 넣고 Sentry adapter가 scope에 적용한다. context에는 요청 method/URL과 공개 오류 응답의 상태·코드·메시지·검증 정보를 넣는다. 로그인 상태에서는 내부 user ID를 연결하고 로그아웃 시 지운다. 서버 요청에는 다른 사용자의 scope를 공유하지 않는다.

전송 직전에는 인증 헤더, 쿠키, 토큰, 비밀번호, 서명 query, 요청 본문, 이메일과 첨부파일을 제거한다. Sentry 기본 브라우저·릴리즈·스택·breadcrumb와 임의의 안전한 진단 정보는 유지한다. 사용자 작성 본문을 임의 Error 메시지·context에 넣지 않는다. 백엔드는 요청마다 새 UUID를 응답의 `X-Request-ID`에 담고, 로그와 Sentry에서 이 값으로 요청을 연결한다.

확인된 OAuth 취소, 명확한 정상 인증·권한·부재·충돌·입력 검증은 제외한다. 최종 5xx, 429, 통신 오류, 응답 검증 오류, 예상 밖의 4xx는 수집한다. 재시도로 복구된 중간 실패는 수집하지 않는다. 수집 실패가 사용자 화면의 오류 복구를 방해하지 않게 한다.

검증은 단위·컴포넌트 테스트와 실제 SDK transport 테스트, 브라우저·서버 Sentry smoke를 사용한다. 운영 배포 후에는 이벤트량, 그룹화, 소스맵 복원, 요청 ID로 서버 로그를 찾을 수 있는지 확인한다.

## 프론트엔드 배포 소스맵

`production` push의 프론트엔드 빌드에서 `SENTRY_UPLOAD_REQUIRED=true`와 `SENTRY_RELEASE=배포 커밋 SHA`를 설정한다. `ENV_PROD_FE`에 `SENTRY_AUTH_TOKEN`이 있어야 하며, 빌드 전 존재 여부를 확인한다. Next.js 빌드의 Sentry 통합이 브라우저·서버 소스맵을 같은 프로젝트에 업로드한다. SDK 기본 오류 처리에 따라 업로드가 실패하면 빌드도 실패한다. 업로드 후 생성된 소스맵은 빌드 산출물에서 삭제하고, 공개 `.next/static`에 `.map` 파일이 남으면 패키징을 중단한다. 서버는 빌드 job에서 만든 `.next`를 그대로 배포한다.

PR과 로컬 빌드는 `SENTRY_UPLOAD_REQUIRED`가 없으므로 Sentry 소스맵 업로드를 건너뛴다. `SENTRY_AUTH_TOKEN`은 빌드 단계에서만 사용하며 배포 압축 파일에 `.env`를 넣지 않는다. 실제 운영 검증에서는 배포 커밋 SHA와 Sentry 이벤트의 release를 대조하고, 브라우저 및 Node 오류 각각에서 원본 파일·행이 복원되는지 확인한다. 이벤트의 Debug ID가 업로드한 artifact와 연결되지 않으면 Sentry의 source map debug 화면에서 누락된 artifact 또는 경로를 조사한다. 기존 개발 서버 기반 503 smoke는 오류 수집을 확인하지만 운영 소스맵 복원을 증명하지 않는다.
