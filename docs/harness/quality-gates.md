# 프론트엔드 품질 게이트

현재 프론트엔드의 로컬·CI 검증 범위를 기록한다. 계층별 테스트 선택과 작성 규칙은 [프론트엔드 테스트 기준](../testing/README.md), TypeScript 기준과 외부 값의 검증 경계는 [프론트엔드 TypeScript 기준](frontend-typescript.md)을 따른다.

## 원칙

- 빠른 검증을 먼저, 비싼 검증을 나중에 실행한다.
- 구현 세부보다 사용자 동작과 비즈니스 계약을 검증한다.
- 같은 위험을 여러 계층에서 중복 검증하지 않는다.
- bug fix에는 가능한 가장 낮은 계층의 재현 테스트를 남긴다.
- local command와 CI command는 같은 script를 사용한다.

## 현재 로컬 검증

| 순서 | 게이트                      | 책임                                             |
| ---: | --------------------------- | ------------------------------------------------ |
|    1 | format                      | 기계적 포맷                                      |
|    2 | lint                        | 코드 품질, import와 React 규칙                   |
|    3 | typecheck                   | TypeScript 계약                                  |
|    4 | Vitest unit                 | policy, mapper, serializer와 순수 함수           |
|    5 | RTL component               | 입력, 상태 전이, 오류와 접근성                   |
|    6 | Next.js build               | Server/Client 경계와 production build            |
|    7 | `pnpm test:e2e` (별도 실행) | 개발 서버에서 글쓰기 필수 4건과 인라인 댓글 검증 |
|    8 | `pnpm test:e2e:prod`        | 기존 production build에서 같은 브라우저 검증     |

현재 `frontend/package.json`에는 다음 script가 있다.

```text
format:check
lint
typecheck
test:unit
test:component
test:e2e
test:e2e:prod
build
check
```

`check`는 format, lint, typecheck, unit, component와 build를 실행하며 E2E는 포함하지 않는다. `typecheck`는 `next typegen && tsc --noEmit`으로 build 전에 실행된다. 컴파일 타임의 타입 검사는 외부 JSON 값을 검사하지 않으므로 선택한 입력 경계에는 런타임 가드와 실패 흐름 테스트를 둔다. 실제 script가 추가되기 전에는 없는 명령을 완료 검증으로 보고하지 않는다.

현재 E2E는 외부 API 없이 글쓰기의 history, beforeunload, 파일 입력과 모바일 접근 정책을 검증한다. `test:e2e:prod`는 `pnpm build`가 먼저 완료돼 있어야 하며 기존 서버를 재사용하지 않는다.

```sh
pnpm check
pnpm test:e2e:prod
```

CI와 동일한 production E2E를 재현할 때는 build 전부터 아래 환경을 적용한다.

```sh
NEXT_PUBLIC_API_BASE_URL=https://api.rilog.test \
NEXT_PUBLIC_DEV_MASTER_TOKEN='' \
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN='' \
pnpm check

NEXT_PUBLIC_API_BASE_URL=https://api.rilog.test \
NEXT_PUBLIC_DEV_MASTER_TOKEN='' \
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN='' \
pnpm test:e2e:prod
```

screenshot은 실패 진단용으로만 생성하며 기준 이미지 비교는 운영하지 않는다.

## 현재 CI

`.github/workflows/rilog-fe-quality-gates.yml`은 다음 조건에서 `pnpm check`와 production E2E를 한 job에서 실행한다.

- `develop`·`production` 대상 모든 PR
- GitHub Actions의 수동 실행

문서·백엔드만 바뀐 PR에도 workflow가 실행된다. `Frontend Quality`가 두 대상 브랜치의 required check이므로 workflow에 `paths` 제한을 두면 관련 없는 PR에서 검사가 Pending으로 남아 병합을 막는다. PR의 기준 커밋과 검사 대상 merge commit을 비교해 `frontend/` 또는 품질 workflow가 바뀌지 않았으면 setup·설치·검증 단계를 건너뛰고 job을 성공으로 끝낸다. 변경 파일 확인 자체가 실패하면 job도 실패한다. `workflow_dispatch`는 변경 파일 판단 없이 전체 검증을 실행한다. `develop`에 직접 push할 때 실행되는 `push` trigger는 없다. LLM 지침은 작성·리뷰를 돕고, 위반을 기계적으로 검출하는 단계는 lint·typecheck·테스트다.

