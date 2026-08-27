export const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());
