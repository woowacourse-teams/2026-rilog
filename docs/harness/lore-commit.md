# Lore Commit Protocol

Commit은 변경 의도를 찾기 쉽게 남기는 기록이다. 대부분의 변경은 짧고 명확한 제목만으로 충분하며, 제목만으로 맥락이 부족할 때 본문과 trailer를 추가한다.

## 기본 형식

```text
<type>: <한국어 명사형 변경 의도>
```

## 기본 규칙

- 첫 줄은 `<type>: <변경 의도>` 형식으로 작성한다.
- `type`은 소문자로 작성하고 아래 커밋 타입 중 하나를 사용한다.
- 첫 줄의 설명은 한국어 명사형으로 작성하고 `~한다`, `~했습니다` 같은 서술형 종결을 사용하지 않는다.
- 첫 줄 끝에는 마침표를 사용하지 않는다.
- 첫 줄의 설명은 diff에 이미 보이는 작업 목록이 아니라 변경 의도를 설명한다.
- 간단한 변경은 제목만 작성해도 된다.

## 선택적 본문과 trailer

제목만으로 변경 이유나 검증 범위를 이해하기 어려울 때 필요한 항목만 추가한다.

```text
<변경 이유와 접근 방법을 설명하는 선택적 본문>

Constraint: <결정을 제한한 외부 조건>
Rejected: <검토한 대안> | <선택하지 않은 이유>
Confidence: <low|medium|high>
Scope-risk: <narrow|moderate|broad>
Directive: <후속 수정자가 알아야 할 주의사항>
Tested: <실행한 검증>
Not-tested: <검증하지 못한 영역>
```

- 본문과 모든 trailer는 선택 사항이다.
- 실제로 전달할 정보가 있는 항목만 사용하고 형식을 채우기 위한 문구는 작성하지 않는다.
- 검증 결과를 남길 가치가 있으면 `Tested:`와 `Not-tested:`를 사용한다.
- 중요한 제약, 기각한 대안이나 후속 주의사항이 있으면 `Constraint:`, `Rejected:`, `Directive:`를 사용한다.
- `Confidence:`와 `Scope-risk:`는 위험이 크거나 판단 근거를 공유할 필요가 있을 때만 사용한다.
- trailer를 여러 개 작성할 때는 빈 줄 없이 마지막에 연속해서 배치한다.

## Squash merge

- PR의 최종 squash 제목도 기본 커밋 형식을 따른다.
- GitHub가 제목 끝에 자동으로 추가하는 `(#<PR 번호>)`는 유지한다.
- GitHub가 PR 제목을 기본값으로 제시하면 최종 제목만 커밋 형식에 맞게 수정한다.

## 제목 예시

```text
feature: 사용자 로그인 흐름 제공
fix: 만료 세션의 무한 재시도 방지
refactor: 게시글 조회 책임 분리
docs: 브랜치 운영 기준 명확화
chore: 팀 이슈 작성 기준 통일
```

Squash merge 최종 제목 예시:

```text
chore: 팀 이슈 작성 기준 통일 (#2)
```

## 커밋 타입

| 타입 | 용도 |
| --- | --- |
| `feature` | 새로운 기능 추가 및 기능 업데이트 |
| `refactor` | 동작 변경 없는 리팩터링 |
| `fix` | 버그 수정 |
| `design` | CSS 등 UI 스타일링 변경 |
| `style` | 코드 포맷팅 등 동작에 영향 없는 스타일 변경 |
| `docs` | 문서 변경 |
| `chore` | 오타 수정 등 기타 작업 |
| `test` | 테스트 추가 및 변경 |
| `build` | 배포 또는 의존성 관련 변경 |
| `ci` | CI 설정, 스크립트 및 GitHub Actions 변경 |

## 본문과 trailer가 필요한 예시

```text
fix: 발행 변경 이후 공개 게시글의 오래된 상태 노출 방지

발행 변경이 게시글 상세와 피드 조회에 함께 영향을 주므로 페이지별 key 대신 공유 domain key를 무효화한다.

Rejected: 모든 query refetch | 불필요한 네트워크 요청 증가
Tested: 발행 mutation 단위 테스트와 공개 피드 smoke test
Not-tested: 느린 네트워크에서의 복구 동작
```
