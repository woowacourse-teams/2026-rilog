# Sentry·Slack 진단 개인정보 운영 점검

관련 이슈: #817. 코드 PR은 선행 PR #822 위에서 검토한다. 이 문서는 설정 변경을 실행한 기록이 아니다.

## 현재 확인한 사실

- SDK 버전: @sentry/nextjs 10.75.1. sendDefaultPii=false와 전송 직전 정제를 사용한다.
- 코드: 원본 스택·release·debug ID·operation·HTTP 상태·request ID 보존, query/UI/header 최소화, replay 링크 검증.
- 2026-10-29 현재 연결 Chrome 프로필에서는 `https://sentry.io/auth/login/rilog-frontend/`의 이메일/비밀번호 로그인 화면이 표시됨. 조직/프로젝트 Security & Privacy, 보관 기간, 접근 권한 값은 이번에 재확인하지 못함.
- 실제 Sentry/Slack 이벤트를 새로 전송하거나 기존 이벤트를 삭제하지 않음. 설정·token·계정 권한 변경 없음.

## 로그인 후 읽기 전용 확인

대상 조직 `rilog-frontend`, 프로젝트 `rilog-frontend-nextjs`, project ID `4512133995429888`을 먼저 확인한다.

1. 조직 및 프로젝트 Security & Privacy에서 기본/고급 scrubbing, IP 주소 저장 방지, 예외 필드와 우선순위를 기록한다. 기존 조직 보호 설정을 끄지 않는다.
2. 대표 브라우저/서버 이벤트에서 user.ip_address, user.geo, request header/query, breadcrumb, extra/context에 남는 정보를 확인한다. 값 자체를 이슈·Slack으로 옮기지 않고 필드 이름과 제거 여부만 기록한다.
3. 계정 플랜과 실제 보관 기간을 확인하고, 진단 목적에 필요한 기간·접근 가능한 역할·export 권한을 담당자가 결정한다. 임의 기간을 가정하거나 기존 데이터를 삭제하지 않는다.
4. Slack 채널 보관·외부 공유·접근 멤버, Sentry 통합이 보내는 필드 범위를 확인한다. 서버 scrubbing은 legacy 직접 Slack 전송을 보호하지 않으므로 #815 운영 전환 상태도 대조한다.
5. PostHog replay 링크는 자격증명 그 자체가 아니지만 세션과 연결된다. 프로젝트 접근 권한·보관 정책·녹화 마스킹 설정을 별도로 확인한다. 링크를 공개 채널이나 공개 이슈에 복사하지 않는다.

Sentry 공식 문서는 IP 저장 방지와 별개로 IP에서 지리 정보가 추출될 수 있다고 설명한다. SDK 필드 삭제만으로 서버 파생 지리 정보까지 제거됐다고 판단하지 않는다. 조직의 허용 범위에 따라 고급 scrubbing으로 geo 등 필요한 필드를 제거할지 검토한다.

## 전환과 회귀 기준

- 승인된 설정 변경이 필요하면 대상 필드·기존 값·제안 값·예상 진단 손실을 먼저 기록하고 변경 승인 후 실행한다. 이 PR은 운영 설정을 변경하지 않는다.
- 전용 smoke 프로젝트/채널에서 승인된 가짜 개인정보 fixture만 사용해 SDK 원본 전송과 Slack 알림을 대조한다. 운영 DSN으로 개인정보 fixture를 보내지 않는다.
- 스택/소스맵, release, request ID와 operation이 유지되고 임의 query/fragment/입력 속성/첨부 파일명/인증 header가 없는지 확인한다.
- 정상 replay 링크가 접근 권한을 가진 계정에서 열리는지 확인한다. 불필요한 query/인증값이 붙은 링크는 제외돼야 한다.
- 실제 운영 반영 후 새 이벤트를 관찰한다. 이 필터가 과거 저장 데이터나 기존 Slack 메시지를 소급 정제하지는 않는다.
- 구체적인 조사 정보가 부족하면 원문 수집을 일괄 복구하지 말고 필요한 필드와 안전한 값 형식을 검토한다.

## 참고

- [Sentry 서버 scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/server-side-scrubbing/)
- [Next.js SDK 수집 데이터](https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/)
- 최신 문서의 설정 옵션과 설치된 SDK 10.75.1의 지원 여부는 구분한다. 최신 문서만 보고 지원되지 않는 옵션을 추가하지 않는다.
