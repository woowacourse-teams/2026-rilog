/** 서버 CommentAnchor의 UTF-16 1000자 제약. 원문 대신 위반 필드명만 보고한다. */
export const getInvalidCommentInputFields = (content: string): readonly string[] =>
	content.trim().length === 0 || content.length > 1000 ? ['content'] : [];
