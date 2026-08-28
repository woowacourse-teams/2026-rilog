import type { Metadata } from 'next';

import PostWriteDeviceGate from '@/widgets/post-write/ui/PostWriteDeviceGate';

export const metadata: Metadata = {
	title: '새 글 작성 | Rilog',
	description: 'Rilog에 새로운 기록을 작성합니다.',
};

export default function WritePage() {
	return <PostWriteDeviceGate />;
}
