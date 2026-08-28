import { APP_ROUTES } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

export default function PostDetailNotFound() {
	return (
		<main className="flex min-h-dvh items-center justify-center bg-background px-5 text-center">
			<div>
				<h1 className="text-heading-3 font-extrabold text-text-primary">게시글을 찾을 수 없어요.</h1>
				<p className="mt-3 text-body-2 text-text-secondary">삭제되었거나 존재하지 않는 게시글입니다.</p>
				<ButtonLink href={APP_ROUTES.feeds} className="mt-7">
					피드로 돌아가기
				</ButtonLink>
			</div>
		</main>
	);
}
