const assert = require('node:assert/strict');
const test = require('node:test');

const {
  formatKoreanTime,
  formatReleaseNotes,
  normalizeGeneratedNotes,
} = require('./update-release-notes.cjs');

test('KST 날짜와 시각을 일반 텍스트에 사용할 형식으로 변환한다', () => {
  assert.equal(formatKoreanTime('2026-10-29T03:50:35Z'), '2026-10-29 12:50:35 KST');
});

test('버전과 바깥 헤딩을 제거하고 라벨 분류를 섹션으로 올린다', () => {
  assert.equal(
    normalizeGeneratedNotes('## 1.2.0 (2026-10-29)\n\n## What\'s Changed\n### 핵심 변경\n* 기능 추가'),
    '## 핵심 변경\n* 기능 추가'
  );
});

test('GitHub가 라벨로 만든 섹션과 PR 작성자를 그대로 유지한다', () => {
  const input = `## 1.1.0 (2026-10-29)

## What's Changed
### 핵심 변경
* [Feature] #10 기능 추가 by @crew-a in https://example.com/10

### 기타 변경
* [Hotfix] #11 장애 수정 by @crew-b in https://example.com/11
* docs: 릴리즈 문서 수정 by @crew-c in https://example.com/12

## New Contributors
* @crew-a made their first contribution in https://example.com/10

**Full Changelog**: https://example.com/compare/v1.0.0...v1.1.0`;

  assert.equal(
    formatReleaseNotes(input, '2026-10-29T03:50:35Z'),
    `릴리즈 시각: 2026-10-29 12:50:35 KST

## 핵심 변경
* [Feature] #10 기능 추가 by @crew-a in https://example.com/10

## 기타 변경
* [Hotfix] #11 장애 수정 by @crew-b in https://example.com/11
* docs: 릴리즈 문서 수정 by @crew-c in https://example.com/12

## New Contributors
* @crew-a made their first contribution in https://example.com/10

**Full Changelog**: https://example.com/compare/v1.0.0...v1.1.0
`
  );
});
