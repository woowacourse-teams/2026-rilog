# 데스크톱 댓글창 성능 실험과 초점 복원 보정

관련 이슈: [#872](https://github.com/woowacourse-teams/2026-rilog/issues/872).

## 문제 인식과 실제 결과

댓글창 개폐 시 긴 작업을 조사했으나, **유의미한 렌더링 성능 개선은 확인하지 못했다.** 남긴 제품 변경은 초점 복원 보정이다. 별도 주제인 댓글 입력의 자동 높이 조절은 이번 변경에 포함하지 않는다.

사전 React DevTools 진단에서는 CPU4배 조건 주요 렌더 중앙값5.15ms, 본문0.25ms였다. Performance 스택에서 scrollTop 초기화와 focus 호출 지점의 동기 스타일 계산이 관찰됐지만, 함수 자체가 비용 전부를 생성한다고 단정하지 않았다.

스크롤 재초기화 제거, 중복 focus 생략, 둘의 조합, 패널/본문 CSS containment를 각각 탐색했다. 스크롤·CSS 후보는 효과가 뚜렷하지 않아 제외했다. 초점 후보도 성능 효과는 확인되지 않았으나 responsive 열기 버튼 교체 후 초점 유실을 고치는 최소 보정만 남겼다.

## 제품 변경

초점 복원 대상을 고르는 함수를 재사용하고, 이미 활성화된 요소에는 focus를 다시 호출하지 않는다. 직접 닫기와 history 닫힘을 처리한다. 복원한 opener가 DOM에서 사라져 body로 초점이 유실된 경우 새 fallback으로 복구하며, 사용자가 다른 요소로 옮긴 초점은 되찾지 않는다. 추가 timer나 rAF로 복원 시점을 늦추지 않는다.

목록 초기화, 모바일 native dialog, 애니메이션 시간, API 계약은 바꾸지 않았다. 개폐 중 native scroll anchoring에 따른 중간 scrollY 변화와 초점으로 인한 의도치 않은 스크롤 이동을 구분한다. 전체 개폐 전후 scrollY와 본문 viewport 좌표, 다음 Tab 동작을 회귀로 확인한다.

## 2026-11-03 측정 방법과 수치

고정 공개 글188블록·댓글26개, 비로그인·분석SDK 비활성, 일반 production 빌드, Chromium151.0.7922.34 조건이다. 각 버전 워밍업2회 후 ABBA10블록으로20회씩 비교했다. 열기700ms·닫기700ms·추가관찰700ms를 수집했다. 다른 build/test 종료 뒤 정식 측정을 진행했다.

renderer main thread의 Layout/UpdateLayoutTree 시간구간 합집합으로 중첩 중복을 제외했다. 긴 작업은 PerformanceObserver로 별도 수집했다. bootstrap10,000회(seed872)는 ABBA 블록 단위로 재표본화했다. 누적 style/Layout 시간은 단일 클릭 지연이나 INP가 아니다.

| 화면 / CPU   | 기준 중앙값 | 후보 중앙값 | 감소량95% bootstrap 구간 |
| ------------ | ----------: | ----------: | ------------------------ |
| 1440px / 4배 |    234.27ms |    233.98ms | [-1.45, 6.25]ms          |
| 1440px / 1배 |     72.20ms |     73.12ms | [-5.25, 3.26]ms          |
| 1280px / 4배 |    138.64ms |    137.03ms | [-1.18, 5.91]ms          |
| 1280px / 1배 |     43.78ms |     47.43ms | [-5.57, 3.12]ms          |

모든 구간이0을 포함했다. 주 조건 감소량0.29ms(0.12%)는 목표20%·10ms에 미달했다. 1440px 초점 복원은 기준0/20회, 후보20/20회였다. 이는 기능 보정이며 성능 이득으로 표현하지 않는다. 모든160실행에서 종료 animation0, 추가 관찰 style/Layout0이었다. 관찰창 이후 모든 지연작업 부재를 보장하는 것은 아니다.

별도 profiling 빌드의 최종 A/B에서 CPU4배 관련 commit 중앙값은8.1→6.9ms였으나 개폐 전체 Workspace 렌더 합계 중앙값은15.7→20.7ms였다. 단일 commit 감소만 성과로 쓰지 않는다. 도구·빌드·실행 순서가 다른 진단이며 일반 production ABBA와 직접 비교하지 않는다.

[정식 집계](./desktop-comments-panel-results.json), [Profiler 집계](./desktop-comments-panel-profiler.json), [evidence manifest](./desktop-comments-panel-evidence.json), [재현 도구](../../frontend/test-harness/performance/README.md)를 함께 보관한다. 원시 archive에는 공개 본문·댓글 fixture가 있어 자동 공개하지 않는다. 인증값·쿠키를 캡처하지 않았다.

## 복구 기록과 검증 범위

2026-11-04에 /tmp 작업 폴더 소실을 확인하고 보존 archive에서 제품 patch·측정 도구·원시 근거·블로그 초안을 복구했다. archive에 없던 보고서는 집계값에서 재작성했고, 브라우저 테스트도 재작성했다. 원본 테스트 파일의 byte 단위 복구라고 주장하지 않는다.

복구 위치는 지속 경로 ~/.codex/worktrees/rilog-872-recovered다. 기준 develop은 e16430664이며 이전 측정 기준 이후 변경은 backend 테스트뿐이다. 프론트엔드 변경 충돌은 없었다. 위 성능 수치는11월3일 기록이며 이번 복구에서 재측정하지 않았다. 실제 OS 한글IME·실물 모바일 성능·운영 배포는 검증 범위 밖이다.

검증 실행 결과는 복구 후 최종 결과를 아래에 기록한다. 성능 목표를 달성하지 못했으므로 이슈를 자동 종료하지 않는 Draft PR로 전달한다.

복구 검토에서 초기 selection 링크 진입 시 opener가 null인 경로의 누락도 재현했다. 실제 닫힘 전환은 이미 별도로 판별하므로 opener 존재 조건을 제거하고 현재 열기 버튼 fallback을 사용하도록 보완했다. 따라서 현재 복구 코드와11월3일 측정 patch는 완전히 같은 파일이 아니며, 과거 수치를 이번 코드의 새 성능 측정으로 표현하지 않는다.

### 복구 후 최종 로컬 검증

- Node24.19.0 / pnpm11.21.0, `pnpm check` 통과: unit1,120건, component1,206건, production build.
- 재작성한 실제 컴포넌트 연결 브라우저 회귀18건 통과(1280/1440/1920, 직접링크3경로 포함).
- 관련 production smoke49건 통과, 기존 Chromium CDP 전용 터치 시나리오2건 skip(WebKit/Firefox).
- 통계 분석기 Node 테스트5건 통과. 새 source의 성능 A/B·운영 배포·실물 기기는 재검증하지 않았다.
- 처음 테스트 재작성 중 fixture 변환 순서와 HTML 메타데이터 누락을 바로잡았다. 변경 전 직접링크 focus3건 실패를 재현하고 제품 guard 보완 후 통과했다.
