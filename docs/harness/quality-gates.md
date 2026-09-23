# 프론트엔드 품질 게이트

현재 프론트엔드의 로컬·CI 검증 범위를 기록한다. 계층별 테스트 선택과 작성 규칙은 [프론트엔드 테스트 기준](../testing/README.md)을 따른다.

## 원칙

- 빠른 검증을 먼저, 비싼 검증을 나중에 실행한다.
- 구현 세부보다 사용자 동작과 비즈니스 계약을 검증한다.
- 같은 위험을 여러 계층에서 중복 검증하지 않는다.
- bug fix에는 가능한 가장 낮은 계층의 재현 테스트를 남긴다.
- local command와 CI command는 같은 script를 사용한다.

## 현재 로컬 검증

| 순서 | 게이트                      | 책임                                   |
| ---: | --------------------------- | -------------------------------------- |
|    1 | format                      | 기계적 포맷                            |
|    2 | lint                        | 코드 품질, import와 React 규칙         |
|    3 | typecheck                   | TypeScript 계약                        |
|    4 | Vitest unit                 | policy, mapper, serializer와 순수 함수 |
|    5 | RTL component               | 입력, 상태 전이, 오류와 접근성         |
|    6 | Next.js build               | Server/Client 경계와 production build  |
|    7 | `pnpm test:e2e` (별도 실행) | 글쓰기 브라우저 흐름 4건               |

현재 `frontend/package.json`에는 다음 script가 있다.

```text
format:check
lint
typecheck
test:unit
test:component
test:e2e
build
check
```

`check`는 format, lint, typecheck, unit, component와 build를 실행하며 E2E는 포함하지 않는다. 실제 script가 추가되기 전에는 없는 명령을 완료 검증으로 보고하지 않는다.

현재 E2E는 외부 API 없이 글쓰기의 history, beforeunload, 파일 입력과 모바일 접근 정책을 검증한다. CI 필수 검사는 아니며 screenshot 기준 이미지 비교는 운영하지 않는다.

## 현재 CI

`.github/workflows/rilog-fe-prod.yml`은 `production` 대상 PR에서 frontend build job을 실행하고, `production` push에서 배포한다. `develop` PR의 Vitest·Playwright 검증과 전체 E2E 정기 실행은 아직 없다.

## Backend

백엔드는 별도 workflow와 팀 검증 기준을 따른다.

## 파트 간 변경

- 두 파트에 영향을 주는 변경은 영향 범위와 각 파트가 실행할 검증을 PR에 기록한다.
- 구체적인 계약 형식과 자동 검증 방식은 실제 API와 이벤트가 정해질 때 팀이 함께 결정한다.

## CI 필수 검사 승격 조건

검사를 required check로 올리기 전에 다음을 만족한다.

1. 모든 팀원이 local에서 같은 명령을 실행할 수 있다.
2. 실패 메시지로 수정 위치를 찾을 수 있다.
3. 반복 실행에서 flaky failure가 없다.
4. 소유자와 예외 처리 방식이 정해져 있다.
5. 실행 시간이 팀 피드백 목표에 맞는다.
