# Rilog 팀 하네스

## 문서 지도

- `team-defaults.md`: 별도 합의가 없을 때 적용할 Git, PR과 frontend 기본값
- `quality-gates.md`: 현재 로컬 검증 원칙과 CI 도입 예정안
- `lore-commit.md`: commit과 squash message에 결정 맥락을 남기는 형식
- `../../.github/`: PR 및 이슈 템플릿
- `../../AGENTS.md`: 저장소 공통 에이전트 규칙
- `../../frontend/AGENTS.md`: 프론트엔드 전용 규칙
- `../../backend/AGENTS.md`: 백엔드 전용 경계 규칙
- `../adr/`: 공통 계약이나 운영 규칙을 변경한 이유

## 변경 원칙

- 규칙을 바꾸는 PR 작성자가 이 문서와 관련 ADR을 함께 갱신한다.
- 개인 선호는 팀 gate를 약화할 수 없다.
- CI를 도입하거나 변경하면 실제 workflow와 이 문서를 함께 갱신한다.
- 실제로 반복되는 문제를 해결하지 않는 새 도구나 절차는 추가하지 않는다.

## 계층

- 개인 하네스: 개인의 전역 지침과 작업 습관
- 파트 하네스: `frontend/AGENTS.md`, `backend/AGENTS.md`와 파트 검증 명령
- 팀 하네스: 루트 `AGENTS.md`, PR 및 이슈 템플릿, ADR와 공통 작업 방식
