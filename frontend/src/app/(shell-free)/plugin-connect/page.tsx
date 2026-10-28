import { Suspense } from 'react';

import PluginConnectionBridge from '@/features/plugin-connection/ui/PluginConnectionBridge';

export default function PluginConnectPage() {
	return (
		<Suspense fallback={<main className="min-h-dvh bg-background p-8">Rilog 계정 연결을 준비하고 있습니다.</main>}>
			<PluginConnectionBridge />
		</Suspense>
	);
}
