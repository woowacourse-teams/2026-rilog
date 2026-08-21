import Button from '@/shared/ui/button/Button';

export default function EditorLoadError() {
	return (
		<div
			className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-danger-border bg-danger-soft p-8 text-center"
			role="alert"
		>
			<p className="text-title-1 font-semibold text-danger-text">에디터를 불러오지 못했습니다.</p>
			<p className="mt-2 text-body-1 text-text-secondary">페이지를 새로고침한 뒤 다시 시도해 주세요.</p>
			<Button className="mt-5" variant="secondary" onClick={() => window.location.reload()}>
				다시 시도
			</Button>
		</div>
	);
}
