import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import type { DraftPostItem } from '@/features/post-write/model/post-draft';
import XIcon from '@/shared/assets/icons/x.svg';
import { buildDraftWritePath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import CustomLink from '@/shared/ui/link/CustomLink';
import Modal from '@/shared/ui/modal/Modal';

interface DraftListModalProps {
	open: boolean;
	draftPosts: DraftPostItem[];
	isPending?: boolean;
	isError?: boolean;
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	isFetchNextPageError?: boolean;
	onClose: () => void;
	onDelete: (draftPostId: number) => void;
	onRetry?: () => void;
	onLoadMore?: () => void;
}

export default function DraftListModal({
	open,
	draftPosts,
	isPending = false,
	isError = false,
	hasNextPage = false,
	isFetchingNextPage = false,
	isFetchNextPageError = false,
	onClose,
	onDelete,
	onRetry,
	onLoadMore,
}: DraftListModalProps) {
	const DRAFT_BUTTON_CLASS_NAME = 'transition-colors hover:bg-navy-50/50 active:bg-navy-200/50';
	const hasInitialError = isError && draftPosts.length === 0;

	return (
		<Modal
			showCloseButton
			open={open}
			title="임시 저장된 글"
			onClose={onClose}
			description="불러올 글을 선택하면 현재 편집 화면에 이어서 작성할 수 있습니다."
		>
			{isPending && <p role="status">임시 저장된 글을 불러오는 중...</p>}

			{hasInitialError && (
				<div className="flex flex-col items-center gap-3 text-center" role="alert">
					<p>임시 저장된 글을 불러오지 못했어요.</p>
					<Button variant="secondary" onClick={onRetry}>
						다시 시도
					</Button>
				</div>
			)}

			{!isPending && !hasInitialError && draftPosts.length === 0 && (
				<p className="text-center text-body-2 text-text-secondary" role="status">
					임시 저장된 글이 없어요.
				</p>
			)}

			{draftPosts.length > 0 && (
				<>
					<ul className="flex flex-col gap-4">
						{draftPosts.map((post) => (
							<li key={post.id} className="flex items-stretch justify-between overflow-clip rounded-lg bg-navy-100">
								<CustomLink
									replace
									href={buildDraftWritePath(post.id)}
									className={`flex min-w-0 flex-1 flex-col justify-center gap-1 pt-4 pr-3 pb-5 pl-5 text-left ${DRAFT_BUTTON_CLASS_NAME}`}
								>
									<strong className="truncate text-body-3">{post.title}</strong>
									<span className="text-caption-2 text-text-secondary">{formatPublishedDate(post.savedAt)}</span>
								</CustomLink>
								<button
									type="button"
									aria-label={`${post.title} 임시 저장 글 삭제`}
									onClick={() => onDelete(post.id)}
									className={`shrink-0 px-7 ${DRAFT_BUTTON_CLASS_NAME}`}
								>
									<XIcon className="size-5 text-text-secondary" />
								</button>
							</li>
						))}
					</ul>

					{(hasNextPage || isFetchNextPageError) && (
						<div className="mt-4 flex flex-col items-center gap-2" aria-live="polite">
							{isFetchNextPageError && <p>다음 임시저장 목록을 불러오지 못했어요.</p>}
							<Button variant="secondary" isPending={isFetchingNextPage} onClick={onLoadMore}>
								{isFetchNextPageError ? '다시 시도' : '더 보기'}
							</Button>
						</div>
					)}
				</>
			)}
		</Modal>
	);
}
