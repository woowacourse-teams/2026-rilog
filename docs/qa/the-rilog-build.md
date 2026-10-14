# 더 리로그 빌드 입력과 오전 6시 갱신

Node 24.19.0, pnpm 11.21.0을 적용한 뒤 `frontend/`에서 실행한다. 로컬 `.env` 또는 실행 환경의 `NEXT_PUBLIC_API_BASE_URL`을 기존 방식으로 사용한다.

## 실제 API 빌드

```sh
pnpm prepare:the-rilog && pnpm build && node scripts/verify-the-rilog-build.mjs
```

빌드 전에 메인 API와 뉴스가 있으면 기존 공개 상세 API를 한 번 읽는다. DTO와 상세 제목 앵커의 대응을 검증한 뒤 `.the-rilog-build/snapshot.json`으로 고정하고 초기 정적 HTML을 생성한다. 방문 시 메인 API를 조회하지 않는다. 이후 운영 갱신은 같은 검증 경계로 새 스냅샷을 저장하고 `/the-rilog`만 ISR로 다시 생성한다. 개발 서버도 준비 입력이 필요하므로 `pnpm prepare:the-rilog` 후 `pnpm dev`를 실행한다.

## 지정한 입력 재사용

```sh
THE_RILOG_SNAPSHOT_PATH=/absolute/path/snapshot.json pnpm prepare:the-rilog && pnpm build
```

파일 없음·손상·checksum 불일치·앵커 불일치는 실패한다. 지정한 입력 대신 현재 API나 이전 입력을 사용하는 fallback은 없다. 실패한 수집은 이전 입력 파일을 덮어쓰지 않는다. CI는 준비 단계가 실패하면 후속 빌드를 실행하지 않는다.

준비 스크립트만 실행할 때 `node scripts/prepare-the-rilog.mjs --output /absolute/path/snapshot.json`으로 출력 위치를 지정할 수 있다. CLI 회귀 테스트는 이 옵션으로 입력과 출력 모두 임시 폴더에 격리한다. `pnpm prepare:the-rilog`는 기본 출력 위치에 입력을 저장하며, `pnpm build`는 이미 준비된 입력을 사용한다.

## 외부 API 없는 품질 검사

```sh
node scripts/create-the-rilog-fixture.mjs
THE_RILOG_SNAPSHOT_PATH=.the-rilog-build/fixture.json \
THE_RILOG_ALLOW_FIXTURE=true \
pnpm prepare:the-rilog

NEXT_PUBLIC_API_BASE_URL=https://api.rilog.test \
NEXT_PUBLIC_DEV_MASTER_TOKEN='' \
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN='' \
NEXT_PUBLIC_SENTRY_DSN='' \
pnpm check

NEXT_PUBLIC_API_BASE_URL=https://api.rilog.test \
NEXT_PUBLIC_DEV_MASTER_TOKEN='' \
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN='' \
NEXT_PUBLIC_SENTRY_DSN='' \
pnpm test:e2e:prod
```

fixture source는 명시적 허용 없이 빌드 입력으로 사용할 수 없다. 테스트 입력은 운영 콘텐츠가 아니다. production E2E는 필수 태그 네 개를 포함한 전체 실행을 유지한다. 매거진 E2E는 테스트 전용 Node fetch preload로 상세의 서버 HTTP 응답만 대체하고 브라우저의 댓글·인증은 해당 spec에서 대체한다. 제품 route에 테스트 전용 분기를 넣지 않는다.

3000번 포트가 사용 중이면 `PLAYWRIGHT_PORT=3002 pnpm test:e2e:prod`로 전체 production 검증을 별도 포트에서 실행한다. 같은 디렉터리에 이미 Next 개발 서버가 있으면 개발용 E2E는 별도 포트라도 Next dev lock 때문에 새 서버를 시작할 수 없다. 기존 개발 서버를 유지할 때는 production 검증을 사용한다.

## 수동 준비 workflow

`The Rilog Build Preparation`을 선택한 ref에서 수동 실행한다. 기존 `ENV_PROD_FE` secret으로 API 입력 수집·production build·정적 산출물 검증을 수행한다. `.env`와 비밀값은 artifact에 포함하지 않는다.

artifact 이름은 `the-rilog-build-preparation-<run id>`이며 기존 운영 배포 artifact와 구분한다. 스냅샷과 manifest, Next 산출물을 7일간 보관한다. manifest의 `publicationReadinessChecked`는 항상 false다. 이 workflow에는 schedule, deploy job, PM2 변경이 없다. Sentry 업로드 없이 만든 준비 artifact를 운영 배포 완료로 사용하지 않는다.

## GitHub Actions에서 수동 운영 갱신

