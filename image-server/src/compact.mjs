import { ApiError } from './download.mjs';

// 목적별 디렉터리의 압축 너비. 원본보다 큰 너비도 파일은 만들고, 내용은 원본 너비로 변환한다.
// Spring은 원본이 TEMPORARY가 되면 압축본도 함께 태깅.
export const COMPACT_WIDTHS = { images: [750, 1200, 1400, 2000], profiles: [50, 360] };

// 압축 변환하는 원본 확장자. Spring S3CompactObjectKeyPolicy와 같은 목록이다(gif, svg, heic는 원본만 쓴다).
const COMPACTABLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);
const OWNED_IMAGE_ID = '\\d+-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

// {root}/{images|profiles}/raw/{userId}-{UUID}/original.{ext} → 같은 id의 compact/{width}.webp 목록.
// rootDirectory는 설정에서 정규식 특수문자가 없는 경로로 검증한다.
export function resolveCompactTargets(rootDirectory, objectKey) {
  const pattern = new RegExp(`^${rootDirectory}/(?<directory>images|profiles)/raw/(?<id>${OWNED_IMAGE_ID})/original\\.(?<extension>[A-Za-z0-9]+)$`);
  const match = typeof objectKey === 'string' ? pattern.exec(objectKey) : null;
  if (!match || !COMPACTABLE_EXTENSIONS.has(match.groups.extension.toLowerCase())) {
    throw new ApiError(400, 'INVALID_OBJECT_KEY', '압축할 수 없는 원본 경로입니다.');
  }
  const { directory, id } = match.groups;
  return COMPACT_WIDTHS[directory].map(width => ({ width, key: `${rootDirectory}/${directory}/compact/${id}/${width}.webp` }));
}
