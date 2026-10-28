export function loadConfig(env = process.env) {
  for (const name of ['AWS_REGION', 'S3_BUCKET', 'IMAGE_BASE_URL']) {
    if (!env[name]?.trim()) throw new Error(`${name} is required`);
  }
  const base = new URL(env.IMAGE_BASE_URL);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
    throw new Error('IMAGE_BASE_URL must be an HTTPS image delivery URL');
  }
  const prefix = (env.S3_KEY_PREFIX ?? 'images/imported').replace(/^\/+|\/+$/g, '');
  if (!/^[a-zA-Z0-9/_-]+$/.test(prefix)) throw new Error('Invalid S3_KEY_PREFIX');
  return {
    region: env.AWS_REGION,
    bucket: env.S3_BUCKET,
    imageBaseUrl: base.href.replace(/\/+$/, ''),
    prefix,
  };
}
