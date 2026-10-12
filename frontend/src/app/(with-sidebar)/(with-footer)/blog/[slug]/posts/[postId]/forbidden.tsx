import { APP_ROUTES } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

export default function PostDetailForbidden() {
	return (
		<main className="flex min-h-dvh items-center justify-center bg-background px-5 text-center">
			<div>
				<h1 className="text-heading-3 font-extrabold text-text-primary">비공개 게시글이에요.</h1>
				<p className="mt-3 text-body-3 text-text-secondary">이 게시글을 볼 수 있는 권한이 없습니다.</p>
				<ButtonLink href={APP_ROUTES.feeds} className="mt-7">
					피드로 돌아가기
				</ButtonLink>
			</div>
		</main>
	);
}
