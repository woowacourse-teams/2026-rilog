# Rilog 팀 하네스 기본값

별도 합의가 없으면 아래 값을 사용한다. 변경하려면 이유와 영향을 PR 또는 ADR에 기록한다.

## 공통 개발 방식

- 전략: Git Flow
- production 브랜치: `main` — 운영 배포 기준
- 개발 브랜치: `develop` — 기능 통합과 다음 배포 준비
- 파트별 브랜치: `<be|fe>/<type>/#<이슈번호>/<이슈-설명>` — Backend 또는 Frontend 상세 작업
- 공통 작업 브랜치: `<type>/#<이슈번호>/<이슈-설명>` — 문서, 저장소 설정과 자동화 등 공통 작업
- `main`과 `develop` direct push: 금지
- merge: squash merge

## 최초 설정

1. 최초 한 번 `main`의 최신 커밋에서 `develop`을 생성한다.
2. 팀 저장소에 `develop`을 올린 뒤 일반 작업의 기준 브랜치로 사용한다.
3. `develop` 최초 생성은 direct push 금지 규칙의 bootstrap 예외다.

## 브랜치 흐름

### 파트별 일반 작업

1. `develop`에서 `<be|fe>/<type>/#<이슈번호>/<이슈-설명>` 브랜치를 만든다.
2. `type`에는 `feature`, `fix`, `refactor` 등 작업 성격을 사용한다.
3. 이슈 설명은 공백 대신 하이픈을 사용한다.
4. 상세 기능 단위로 작업하고 PR을 생성한다.
5. 검증과 리뷰가 끝나면 `develop`에 merge한다.

예시:

- `be/feature/#1/초기-세팅`
- `fe/feature/#3/응원`

### 공통 작업

- 공통 작업은 `<type>/#<이슈번호>/<이슈-설명>` 형식을 사용한다.
- `type`에는 `docs`, `chore`, `ci` 등 작업 성격에 맞는 값을 사용한다.
- 일반 공통 작업은 `develop`에서 분기하고 완료 후 `develop`에 merge한다.

예시:

- `docs/#5/협업-규칙-정리`
- `chore/#3/PR-템플릿-설정`

### Production

1. 배포할 변경을 `develop`에서 검증한다.
2. 배포 준비가 끝난 변경을 `main`에 merge한다.
3. `main`을 기준으로 운영에 배포한다.

### Hotfix

1. 운영 장애가 발생한 `main`에서 `<be|fe>/hotfix/#<이슈번호>/<이슈-설명>` 브랜치를 만든다.
2. 긴급 수정과 회귀 검증을 완료한다.
3. 수정 내용을 `main`에 merge하여 배포한다.
4. 동일한 수정 내용을 `develop`에도 merge하여 다음 배포에서 회귀하지 않게 한다.

## PR과 이슈

- PR 제목은 `[Type] #이슈번호 설명` 형식으로 작성한다.
- `Type`의 첫 글자는 대문자로 쓴다. 예: `[Feature] #12 로그인 기능 추가`.
- PR은 squash merge하며, 최종 커밋 제목은 `<type>: <한국어 명사형 변경 의도> (#<PR 번호>)` 형식으로 작성한다.
- 최종 커밋의 `type`은 소문자로 쓰고, 제목 끝의 PR 번호는 GitHub가 자동으로 추가한 값을 유지한다.
- 간단한 PR은 최종 커밋 제목만 작성해도 된다. 추가 맥락이나 검증 기록이 필요하면 `docs/harness/lore-commit.md`에 따라 본문과 필요한 trailer만 작성한다.
- PR 본문은 `.github/PULL_REQUEST_TEMPLATE.md`를 사용한다.
- 이슈는 `.github/ISSUE_TEMPLATE/`의 `feature`, `refactor`, `fix`, `docs`, `chore`, `hotfix` 양식 중 작업 성격에 맞는 것을 사용한다.
- 빈 이슈 생성은 허용하지 않는다.

## 프론트엔드 기본값

- pnpm과 scaffold 시점의 Active LTS Node.js를 정확한 버전으로 고정한다.
- Next.js App Router, TypeScript strict, Tailwind CSS, ESLint와 Prettier를 사용한다.
- Server Component를 기본으로 하고 브라우저 기능이 필요한 최소 경계만 Client Component로 만든다.
- ky는 HTTP, TanStack Query는 client-side server state를 담당한다.
- Vitest는 순수 로직, RTL은 사용자 관점 UI, Playwright는 핵심 수직 흐름을 검증한다.
- 별도 전역 상태 라이브러리, Storybook과 전역 coverage hard gate는 초기 도입하지 않는다.

## CI 도입 예정안

현재 저장소에는 CI가 구성되어 있지 않다. 구체적인 workflow와 필수 검사는 팀 합의 후 도입한다.

- 로컬과 CI는 같은 검증 명령을 사용한다.
- 반복 실행에서 안정적인 검사부터 필수 검사로 지정한다.
- frontend 검증 후보는 `quality-gates.md`를 기준으로 검토한다.
- backend 검증과 CI 연결은 백엔드 팀이 결정한다.

## 기본 완료 조건

- 이슈의 완료 조건을 충족한다.
- 변경한 영역에 실제로 존재하는 검증을 실행하고 결과를 PR에 기록한다.
- 관련 문서가 있다면 변경 내용과 함께 갱신한다.
- 알려진 오류와 실행하지 못한 검증을 숨기지 않는다.
