# Sentry 네트워크 실패 검증

Sentry 통신 장애가 오류 화면의 복구 동작을 막으면 사용자가 서비스 오류에서 빠져나올 수 없다.
이 테스트는 실제 Next.js production 번들의 Sentry SDK를 실행하고, Playwright가 `/monitoring` 요청을
중단하여 실패한 exception 이벤트 전송을 확인한다. SDK 함수 mock 테스트로는 실제 브라우저의
비동기 전송 실패를 검증할 수 없어 별도의 E2E로 둔다. 기존 글쓰기 4개 흐름은 Sentry 활성화나
오류 화면 진입을 전제로 하지 않으므로 별도 설정으로 격리한다.

```sh
nvm use
node -v # v24.19.0
pnpm -v # 11.21.0
pnpm exec playwright test --config playwright.sentry.config.ts
```

- 테스트 설정으로 production build 후 3107 포트에서 실행한다. 실행 중인 개발 서버는 재사용하지 않는다.
- 실제 계정이나 운영 Sentry DSN을 사용하지 않는다. `/monitoring` 터널을 활성화하려면 Sentry SaaS
  형식의 DSN이 필요하므로 조직·프로젝트 ID가 0이고 key가 모두 0인 가짜 DSN을 사용한다.
  브라우저 전송은 서버에 도달하기 전에 차단한다. 서버 SDK도 같은 가짜 DSN으로 초기화되므로
  유효한 프로젝트로 수집되지 않는다. API는 닫힌 loopback 주소로 고정하며 필요한 피드 응답만
  브라우저에서 대체한다. Sentry 소스맵 업로드 토큰도 비운다.
- SDK를 mock하거나 앱에 테스트 전용 route를 추가하지 않는다.
- 게시글 상세 오류 경계에서 실제 전송 실패 후 재시도 조작과 피드 이동을 확인한다.
  상세 API는 계속 실패하므로 이 시나리오는 게시글 조회 성공까지 검증하지 않는다.
- 별도 Promise rejection의 전송 실패 후, 피드의 키보드 재시도가 성공 응답으로 복구되는지 확인한다.
- 이 브라우저 설정은 실제 Sentry 수신 여부, 서버 SDK의 전송 장애, 저장·발행 등 모든 핵심 흐름을 검증하지 않는다.
- 이 명령은 `.next`를 테스트 환경으로 다시 빌드한다. 배포용 빌드는 실제 환경변수로 다시 실행한다.
- 기존 `pnpm test:e2e`, `pnpm test:e2e:prod`의 필수 글쓰기 4개 흐름과는 별도로 실행한다.

## 서버 전송 연결 실패

```sh
pnpm exec playwright test --config playwright.sentry-server.config.ts
```

- 실제 Next.js Node SDK의 전송 실패로 서버가 중단되거나 응답이 막히는 회귀를 검증한다.
  SDK 함수 mock으로는 확인할 수 없는 HTTP 전송과 SSR 오류 수집 연결을 실행하며,
  브라우저에서는 실제 오류 화면과 이동을 확인한다. 기존 글쓰기 흐름과 필요한 환경이 달라 별도로 실행한다.
- 3108 포트의 테스트 전용 HTTP 수신기는 Sentry envelope를 받은 뒤 HTTP 응답 없이 소켓을 끊는다.
  Node runtime의 exception 이벤트 URL만 기록하여 실제 서버 오류 전송이 있었음을 확인한다.
  테스트 관찰용 `/health`, `/state`는 이 수신기에만 존재하고 제품 앱에는 추가하지 않는다.
- Next.js를 loopback DSN으로 빌드하여 3107 포트에서 실행한다. 실제 Sentry 서비스로 전송하지 않는다.
  브라우저에서 수신기로 향하는 요청은 차단하여 서버 전송과 혼동하지 않는다.
- 서로 다른 게시글 요청 2회에서 서버 오류 전송을 확인하고, 각 연결 실패 후 오류 화면의 피드 이동과
  `/about`의 HTTP 200 응답 및 화면 표시를 검증한다.
- 검증 범위는 Node 서버의 연결 단절이다. Edge runtime, DNS 실패, 장시간 timeout은 별도 범위다.
- 두 Sentry 설정은 같은 `.next`와 3107 포트를 사용하므로 순서대로 실행한다.
  테스트 종료 후 일반 환경 빌드가 필요하면 `pnpm build`를 다시 실행한다.
