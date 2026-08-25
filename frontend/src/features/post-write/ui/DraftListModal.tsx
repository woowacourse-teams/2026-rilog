import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import XIcon from '@/shared/assets/icons/x.svg';
import CustomLink from '@/shared/ui/link/CustomLink';
import Modal from '@/shared/ui/modal/Modal';

interface DraftPostItem {
	id: number;
	title: string;
	draftedAt: string;
}

interface DraftListModalProps {
	open: boolean;
	draftPosts: DraftPostItem[];
	onClose: () => void;
	onDelete: (draftPostId: number) => void;
}

export default function DraftListModal({ open, draftPosts, onClose, onDelete }: DraftListModalProps) {
	const DRAFT_BUTTON_CLASS_NAME = 'transition-colors hover:bg-navy-50/50 active:bg-navy-200/50';

	return (
		<Modal
			showCloseButton
			open={open}
			title="임시 저장된 글"
			onClose={onClose}
			description="불러올 글을 선택하면 현재 편집 화면에 이어서 작성할 수 있습니다."
		>
			<ul className="flex max-h-64 flex-col gap-4">
				{draftPosts.map((post) => (
					<li key={post.id} className="flex items-stretch justify-between overflow-clip rounded-lg bg-navy-100">
						<CustomLink
							href={`/write?postId=${post.id}`}
							className={`flex min-w-0 flex-1 flex-col justify-center gap-1 pt-4 pr-3 pb-5 pl-5 text-left ${DRAFT_BUTTON_CLASS_NAME}`}
						>
							<strong className="truncate text-body-3">{post.title}</strong>
							<span className="text-caption-2 text-text-secondary">{formatPublishedDate(post.draftedAt)}</span>
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
		</Modal>
	);
}
