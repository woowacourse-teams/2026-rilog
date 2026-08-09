# Rilog

Rilog는 기록을 작성하고 함께 나누는 웹 서비스다. 이 저장소는 프론트엔드와 백엔드를 한곳에서 관리하며, 팀 공통 규칙과 작업 템플릿을 함께 관리한다.

## 저장소 구조

```text
.
├─ frontend/    # 프론트엔드 애플리케이션 영역
├─ backend/     # 백엔드 애플리케이션
├─ docs/        # ADR와 팀 하네스 문서
├─ .github/     # PR 및 이슈 템플릿
└─ AGENTS.md    # 저장소 공통 작업 규칙
```

현재 `frontend/`에는 작업 규칙만 있고 애플리케이션 스캐폴드는 아직 없다. `backend/`는 기존 소스와 build 설정을 유지하며, 이후 스택과 검증 방식은 백엔드 팀이 결정한다.

## 팀 규칙

- 저장소 공통 규칙: [`AGENTS.md`](AGENTS.md)
- 프론트엔드 규칙: [`frontend/AGENTS.md`](frontend/AGENTS.md)
- 백엔드 규칙: [`backend/AGENTS.md`](backend/AGENTS.md)
- 팀 하네스 문서: [`docs/harness/README.md`](docs/harness/README.md)
- ADR 템플릿: [`docs/adr/0000-template.md`](docs/adr/0000-template.md)

PR과 이슈를 작성할 때는 `.github/`의 템플릿을 사용한다.
