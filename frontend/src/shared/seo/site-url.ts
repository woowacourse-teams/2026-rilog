const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rilog.kr';

export const siteUrl = new URL(SITE_URL);

export const toAbsoluteSiteUrl = (path: string) => new URL(path, siteUrl).toString();
