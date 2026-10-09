package kr.rilog.domain.notification.controller.dto.response;

import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.notification.service.content.InlineCommentNotificationContent;

public record InlineCommentNotificationContentResponse(
        PostResponse post,
        SelectionResponse selection,
        CommentResponse comment,
        ActorResponse actor
) implements NotificationContentResponse {

    public static InlineCommentNotificationContentResponse from(InlineCommentNotificationContent content) {
        return new InlineCommentNotificationContentResponse(
                new PostResponse(
                        content.postId(),
                        content.postTitle(),
                        content.blogId(),
                        content.blogSlug()
                ),
                new SelectionResponse(
                        content.selectionId(),
                        content.blockId(),
                        content.startOffset(),
                        content.endOffset(),
                        content.selectedText(),
                        content.selectionStatus()
                ),
                new CommentResponse(
                        content.commentAnchorId(),
                        content.commentContent()
                ),
                new ActorResponse(
                        content.actorId(),
                        content.actorNickname(),
                        content.actorSlug(),
                        content.actorProfileImageUrl()
                )
        );
    }

    public record PostResponse(
            Long postId,
            String title,
            Long blogId,
            String blogSlug
    ) {
    }

    public record SelectionResponse(
            Long selectionId,
            String blockId,
            int startOffset,
            int endOffset,
            String selectedText,
            AnchorStatus status
    ) {
    }

    public record CommentResponse(
            Long commentAnchorId,
            String content
    ) {
    }

    public record ActorResponse(
            Long userId,
            String nickname,
            String slug,
            String profileImageUrl
    ) {
    }

}
