package kr.rilog.domain.notification.repository.projection;

import kr.rilog.domain.comment.entity.enums.AnchorStatus;

public record InlineCommentNotificationRow(
        Long sourceId,
        String availabilityCode,
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
        String commentContent,
        Long actorId,
        String actorNickname,
        String actorSlug,
        String actorProfileImageUrl
) {
}