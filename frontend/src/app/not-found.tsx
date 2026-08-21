import ButtonLink from '@/shared/ui/button/ButtonLink';

export default function NotFound() {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-6 text-center">
			<div className="space-y-4">
				<h1 className="text-6xl font-bold text-text-primary">404</h1>
				<p className="text-xl font-medium text-text-primary">요청하신 페이지를 찾을 수 없습니다</p>
				<p className="text-sm whitespace-pre-line text-text-secondary">
					{`페이지의 주소가 잘못 입력되었거나,\n변경 혹은 삭제되어 요청하신 페이지를 찾을 수 없습니다.`}
				</p>
			</div>
			<ButtonLink href="/" variant="primary" size="lg">
				홈으로 돌아가기
			</ButtonLink>
		</div>
	);
}
