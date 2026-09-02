import type { Metadata } from 'next';

import PostWriteDeviceGate from '@/widgets/post-write/ui/PostWriteDeviceGate';

export const metadata: Metadata = {
	robots: { follow: false, index: false },
	title: '새 글 작성',
	description: 'Rilog에 새로운 기록을 작성합니다.',
};

export default function WritePage() {
	return <PostWriteDeviceGate />;
}
