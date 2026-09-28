// Next dot-folder fallback; 1차는 next.config.ts rewrites()가 처리
import { GET as LlmsGet } from '@/app/llms.txt/route';

export const revalidate = 3600;

export const GET = LlmsGet;
