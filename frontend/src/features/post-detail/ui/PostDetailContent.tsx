interface PostDetailContentProps {
	html: string;
}

export default function PostDetailContent({ html }: PostDetailContentProps) {
	return (
		<article className="post-detail-body bn-root bn-container" aria-label="게시글 본문">
			<div className="bn-editor bn-default-styles" dangerouslySetInnerHTML={{ __html: html }} />
		</article>
	);
}
