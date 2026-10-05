import type { Metadata } from 'next';

import { SITE_NAME } from '@/shared/seo/create-social-metadata';
import PostWriteDeviceGate from '@/widgets/post-write/ui/PostWriteDeviceGate';

export const metadata: Metadata = {
	robots: { follow: false, index: false },
	title: '새 글 작성',
	description: `${SITE_NAME}에서 새로운 기록을 작성합니다.`,
};

export default function WritePage() {
	return <PostWriteDeviceGate />;
}
