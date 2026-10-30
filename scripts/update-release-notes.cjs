function formatKoreanTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid release time: ${value}`);
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  .formatToParts(date)
  .filter(({type}) => type !== 'literal')
  .reduce((result, {type, value: part}) => {
    result[type] = part;
    return result;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} KST`;
}

function normalizeGeneratedNotes(body) {
  const lines = body.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /^##\s+\d+\.\d+\.\d+(?:[-+][^\s]+)?(?:\s+\([^)]+\))?\s*$/.test(line));

  if (headingIndex >= 0) {
    lines.splice(headingIndex, 1);
  }

  return lines
  .filter((line) => !/^## What's Changed\s*$/.test(line))
  .map((line) => line.replace(/^### (핵심 변경|기타 변경)\s*$/, '## $1'))
  .join('\n')
  .trim();
}

function formatReleaseNotes(body, publishedAt) {
  const generatedNotes = normalizeGeneratedNotes(body);
  return `릴리즈 시각: ${formatKoreanTime(publishedAt)}\n\n${generatedNotes}\n`;
}

async function requestGitHub(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  const apiUrl = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function getExistingRelease(repository, tagName) {
  const encodedTag = encodeURIComponent(tagName);
  const token = process.env.GITHUB_TOKEN;
  const apiUrl = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const response = await fetch(`${apiUrl}/repos/${repository}/releases/tags/${encodedTag}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function updateReleaseNotes() {
  const repository = process.env.REPOSITORY;
  const tagName = process.env.TAG_NAME;
  const targetCommitish = process.env.TARGET_COMMITISH;

  if (!process.env.GITHUB_TOKEN || !repository || !tagName) {
    throw new Error('GITHUB_TOKEN, REPOSITORY and TAG_NAME are required');
  }

  // 1. GitHub API를 통해 릴리즈 노트 초안 자동 생성
  const generated = await requestGitHub(`/repos/${repository}/releases/generate-notes`, {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tagName,
      ...(targetCommitish ? {target_commitish: targetCommitish} : {}),
    }),
    headers: {'Content-Type': 'application/json'},
  });

  // 2. 릴리즈 노트 서식 적용 (KST 릴리즈 시각 및 헤더 정리)
  const body = formatReleaseNotes(generated.body ?? '', new Date().toISOString());

  // 3. 릴리즈 생성 또는 갱신 (멱등성 보장)
  const existingRelease = await getExistingRelease(repository, tagName);

  if (existingRelease) {
    await requestGitHub(`/repos/${repository}/releases/${existingRelease.id}`, {
      method: 'PATCH',
      body: JSON.stringify({name: tagName, body}),
      headers: {'Content-Type': 'application/json'},
    });
    console.log(`Updated release notes for ${tagName}`);
  } else {
    await requestGitHub(`/repos/${repository}/releases`, {
      method: 'POST',
      body: JSON.stringify({
        tag_name: tagName,
        ...(targetCommitish ? {target_commitish: targetCommitish} : {}),
        name: tagName,
        body,
      }),
      headers: {'Content-Type': 'application/json'},
    });
    console.log(`Created release for ${tagName}`);
  }
}

if (require.main === module) {
  updateReleaseNotes().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  formatKoreanTime,
  formatReleaseNotes,
  normalizeGeneratedNotes,
};
