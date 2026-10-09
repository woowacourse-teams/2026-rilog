package kr.rilog.domain.notification.controller.dto.response;

import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.notification.service.content.InlineCommentNotificationContent;

public record InlineCommentNotificationContentResponse(
        NotificationPostResponse post,
        NotificationSelectionResponse selection,
        NotificationCommentAnchorResponse commentAnchor,
        NotificationActorResponse actor
) implements NotificationContentResponse {

    public static InlineCommentNotificationContentResponse from(InlineCommentNotificationContent content) {
        return new InlineCommentNotificationContentResponse(
                new NotificationPostResponse(
                        content.postId(),
                        content.postTitle(),
                        content.blogId(),
                        content.blogSlug()
                ),
                new NotificationSelectionResponse(
                        content.selectionId(),
                        content.blockId(),
                        content.startOffset(),
                        content.endOffset(),
                        content.selectedText(),
                        content.selectionStatus()
                ),
                new NotificationCommentAnchorResponse(
                        content.commentAnchorId(),
                        content.commentContent()
                ),
                new NotificationActorResponse(
                        content.actorId(),
                        content.actorNickname(),
                        content.actorSlug(),
                        content.actorProfileImageUrl()
                )
        );
    }

    public record NotificationPostResponse(
            Long postId,
            String title,
            Long blogId,
            String blogSlug
    ) {
    }

    public record NotificationSelectionResponse(
            Long selectionId,
            String blockId,
            int startOffset,
            int endOffset,
            String selectedText,
            AnchorStatus status
    ) {
    }

    public record NotificationCommentAnchorResponse(
            Long commentAnchorId,
            String content
    ) {
    }

    public record NotificationActorResponse(
            Long userId,
            String nickname,
            String slug,
            String profileImageUrl
    ) {
    }

}
