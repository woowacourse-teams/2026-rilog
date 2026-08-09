# 품질 게이트 도입 예정안

현재 저장소에는 CI가 구성되어 있지 않다. 이 문서는 frontend 스캐폴드와 CI 도입 시 검토할 기본안이며, 실제 required check는 팀 합의 후 workflow와 함께 확정한다.

## 원칙

- 빠른 검증을 먼저, 비싼 검증을 나중에 실행한다.
- 구현 세부보다 사용자 동작과 비즈니스 계약을 검증한다.
- 같은 위험을 여러 계층에서 중복 검증하지 않는다.
- bug fix에는 가능한 가장 낮은 계층의 재현 테스트를 남긴다.
- local command와 CI command는 같은 script를 사용한다.

## Frontend 예정안

| 순서 | 게이트 | 책임 |
| ---: | --- | --- |
| 1 | format | 기계적 포맷 |
| 2 | lint | 코드 품질, import와 React 규칙 |
| 3 | typecheck | TypeScript 계약 |
| 4 | Vitest unit | policy, mapper, serializer와 순수 함수 |
| 5 | RTL component | 입력, 상태 전이, 오류와 접근성 |
| 6 | Next.js build | Server/Client 경계와 production build |
| 7 | Playwright smoke | 핵심 사용자 수직 흐름 |

Frontend 스캐폴드 시 다음 script 이름을 기본안으로 사용한다.

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

`check`는 format, lint, typecheck, unit, component와 build를 실행한다.

## Backend

백엔드 품질 게이트, 검증 명령과 CI 연결은 백엔드 팀이 결정한다. 확정 전에는 현재 backend build 설정에 실제로 존재하는 검증만 실행하며, 이 문서에서 별도 스택이나 도구를 지정하지 않는다.

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