GitHub 저장소의 **Actions → The Rilog Production Refresh → Run workflow**로 수동 갱신한다. 추가 입력은 없다. 선택한 ref의 workflow 정의로 실행되지만, 작업 대상은 항상 `/home/ubuntu/rilog-next`에 이미 배포된 운영 애플리케이션이다. checkout·의존성 설치·빌드·산출물 배포·PM2 재시작 없이 운영 갱신 스크립트를 실행한다. 운영 `.env.production.local`의 secret을 사용하므로 workflow 입력에 토큰을 넣지 않는다.

GitHub 수동 실행 버튼을 사용하려면 workflow 파일이 저장소 기본 브랜치에 있어야 한다. 기본 브랜치에 반영하고 ISR 코드를 운영에 최초 배포한 뒤 사용할 수 있다. self-hosted `frontend` runner가 실행 중이어야 한다. 매번 갱신할 때 EC2에 직접 접속하거나 sudo를 실행할 필요는 없다.

운영 deploy job과 수동 refresh job은 `rilog-fe-production` concurrency group을 공유하며 진행 중인 작업을 취소하지 않고 기다린다. `queue: max`로 대기 중인 배포와 갱신도 유지한다. 새 production push도 진행 중인 배포를 취소하지 않는다. 실행 시 이미 진행 중인 systemd 예약 갱신이 있으면 종료를 최대 약 378초 기다린다. 예약 service가 설치되지 않은 서버에서는 이 대기를 생략한다. 예약 작업이 확인 이후 새로 시작해 수동 수집과 겹치면 앱의 동시 갱신 경계에서 409로 거부될 수 있으며 실패한 실행을 나중에 다시 실행한다.

성공한 실행은 운영 HTML의 checksum과 capturedAt을 검증한 뒤 Actions 로그와 Summary에 성공을 표시한다. 준비·API 수집·저장·HTML 확인 중 실패하면 workflow도 실패한다. 이 workflow를 추가하는 것만으로 운영에 새 코드가 배포되거나 예약 timer가 활성화되지는 않는다.

## 오전 6시 운영 갱신

EC2 systemd timer가 `Asia/Seoul` 오전 6시에 `scripts/refresh-the-rilog.mjs`를 실행한다. `Persistent=true`이므로 서버가 중단돼 놓친 실행은 timer가 다시 활성화될 때 보충한다. 수집·페이지 생성에 걸리는 시간만큼 실제 노출은 6시 이후가 될 수 있다. 일일 작업은 전체 Next 빌드, artifact 배포나 PM2 재시작을 수행하지 않는다.

갱신 CLI는 먼저 같은 서버의 `/the-rilog`에 인증값 없는 GET을 최대 6회 보내 앱 준비를 확인한다. 각 GET은 5초로 제한하고 사이에 1초 대기한다. 준비가 끝나지 않으면 수집 POST를 보내지 않고 실패한다. 준비 후 같은 서버의 loopback 주소에 `POST /api/internal/the-rilog/revalidate`를 호출한다. `Authorization: Bearer <THE_RILOG_REVALIDATION_SECRET>`으로 인증하며 서버 전용 secret이 없는 운영 설정은 사용할 수 없다. API는 현재 백엔드 데이터와 뉴스 본문을 수집·검증하고, 임시 파일을 완성한 뒤 rename으로 스냅샷을 교체한다. 저장에 성공해야 `/the-rilog` 캐시를 무효화한다.

인증 실패는 401, 이미 갱신 중이면 409, secret 누락이나 수집·검증·저장 실패는 503으로 응답하며 cache하지 않는다. 현재 단일 PM2 프로세스 안에서 동시 수집을 거부하고 성공·실패 후 다음 요청을 허용한다. 응답 `202 { checksum, capturedAt }`는 갱신 접수이며 페이지 생성 완료가 아니다. CLI는 이어서 `/the-rilog`를 최대 6회 요청한다. POST 제한 시간은 90초, 각 GET은 30초이며 GET 사이에 1초 대기한다. GET 재시도는 수집 POST를 반복하지 않는다. HTML의 `data-the-rilog-input` checksum과 `data-the-rilog-captured-at` 수집 시각이 모두 응답과 일치해야 성공으로 끝낸다. 같은 콘텐츠가 다시 내려와도 이전 HTML을 갱신 성공으로 오인하지 않도록 수집 시각도 대조한다. 준비·warm 검증 실패는 비정상 종료하며 timer의 journal에서 확인한다.

앱 준비 대기, POST, HTML 확인의 설정상 최대 대기 합계는 약 310초이며 systemd service의 제한은 6분이다. 이벤트 루프 지연 등 실제 실행 시간을 포함한 최종 제한은 systemd가 적용한다.

현재 입력이 오늘 새로 발행된 것인지 확인하지 않는다. API date·publishedAt·checksum으로 완료를 추정하지 않고, 전날 데이터나 유효한 빈 응답도 반영한다. 백엔드 발행 완료를 기다리는 재시도는 없다. 최초 성공 입력 없이 API가 실패하면 빌드를 실패시키며 가짜 콘텐츠를 생성하지 않는다.

## 운영 설정과 적용 확인

