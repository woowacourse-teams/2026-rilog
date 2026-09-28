package kr.rilog.domain.comment.service.dto.command;

public record CommentAnchorCreateCommand(
        String blockId,
        int startOffset,
        int endOffset,
        String selectedText,
        String content
) {
}
