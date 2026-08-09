# Rilog 프로젝트 공통 작업 규칙

## 저장소 구조

- `frontend/`: 사용자 UI와 프론트엔드 애플리케이션
- `backend/`: API, 데이터와 서버 애플리케이션
- `docs/`: 파트 공통 규칙과 ADR
- `.github/`: PR 및 이슈 템플릿과 추후 도입할 자동화 설정

현재 작업 디렉터리에서 가장 가까운 `AGENTS.md`를 함께 읽는다. 루트 규칙은 전체 프로젝트에 적용되고 `frontend/AGENTS.md`, `backend/AGENTS.md`는 해당 파트의 구체 규칙을 추가한다.

## 공통 원칙

- 작업 전에 목표, 비목표, acceptance criteria와 영향받는 파트를 확인한다.
- 기존 구조와 utility를 우선 사용하고 실제 책임이 생기기 전에 추상화나 빈 폴더를 만들지 않는다.
- 새 의존성은 사용처가 있는 PR에서만 추가하고 목적, 대안과 유지보수 영향을 기록한다.
- 사용자 변경이나 다른 파트의 진행 중인 작업을 되돌리지 않는다.
- 버그 수정은 가능한 가장 낮은 계층에 재현 테스트를 먼저 추가한다.
- 실패한 필수 검사를 삭제하거나 약화해서 통과시키지 않는다.

## 파트 간 계약

- API schema, 인증/권한, 오류 형식, 분석 이벤트와 공개 URL은 파트 공통 계약이다.
- 공통 계약 변경은 frontend와 backend 영향 및 호환성 계획을 PR에 기록한다.
- 계약을 깨는 변경은 관련 테스트와 문서를 같은 PR 또는 연결된 PR에서 갱신한다.
- 제품 정책, 보안 또는 파트 간 경계를 바꾸면 `docs/adr/`에 결정 기록을 남긴다.

## 완료와 검증

- frontend 변경은 스캐폴드 이후 `frontend/AGENTS.md`와 실제 package script에 정의된 검증을 실행한다.
- backend 변경은 `backend/AGENTS.md`와 backend 팀이 확정한 실제 build 설정의 검증을 실행한다.
- 두 파트에 영향이 있으면 각 파트가 합의한 검증 범위를 PR에 기록한다.
- 완료 보고에는 변경 파일, 실행한 검증, 결과, 실행하지 못한 항목과 남은 위험을 포함한다.
- CI 도입 전에는 실행한 로컬 검증과 실행하지 못한 항목을 PR에 기록한다. CI 도입 후 필수 검사와 예외 기준은 팀 합의에 따라 이 문서와 `docs/harness/`에 반영한다.

## Git과 리뷰

- Git Flow를 사용한다. `main`은 운영 배포, `develop`은 개발 통합, 파트별 작업 브랜치는 상세 기능 단위로 운용하고 `hotfix` 타입은 배포 후 긴급하고 치명적인 버그 수정에만 사용한다.
- `main`과 `develop` direct push를 금지한다.
- 파트별 브랜치는 `<be|fe>/<type>/#<이슈번호>/<이슈-설명>` 형식을 사용한다. 예: `be/feature/#1/초기-세팅`, `fe/feature/#3/응원`.
- 공통 작업 브랜치는 `<type>/#<이슈번호>/<이슈-설명>` 형식을 사용한다. `type`에는 `docs`, `chore`, `ci` 등 작업 성격을 사용한다.
- `feature`, `fix`, `refactor` 등 일반 작업 브랜치는 `develop`에서 분기하고 작업 완료 후 `develop`에 merge한다.
- `hotfix` 타입 브랜치는 `main`에서 분기하고 해결 후 `main`과 `develop`에 모두 merge한다.
- PR 제목은 `[Type] #이슈번호 설명` 형식으로 작성하고 `Type`의 첫 글자는 대문자로 쓴다. 예: `[Feature] #12 로그인 기능 추가`.
- PR 본문과 이슈는 `.github/`의 템플릿을 사용한다.
- 검증과 review conversation을 확인한 뒤 squash merge한다.
- commit 및 squash message는 `docs/harness/lore-commit.md`를 따른다.

세부 기본값과 기본 완료 조건은 `docs/harness/team-defaults.md`를 따른다.
