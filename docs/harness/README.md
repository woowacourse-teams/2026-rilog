# Rilog 팀 하네스

이 폴더는 팀이 함께 따르는 운영 기본값을 둔다. 기능별 구현 규칙은 각 파트의 `AGENTS.md`와 해당 문서에서 관리한다.

## 시작 문서

- `team-defaults.md`: Git, 브랜치, PR, 완료 조건
- `quality-gates.md`: 프론트엔드 로컬·CI 검증
- `lore-commit.md`: commit과 squash message 형식
- `../testing/README.md`: 프론트엔드 테스트 기준
- `../../AGENTS.md`: 저장소 공통 작업 규칙
- `../../frontend/AGENTS.md`, `../../backend/AGENTS.md`: 파트별 규칙
- `../../.github/`: PR·이슈 템플릿
- `../adr/`: 공통 계약과 운영 결정

## 갱신 원칙

- 규칙을 바꾸면 관련 하네스 문서를 갱신하고, 파트 간 계약이나 운영 정책을 바꾸는 경우 ADR을 작성한다.
- 개인 선호는 팀 gate를 약화할 수 없다.
- CI를 도입하거나 변경하면 workflow와 `quality-gates.md`를 함께 갱신한다.
- 실제로 반복되는 문제를 해결하지 않는 새 도구나 절차는 추가하지 않는다.

## 적용 범위

- 루트 `AGENTS.md`는 팀 공통 규칙을 정의한다.
- `frontend/AGENTS.md`와 `backend/AGENTS.md`는 파트별 규칙을 추가한다.
- 개인 작업 습관은 팀·파트 규칙과 충돌할 수 없다.
