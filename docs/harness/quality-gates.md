# 프론트엔드 품질 게이트

현재 프론트엔드의 로컬·CI 검증 범위를 기록한다. 계층별 테스트 선택과 작성 규칙은 [프론트엔드 테스트 기준](../testing/README.md), TypeScript 기준과 외부 값의 검증 경계는 [프론트엔드 TypeScript 기준](frontend-typescript.md)을 따른다.

## 원칙

- 빠른 검증을 먼저, 비싼 검증을 나중에 실행한다.
- 구현 세부보다 사용자 동작과 비즈니스 계약을 검증한다.
- 같은 위험을 여러 계층에서 중복 검증하지 않는다.
- bug fix에는 가능한 가장 낮은 계층의 재현 테스트를 남긴다.
- local command와 CI command는 같은 script를 사용한다.

## 현재 로컬 검증

| 순서 | 게이트                      | 책임                                                                 |
| ---: | --------------------------- | -------------------------------------------------------------------- |
|    1 | format                      | 기계적 포맷                                                          |
|    2 | lint                        | 코드 품질, import와 React 규칙                                       |
|    3 | typecheck                   | TypeScript 계약                                                      |
|    4 | Vitest unit                 | policy, mapper, serializer와 순수 함수                               |
|    5 | RTL component               | 입력, 상태 전이, 오류와 접근성                                       |
|    6 | Next.js build               | Server/Client 경계와 production build                                |
|    7 | `pnpm test:e2e` (별도 실행) | 개발 서버에서 글쓰기 필수 4건·편집기 입력·인라인 댓글·읽기 위치 검증 |
|    8 | `pnpm test:e2e:prod`        | 기존 production build에서 같은 브라우저 검증                         |

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

현재 E2E는 외부 API 없이 글쓰기의 history, beforeunload, 파일 입력과 모바일 접근 정책, 실제 편집기 입력, 인라인 댓글 Selection·바텀시트·History 동작과 읽기 위치를 검증한다. 기존 전체 시나리오는 Chromium에서 실행하고, 모바일 댓글 시나리오는 WebKit·Firefox에서도 실행한다. 색상·고정 폰트 크기·아이콘 파일 경로는 이 게이트의 보호 대상이 아니다. `test:e2e:prod`는 `pnpm build`가 먼저 완료돼 있어야 하며 기존 서버를 재사용하지 않는다.

```sh
pnpm check
pnpm test:e2e:prod
```

CI와 동일한 production E2E를 재현할 때는 build 전부터 아래 환경을 적용한다.

더 리로그의 초기 정적 HTML은 명시적 테스트 스냅샷으로 빌드한다. ISR 갱신도 API 수집·검증 실패 시 입력과 캐시를 유지하고, 성공 후 production HTML의 checksum·capturedAt을 확인하는 회귀 검증을 둔다. 먼저 `node scripts/create-the-rilog-fixture.mjs`를 실행하고, `THE_RILOG_SNAPSHOT_PATH=.the-rilog-build/fixture.json`, `THE_RILOG_ALLOW_FIXTURE=true`로 `pnpm prepare:the-rilog`를 실행한 뒤 check를 실행한다. 전체 명령은 [더 리로그 빌드 안내](../qa/the-rilog-build.md)에 있다. 실제 API 실패를 fixture로 자동 대체하지 않는다.

```sh
export NEXT_PUBLIC_API_BASE_URL=https://api.rilog.test
export NEXT_PUBLIC_DEV_MASTER_TOKEN=''
export NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=''
export NEXT_PUBLIC_SENTRY_DSN=''
export NEXT_PUBLIC_SENTRY_ENABLED=false
export THE_RILOG_SNAPSHOT_PATH=.the-rilog-build/fixture.json
export THE_RILOG_ALLOW_FIXTURE=true

node scripts/create-the-rilog-fixture.mjs
pnpm prepare:the-rilog
pnpm check
pnpm exec playwright install chromium webkit firefox
pnpm test:e2e:prod
```

개발 및 production E2E는 기존 서버를 재사용하지 않는다. 기존 개발 서버에는 fixture 환경과 서버 fetch preload를 뒤늦게 주입할 수 없기 때문이다. 기본 포트가 사용 중이면 `PLAYWRIGHT_PORT=3002`처럼 별도 포트를 지정한다. 같은 작업 디렉터리에서 Next 개발 서버가 실행 중이면 dev lock 때문에 별도 개발 E2E 서버를 띄울 수 없으므로, 기존 개발 서버를 유지할 때는 production E2E 또는 격리된 체크아웃을 사용한다. ISR 캐시 검증인 `*.prod.spec.ts`는 production 설정에서만 실행한다.

