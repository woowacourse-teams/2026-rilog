const MIN_SECRET_LENGTH = 32;

export function loadConfig(env = process.env) {
  for (const name of ['AWS_REGION', 'S3_BUCKET', 'S3_ROOT_DIRECTORY', 'IMAGE_BASE_URL', 'RILOG_IMAGE_SERVER_SECRET']) {
    if (!env[name]?.trim()) throw new Error(`${name} is required`);
  }
  const base = new URL(env.IMAGE_BASE_URL);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
    throw new Error('IMAGE_BASE_URL must be an HTTPS image delivery URL');
  }
  // Spring의 AWS_S3_DIRECTORY와 같은 값이다. 목적별 디렉터리(images, profiles)는 그 아래에 붙인다.
  const rootDirectory = env.S3_ROOT_DIRECTORY.replace(/^\/+|\/+$/g, '');
  if (!/^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/.test(rootDirectory)) throw new Error('Invalid S3_ROOT_DIRECTORY');
  if (env.RILOG_IMAGE_SERVER_SECRET.length < MIN_SECRET_LENGTH) {
    throw new Error(`RILOG_IMAGE_SERVER_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  return {
    region: env.AWS_REGION,
    bucket: env.S3_BUCKET,
    imageBaseUrl: base.href.replace(/\/+$/, ''),
    rootDirectory,
    secret: env.RILOG_IMAGE_SERVER_SECRET,
  };
}
