# ADR 0019: 프론트엔드 팝업을 통한 개인별 플러그인 관리자 연결

- 상태: 구현 · 배포 전
- 날짜: 2026-10-28
- 소유자: Frontend

## 맥락

Import Studio는 별도 Site origin에서 실행되므로 Rilog의 HttpOnly refresh 쿠키를 직접 읽을 수 없다. ACCESS 토큰을 수동으로 복사하는 방식은 짧은 토큰 만료 시간 때문에 이관 작업 중 반복 연결이 필요하다. 백엔드 변경 없이 팀원 각자의 ADMIN 계정으로 연결해야 한다.

## 결정

- Rilog 프론트의 `/plugin-connect` 팝업이 기존 `/v1/auth/token/refresh`와 `/v1/users/me`를 사용한다. 개발·운영 API는 고정된 allowlist로 구분하고 전역 tokenManager에 다른 환경의 토큰을 넣지 않는다.
- 프론트에 설정된 API와 연결 대상이 같으면 기존 tokenManager의 갱신을 공유해 AuthProvider와 refresh 쿠키를 동시에 교체하지 않는다. 다른 환경은 독립 클라이언트로 갱신하며, 프로필 검증은 항상 대상 API에서 수행한다.
- 사용자가 연결을 누르기 전에는 연결 화면이 명시적인 인증 갱신이나 Site로의 토큰 전달을 시작하지 않는다. 기존 앱 AuthProvider의 세션 복구는 유지한다. ADMIN ACCESS claims는 사전 확인이며, 프로필 API가 토큰 서명을 검증한다. 쓰기 권한은 기존 관리자 API가 최종 검사한다.
- ACCESS 토큰은 URL, localStorage, sessionStorage, 로그에 넣지 않는다. 고정된 Import Studio origin으로만 `window.opener.postMessage`로 전달한다. 수신 origin, 원래 opener, 무작위 state, 환경이 모두 같은 갱신 요청만 처리한다.
- 첫 연결의 사용자 ID를 고정하고 다른 Rilog 계정으로 로그인 상태가 바뀌면 자동 갱신을 멈춘다. 다른 계정 연결은 사용자가 다시 연결 버튼을 누를 때만 허용한다.
- refresh 쿠키는 Rilog 브라우저에만 남는다. 팝업이 열려 있고 사용자가 연결을 유지하는 동안 만료 전에 갱신하고, 창 종료·사용자 중지·오류·unmount 시 갱신을 멈춘다. 갱신은 단일 실행으로 합친다.
- Import Studio는 전달받은 ACCESS 토큰을 기존 개인별 연결 경계로 검증·저장한다. 사이트 사용자와 API 환경별 분리는 플러그인이 담당한다.

## 제약과 검증

- 팝업 차단, COOP 정책에 따른 opener 단절, 브라우저 백그라운드 타이머 제한은 연결을 중단할 수 있다. 연결 창은 이를 감지하고 다시 열도록 안내해야 한다.
- GitHub 로그인은 별도 noopener 창에서 수행해 COOP에 의해 원래 플러그인 opener가 끊기지 않도록 한다. 로그인 후 원래 연결 창에서 다시 연결한다.
- 최초 로그인은 같은 API 환경에 연결된 Rilog 프론트에서 수행해야 한다. 운영 빌드의 GitHub callback은 baked production API를 사용하므로 새 개발 로그인을 대신 처리할 수 없다. localhost:3000의 개발 프론트에서 개발 로그인을 수행할 수 있다.
- 운영에서는 고정된 Site origin만 허용한다. 로컬 QA만 NODE_ENV=development에서 localhost/127.0.0.1:4317 override를 허용한다.
- Rilog 프론트 배포 전에는 운영 주소의 `/plugin-connect`가 존재하지 않는다. 플러그인만 배포해서 자동 연결이 완성됐다고 주장하지 않는다.
- 인증 API의 필수 경계만 작은 단위 테스트로 남긴다. 출처 검증·사용자 승인·만료 후 갱신·계정 변경·중지 후 늦은 응답 차단은 실제 핸들러를 사용하는 하나의 popup E2E로 확인하며, 별도 프로토콜 단위·RTL 파일은 제거한다. 실제 API의 CORS와 갱신은 별도 로컬 QA로 확인한다.

배포 순서와 환경별 확인 항목은 [관리자 연결 배포 절차](../qa/plugin-connection-rollout.md)를 따른다. Site의 자동 연결은 서버 활성화 설정이 없으면 숨기며 기존 수동 연결을 유지한다.
