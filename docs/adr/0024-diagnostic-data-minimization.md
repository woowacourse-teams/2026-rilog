# ADR 0024: 오류 진단 데이터의 허용 목록과 개인정보 최소화

- 상태: 제안 (코드 구현, 운영 미반영)
- 관련: #817, #812 / 선행 PR #822
- 보완: ADR 0004의 URL·breadcrumb 정제 정책, ADR 0023의 원인 요청 정제

## 문제

기존 URL denylist는 알지 못하는 query key와 fragment를 놓친다. UI selector의 DOM id/class, aria-label, title, 임의 data 속성도 사용자 작성 문자열을 포함할 수 있다. PostHog replay 링크는 host/path만 확인하면 URL 인증값·비표준 포트·임의 path 값이 남을 수 있다.

## 결정

SDK 오류·transaction·span과 Slack 요약·수신 parser가 공통 진단 정제 함수를 사용한다. 원본 Error, 예외 스택과 줄·열, release/debug ID, operation, 상태, UUID request ID는 유지한다. 이벤트를 별도 allowlist DTO로 재구성하지 않는다.

- URL query는 `page`, `size`의 1~4자리 숫자만 허용한다. 검색어·필터의 문자열 값은 기본적으로 제거한다. 별도 query_string의 문자열/객체/tuple 형식에도 적용한다.
- fragment와 URL 인증값은 전달하지 않는다. 자사 app URL은 기존 route template으로 정규화한다. API의 블로그·사용자 slug 및 파일명·이메일 형태의 path segment는 치환한다. 임의 외부 URL은 object key나 서명을 복사하지 않는다.
- 소스맵에 필요한 자사 `/_next/static/` JS/CSS/map 경로와 스택의 source filename은 유지한다. 코드 위치의 개인정보까지 완전히 제거한다는 보장은 하지 않는다.
- UI breadcrumb는 표준 element와 enum으로 검증한 type/role만 남긴다. DOM id/class, aria-label, title, value, 임의 data 속성과 원문 selector는 제거한다. 구형 클라이언트 요약을 받아도 수신 parser가 다시 정제한다.
- SDK breadcrumb는 UI/navigation/HTTP 흐름에 필요한 필드만 남기며 console 및 기타 임의 breadcrumb는 제외한다. HTTP의 method/URL/status, navigation의 from/to는 보존한다.
- request 및 중첩 header는 UUID X-Request-ID와 지정 Content-Type만 허용한다. raw User-Agent 등 나머지는 제거하며 SDK browser/OS/runtime context는 유지한다. SDK user는 숫자 형태의 내부 ID만 남긴다. 전달된 IP/geo와 server_name은 제거한다.
- 파일명 key와 인증·본문 key의 중첩 표현도 제거한다. free text에서 알려진 토큰·이메일·첨부 파일명 패턴을 가린다. 임의 이름이나 작성 본문 전체를 탐지하는 DLP는 아니므로 Error 메시지·context에 사용자 원문을 넣지 않는 호출부 원칙은 유지한다.
- replay는 승인된 PostHog origin과 `/project/{public-project-identifier}/replay/{UUID}`, 단일 숫자 t만 허용한다. 인증값·포트·fragment·인코딩된 임의 ID·추가 query는 거절한다. SDK에서 링크를 붙이기 전과 Slack 수신 양쪽에서 검증한다. 설치된 posthog-js 1.418.10은 project 구간에 공개 project token을 넣을 수 있고 세션 ID는 UUID로 만든다. 정상 replay 링크의 공개 프로젝트 식별자/세션 ID는 진단 목적상 유지한다.
- Slack 알림 첫 줄은 `error_kind`와 `user_impact`를 기준으로 중요도를 3단계(`error` `🔴`: 런타임 예외·`server_response`·`storage_rejected`·`unexpected_response`, `warn` `🟡`: `rate_limit`·`timeout`·`unknown` 및 저장·액션 중 `network`, `info` `🟢`: 일반 조회 `network`)로 표시한다. 서명 webhook 전환 전(legacy 모드)에도 서버가 알고 있는 Sentry 조직 슬러그와 검증된 32자리 `eventId`만으로 `https://{org}.sentry.io/issues/?query={eventId}` 조회 링크를 함께 제공한다.

## 호환성과 손실

서버와 클라이언트를 선행 PR과 함께 일관되게 반영한다. 구형 요약의 UI 속성도 정제하므로 HTTP 요청이 유효하면 알림 전체를 버리지 않는다. UI 요소의 정확한 DOM id/class와 문자열 검색 조건, 외부 파일 URL, console 로그는 진단에서 사라진다. 요청 method/상태/operation/request ID와 실제 스택으로 조사를 시작한다. 필요한 추가 필드는 구체적 사례와 안전한 값의 계약을 확인한 뒤 허용한다.

PostHog 녹화 payload 자체의 정책은 변경하지 않는다. 기존 코드의 maskAllInputs=true, recordHeaders/recordBody/streamNetworkBody=false, console recording=false, ph-mask/ph-no-capture 경계를 확인했다. 이 PR은 replay 링크 검증을 보완하며 녹화 전체의 개인정보 안전성을 증명하지 않는다.

## 검증

기존 구현에서 임의 query/fragment/UI 속성/replay 인증값이 남는 회귀를 먼저 재현했다. 단위 테스트는 상대·절대 URL, slug·파일명·이메일, query_string 세 형태, UI 수신 재정제, span/transaction을 확인한다. 실제 SDK 메모리 transport는 파일명·임의 query·UI·중첩 인증 header 제거와 원본 스택·줄 번호·request ID·정상 replay 유지 및 잘못된 replay 제외를 확인한다.

SDK는 기존 client가 있으면 재초기화를 생략하므로 transport 테스트마다 종료 후 current scope client를 해제해 각 테스트의 beforeSend 설정을 실제로 실행한다. 테스트 경계를 우회하거나 필수 검사를 약화하지 않는다.

## 운영 확인 한계

2026-10-29 연결 Chrome `순재` 프로필의 Rilog Sentry 접근은 조직 로그인 화면으로 이동했다. 설정 저장·자격증명 입력·새 인증 생성은 하지 않았다. 서버 scrubbing/보관 기간/계정 권한의 현재 값은 미확인이다. 남은 점검과 전환 절차는 `docs/qa/sentry-privacy-review.md`를 따른다. SDK가 제거한 IP 필드와 네트워크 전송에서 Sentry가 관찰하는 접속 IP는 별개다. #817은 운영 점검이 끝날 때까지 닫지 않는다.