수동 실행은 workflow가 기본 브랜치에 등록된 뒤 GitHub Actions에서 선택한 ref를 검증한다.

정기 실행은 운영하지 않는다. 현재 검증은 고정된 의존성과 fixture를 사용하고 실제 계정·외부 API에 의존하지 않아 PR 검증과 필요 시 수동 실행으로 관리한다. 외부 서비스·시간 의존 계약이나 별도 브라우저 버전 검증을 도입하면 정기 실행의 필요성을 다시 검토한다.

CI는 Ubuntu 24.04, Node 24.19.0, pnpm 11.21.0과 frozen lockfile을 사용한다. pnpm 저장소는 `setup-node`로 cache한다. Next.js `.next/cache`는 로컬 확인에서 약 475MB로, 압축해도 약 387MB였다. GitHub의 PR cache는 해당 PR 범위에서만 재사용되고 최근 CI에서 build 컴파일은 약 16~20초였으므로, 대용량 cache의 전송 비용이 절감 시간을 넘을 수 있어 추가하지 않았다.

`pnpm check`가 만든 production build를 `pnpm start` E2E에서 재사용한다. E2E는 기본 headless Chromium 프로젝트만 사용하므로 전체 Chromium 대신 headless shell과 시스템 의존성만 설치한다. 브라우저 바이너리 cache는 복원 시간과 다운로드 시간이 비슷하고 Linux 시스템 의존성을 대신할 수 없어 운영하지 않는다. 권한은 `contents: read`, timeout은 20분이고 동일 PR의 이전 실행은 취소한다. 변경 전후 시간은 Actions의 `Detect frontend changes`, `Run frontend checks`, `Install Playwright Chromium headless shell`, `Run production E2E` 단계로 비교한다.

실패하면 다음 파일을 7일간 `frontend-quality-<run id>` artifact로 보관한다.

- `${RUNNER_TEMP}/rilog-quality-logs/check.log`, `${RUNNER_TEMP}/rilog-quality-logs/e2e.log`
- Playwright JSON 결과, 실패 screenshot과 trace
- `playwright-report` HTML report

단위·RTL·E2E가 0건을 수집하면 실패한다. `test:e2e:prod`는 필수 태그 4개 중 누락·중복·skip·미실행·실패가 있으면 custom reporter가 job을 실패시킨다. `test:e2e`는 파일·grep 선택으로 개별 흐름을 조사할 수 있다. retry는 0이고 CI에서는 `test.only`를 금지한다.

`.github/workflows/rilog-fe-prod.yml`의 기존 `production` PR build와 `production` push 배포는 그대로 유지한다. 품질 workflow는 `develop`·`production`의 required check이며, 배포 workflow의 선행 job은 아니다.

## Backend

백엔드는 별도 workflow와 팀 검증 기준을 따른다.

## 파트 간 변경

- 두 파트에 영향을 주는 변경은 영향 범위와 각 파트가 실행할 검증을 PR에 기록한다.
- 구체적인 계약 형식과 자동 검증 방식은 실제 API와 이벤트가 정해질 때 팀이 함께 결정한다.

## CI 필수 검사 유지·변경 조건

required check를 유지하거나 변경할 때 다음을 확인한다.

1. 모든 팀원이 local에서 같은 명령을 실행할 수 있다.
2. 실패 메시지로 수정 위치를 찾을 수 있다.
3. 반복 실행에서 flaky failure가 없다.
4. 소유자와 예외 처리 방식이 정해져 있다.
5. 실행 시간이 팀 피드백 목표에 맞는다.

승격 전에는 같은 커밋의 정상 실행과 의도적 실패 실행에서 종료 코드와 artifact가 기대대로 남는지 확인한다.