screenshot은 실패 진단용으로만 생성하며 기준 이미지 비교는 운영하지 않는다.

## 현재 CI

`.github/workflows/rilog-fe-quality-gates.yml`은 다음 조건에서 `pnpm check`·빌드, 브라우저별 production E2E, 결과 통합을 순서대로 실행한다.

- `develop`·`production` 대상 모든 PR
- GitHub Actions의 수동 실행

문서·백엔드만 바뀐 PR에도 workflow가 실행된다. `Frontend Quality`는 두 대상 브랜치에서 실행하지만 병합 필수 조건은 아니다. 기존 실행 범위를 유지하기 위해 workflow에 `paths` 제한을 두지 않는다. PR의 기준 커밋과 검사 대상 merge commit을 비교해 `frontend/` 또는 품질 workflow가 바뀌지 않았으면 setup·설치·검증 단계를 건너뛰고 job을 성공으로 끝낸다. 변경 파일 확인 자체가 실패하면 job도 실패한다. `workflow_dispatch`는 변경 파일 판단 없이 전체 검증을 실행한다. `develop`에 직접 push할 때 실행되는 `push` trigger는 없다. LLM 지침은 작성·리뷰를 돕고, 위반을 기계적으로 검출하는 단계는 lint·typecheck·테스트다.

수동 실행은 workflow가 기본 브랜치에 등록된 뒤 GitHub Actions에서 선택한 ref를 검증한다.

품질 CI의 정기 실행은 운영하지 않는다. 더 리로그 콘텐츠 갱신은 EC2의 오전 6시 systemd timer에서 수행하며 이 품질 workflow의 예약 실행이 아니다. 현재 검증은 고정된 의존성과 fixture를 사용하고 실제 계정·외부 API에 의존하지 않아 PR 검증과 필요 시 수동 실행으로 관리한다. 외부 서비스·시간 의존 계약이나 별도 브라우저 버전 검증을 도입하면 정기 실행의 필요성을 다시 검토한다.

CI는 Ubuntu 24.04, Node 24.19.0, pnpm 11.21.0과 frozen lockfile을 사용한다. pnpm 저장소 cache는 각 job에서 재사용한다.

### 두 갈래 실행과 최종 판정

- `Frontend source checks`는 `pnpm check:source`로 format·lint·typecheck·unit·component를 실행한다.
- `Frontend build and E2E`는 동시에 시작해 fixture 준비·production build·정적 산출물 검증 후 Chromium·WebKit·Firefox 전체 E2E를 실행한다. 브라우저 설치·서버·의존성 준비는 한 job에서 수행하며 build artifact 전송이나 보고서 병합은 없다.
- 두 job은 각각 같은 변경 경로를 확인해 비프론트 변경만 무거운 단계를 생략한다. 수동 실행은 전체 검증한다.
- `Frontend Quality`는 항상 두 job의 성공을 확인한다. 실패·취소·job 생략은 최종 실패다. 최종 job은 checkout이나 의존성 설치가 필요 없다.
- 전체 E2E에 기존 필수 네 흐름 reporter를 그대로 적용한다. 누락·중복·skip·미실행·실패를 허용하지 않는다. worker 1개, retry 0, 세 브라우저의 테스트 선택 범위를 유지한다.
- 로컬 `pnpm check`는 `pnpm check:source && pnpm build`로 기존 전체 검증을 유지한다. 코드 검사와 build는 서로 다른 runner에서 실행해 `.next` 생성 경합을 피한다.
- 검사 및 build/E2E timeout은 각각 20분이며 최종 판정은 5분이다. 코드 검사 실패 전 이미 시작된 build/E2E의 runner 사용은 발생할 수 있다.

실패 로그·trace/screenshot과 전체 E2E의 HTML·JSON 결과는 7일 보관한다. 실제 전체 대기와 job 실행 시간 합계를 함께 측정하고 runner 합계를 과금액으로 해석하지 않는다.

`.github/workflows/rilog-fe-prod.yml`은 기존 `production` PR build와 `production` push 배포를 유지하고, 운영 artifact에 초기 스냅샷·갱신 스크립트·timer 설치 파일을 포함한다. 배포 시 server-only secret과 EC2 권한을 확인하고 systemd timer를 설치한다. 일일 콘텐츠 갱신은 `/the-rilog`만 재생성한다. 운영 설정과 실패 확인은 [더 리로그 빌드·갱신 안내](../qa/the-rilog-build.md)를 따른다. 품질 workflow는 `develop`·`production`에서 실행하지만 병합 필수 조건은 아니며, 배포 workflow의 선행 job도 아니다.

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
