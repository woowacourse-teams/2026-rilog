# Rilog Frontend

Rilog의 사용자 UI를 제공하는 Next.js App Router 애플리케이션이다.

## 기술 스택

- Node.js 24.19.0
- pnpm 11.21.0
- Next.js 16.3.0
- React 19.2.8
- TypeScript 5.9.3
- Tailwind CSS 4.3.3
- TanStack Query 5.101.4
- ky 2.0.2

테스트에는 Vitest, React Testing Library와 Playwright를 사용한다. ESLint는 Next.js 공식 설정과 타입 정보를
사용하는 `typescript-eslint` 규칙을 결합하고, Prettier는 코드 포맷을 담당한다.

## 시작하기

```bash
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

개발 서버는 `http://localhost:3000`에서 실행된다.

Playwright 브라우저가 설치되지 않은 환경에서는 최초 한 번 다음 명령을 실행한다.

```bash
pnpm exec playwright install chromium
```

## 명령어

| 명령어                | 설명                                      |
| --------------------- | ----------------------------------------- |
| `pnpm dev`            | 개발 서버 실행                            |
| `pnpm build`          | 프로덕션 빌드                             |
| `pnpm start`          | 빌드된 애플리케이션 실행                  |
| `pnpm format`         | Prettier 자동 포맷                        |
| `pnpm format:check`   | 포맷 검사                                 |
| `pnpm lint`           | ESLint 검사                               |
| `pnpm typecheck`      | Next.js route type 생성과 TypeScript 검사 |
| `pnpm test:unit`      | 순수 로직 단위 테스트                     |
| `pnpm test:component` | jsdom 기반 컴포넌트 테스트                |
| `pnpm test:e2e`       | Chromium 기반 E2E 테스트                  |
| `pnpm check`          | PR 전 기본 품질 검사 전체 실행            |

`pnpm check`는 포맷, lint, typecheck, unit/component test와 프로덕션 빌드를 순서대로 실행한다. E2E는 브라우저가
필요하므로 핵심 사용자 흐름을 변경했을 때 별도로 실행한다.

## 코드 품질 설정

### ESLint

- Next.js Core Web Vitals와 TypeScript 권장 규칙을 사용한다.
- `recommendedTypeChecked`로 Promise 오용과 안전하지 않은 타입 연산을 검사한다.
- 일반 변수와 함수는 camelCase, 상수는 UPPER_CASE, React 컴포넌트 함수와 타입은 PascalCase를 사용한다.
- Generic 타입 매개변수는 `T`로 시작한다.
- boolean 변수의 `is`, `has`, `can`, `should`, `did`, `will` 접두사는 권장하지만 강제하지 않는다.
- 사용하지 않는 매개변수만 `_` 접두사로 예외 처리할 수 있다. 사용하지 않는 일반 변수는 `_`로 숨길 수 없다.
- 변수 shadowing과 `foo`, `bar`, `baz`, `temp` 식별자를 금지한다.
- 타입 전용 import는 `import type`을 사용한다.
- import는 Node.js 내장 모듈, 외부 패키지, 타입, 내부 alias, 상대 경로 순으로 그룹화하고 각 그룹에서 알파벳순으로
  정렬한다.

### 파일명과 export

- 일반 JavaScript와 TypeScript 파일은 kebab-case를 사용한다.
- React 컴포넌트와 컴포넌트 테스트의 `.tsx` 파일은 PascalCase를 사용한다.
- `page.tsx`, `layout.tsx` 등 Next.js 예약 파일은 프레임워크 이름을 유지한다.
- 일반 컴포넌트는 이름이 있는 `function` 선언으로 작성하고 `default export`한다.
- `src`의 비컴포넌트 `.ts` 모듈은 `named export`를 사용한다.
- Custom Hook은 `use` 다음에 PascalCase 이름을 사용한다.

### Prettier

탭 들여쓰기, 세미콜론, single quote, trailing comma와 120자 줄 길이를 사용한다. Tailwind CSS 클래스 정렬도 Prettier
플러그인으로 처리한다.

### SVG 아이콘

- `public`의 SVG는 로고, 커버와 placeholder처럼 URL이 필요한 이미지로 사용한다.
- React 컴포넌트로 제어할 UI 아이콘은 사용하는 모듈의 `assets`에 두고 SVG 파일에서 직접 import한다.
- 아이콘은 24x24 `viewBox`와 `currentColor`를 사용하고 실제 크기는 호출부의 `className`으로 지정한다.
- 버튼이나 링크를 설명하는 장식 아이콘은 `aria-hidden="true"`로 숨기고 control에 accessible name을 제공한다.
- 아이콘 배럴 export와 이름 기반 icon registry는 만들지 않는다.

세부 작업 규칙과 예외는 [AGENTS.md](./AGENTS.md)를 따른다.

## 테스트 기준

- `*.unit.test.{ts,tsx}`: policy, mapper, serializer와 순수 함수
- `*.component.test.tsx`: 사용자 입력, 상태 전이, 오류와 접근성
- `*.spec.ts`: 로그인, 글 작성과 같은 핵심 사용자 흐름

## 프로젝트 구조

- `config`: Vitest와 Playwright 테스트 실행 설정
- `src/app`: route, layout, metadata와 페이지 조립
- `src/widgets`: 여러 feature와 domain을 조합한 큰 UI
- `src/features`: 사용자 행동과 유스케이스
- `src/domains`: 핵심 도메인 model, API와 UI
- `src/shared`: 특정 도메인에 종속되지 않는 기반 코드
- `src/test`: 공통 테스트 설정, fixture와 E2E

필요한 책임이 생길 때 디렉터리를 추가하며, 세부 규칙은 `AGENTS.md`를 따른다.