1. GitHub의 `ENV_PROD_FE`에 `THE_RILOG_REVALIDATION_SECRET`을 추가한다. `NEXT_PUBLIC_` 접두사를 붙이지 않고 다른 토큰을 재사용하지 않는다. 런타임에서는 배포가 쓰는 `.env.production.local`로 전달하며 artifact에는 secret을 포함하지 않는다.
2. EC2 배포 계정이 `scripts/install-the-rilog-timer.sh`의 systemd 설치·활성화 명령을 `sudo -n`으로 실행할 수 있는지 확인한다. 권한이 없으면 비대화형 배포에서 설치가 실패한다.
3. 운영 배포는 timer를 중단하고 진행 중인 예약 service의 종료를 최대 약 378초 기다린다. 한도를 넘으면 산출물을 교체하기 전에 실패한다. 초기 스냅샷, 갱신 스크립트와 systemd 파일을 배포하고, 설치 스크립트가 배포 입력과 실제 HTML을 확인한 뒤 timer를 활성화한다. 이전에 활성화됐던 timer는 배포 종료 시 재시작되므로 배포 실패 후에도 상태와 journal을 확인한다. PM2 단일 인스턴스가 읽는 로컬 스냅샷과 캐시를 사용한다. 다중 인스턴스로 확장할 때는 공유 입력·캐시 설계가 필요하다.
4. 배포 후 `systemctl list-timers --all the-rilog-refresh.timer`에서 다음 실행 시각을 확인한다. `systemctl status the-rilog-refresh.timer`와 `journalctl -u the-rilog-refresh.service`로 설치·최근 실행 결과를 확인한다.
5. 배포 중에는 수동 갱신을 실행하지 않는다. 배포 대기는 systemd 예약 service를 대상으로 하며 별도 수동 프로세스까지 잠그지는 않는다. 수동 갱신은 `/home/ubuntu/rilog-next`에서 Node 24.19.0을 적용한 뒤 `node --env-file=.env.production.local scripts/refresh-the-rilog.mjs`로 실행한다. secret을 명령행 인수나 로그에 출력하지 않는다. 성공 종료와 실제 메인 HTML 표시를 함께 확인한다.

기본 호출 주소는 `http://127.0.0.1:3000`이다. 포트가 다르면 서버 전용 `THE_RILOG_REFRESH_BASE_URL`을 해당 HTTP loopback origin으로 설정한다. 외부 호스트, 인증정보가 들어간 URL, 경로·query·hash와 리다이렉트는 허용하지 않는다. systemd service는 ubuntu 계정으로 `/home/ubuntu/rilog-next`에서 실행하고 6분 제한 시간을 둔다.

코드 수정·로컬 테스트만으로 서버 timer가 활성화되지는 않는다. 이 안내의 운영 명령은 실제 배포·서버 적용 시 수행한다.

## 검증 범위

단위 테스트는 잘못된 Bearer, 동시 갱신 거부와 해제, 수집·입력 검증 실패, 새 HTML 확인 실패를 검증한다. runner 테스트는 앱이 늦게 시작될 때 GET으로 대기한 뒤 POST를 한 번 보내는지, 준비가 끝나지 않으면 POST 없이 실패하는지 확인한다. 뉴스 상세 실패와 본문 제목 불일치는 snapshot·mapper 테스트의 범위다.

Production 서버에서는 다음 항목을 HTTP 회귀 검증으로 확인한다. 서버 API를 테스트 전용 preload로 대체하며 제품 route에 테스트 분기를 넣지 않는다.

- 인증값 없는 요청 거부
- 변경된 콘텐츠의 스냅샷 및 HTML 교체
- 같은 콘텐츠를 다시 수집해도 새 capturedAt이 HTML에 반영되는지 확인
- 메인 API 503 또는 손상 응답 후 이전 HTML 보존
- 정상 빈 API 응답의 빈 상태 표시
- 실제 갱신 CLI를 통한 새 입력 확인
- 일반 페이지 조회가 메인 API를 다시 호출하지 않는지 확인

`verify-the-rilog-build.mjs`는 정적 생성 설정과 HTML의 checksum·capturedAt만 검사한다. 제목 문자열 검색으로 실제 화면 표시를 증명하지 않는다. 콘텐츠 표시와 메인→상세 앵커 이동은 브라우저 E2E에서 확인한다.

API 수집 실패는 캐시 무효화 전에 끝나 기존 정상 HTML을 보존한다. 스냅샷 저장·무효화 이후 렌더 실패에서도 모든 요청이 이전 HTML로 200을 반환한다고 보장하지 않는다. 갱신 실패는 journal·프로세스 종료 코드로 확인한다.

로컬 fixture 검증은 실제 운영 API, EC2 부팅 순서, systemd 설치 권한, timer 실행 및 Sentry 전달을 증명하지 않는다. 운영 적용 시 앞 절의 상태·journal·실제 HTML 확인을 별도로 수행한다.
