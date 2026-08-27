'use client';

import DraftPostController from './DraftPostController';

interface DraftPostLoaderProps {
	draftId: number;
}

export default function DraftPostLoader({ draftId }: DraftPostLoaderProps) {
	// TODO: draft 상세 API 연결 시 pending/error 처리 후 조회한 initialDocument를 전달한다.
	return <DraftPostController draftId={draftId} />;
}
