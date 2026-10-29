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

async function updateReleaseNotes() {
  const repository = process.env.REPOSITORY;
  const tagName = process.env.TAG_NAME;
  if (!process.env.GITHUB_TOKEN || !repository || !tagName) {
    throw new Error('GITHUB_TOKEN, REPOSITORY and TAG_NAME are required');
  }

  const encodedTag = encodeURIComponent(tagName);
  const release = await requestGitHub(`/repos/${repository}/releases/tags/${encodedTag}`);
  const body = formatReleaseNotes(
    release.body ?? '',
    release.published_at ?? release.created_at ?? new Date().toISOString()
  );

  await requestGitHub(`/repos/${repository}/releases/${release.id}`, {
    method: 'PATCH',
    body: JSON.stringify({body}),
    headers: {'Content-Type': 'application/json'},
  });
  console.log(`Updated release notes for ${tagName}`);
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
