package kr.rilog.domain.notification.service.content;

import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.notification.repository.projection.InlineCommentNotificationRow;

public record InlineCommentNotificationContent(
        NotificationSourceStatus status,
        Long postId,
        String postTitle,
        Long blogId,
        String blogSlug,
        Long selectionId,
        String blockId,
        int startOffset,
        int endOffset,
        String selectedText,
        AnchorStatus selectionStatus,
        Long commentAnchorId,
        String commentContent,
        Long actorId,
        String actorNickname,
        String actorSlug,
        String actorProfileImageUrl
) implements NotificationContent {

    public static InlineCommentNotificationContent from(InlineCommentNotificationRow row) {
        return new InlineCommentNotificationContent(
                NotificationSourceStatus.valueOf(row.availabilityCode()),
                row.postId(),
                row.postTitle(),
                row.blogId(),
                row.blogSlug(),
                row.selectionId(),
                row.blockId(),
                row.startOffset(),
                row.endOffset(),
                row.selectedText(),
                row.selectionStatus(),
                row.sourceId(),
                row.commentContent(),
                row.actorId(),
                row.actorNickname(),
                row.actorSlug(),
                row.actorProfileImageUrl()
        );
    }

}
