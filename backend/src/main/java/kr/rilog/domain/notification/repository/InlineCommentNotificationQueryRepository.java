package kr.rilog.domain.notification.repository;

import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.notification.repository.projection.InlineCommentNotificationRow;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InlineCommentNotificationQueryRepository extends Repository<CommentAnchor, Long> {

    @Query("""
            SELECT new kr.rilog.domain.notification.repository.projection.InlineCommentNotificationRow(
                anchor.id,
                CASE
                    WHEN post.deletedAt IS NOT NULL THEN 'POST_DELETED'
                    WHEN anchorSelection.deletedAt IS NOT NULL THEN 'SELECTION_DELETED'
                    WHEN anchor.deletedAt IS NOT NULL THEN 'COMMENT_DELETED'
                    WHEN writer.deletedAt IS NOT NULL THEN 'ACTOR_DELETED'
                    WHEN rilog.deletedAt IS NOT NULL THEN 'BLOG_DELETED'
                    WHEN colog.id IS NOT NULL AND colog.deletedAt IS NOT NULL THEN 'BLOG_DELETED'
                    WHEN post.status <> kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED THEN 'POST_UNAVAILABLE'
                    WHEN post.visibility = kr.rilog.domain.post.entity.enums.PostVisibility.PRIVATE
                         AND post.user.id <> :userId THEN 'POST_INACCESSIBLE'
                    ELSE 'AVAILABLE'
                END,
                post.id,
                post.title,
                CASE WHEN colog.id IS NOT NULL THEN colog.id ELSE rilog.id END,
                CASE WHEN colog.id IS NOT NULL THEN colog.slug.value ELSE rilog.slug.value END,
                anchorSelection.id,
                anchorSelection.selection.blockId,
                anchorSelection.selection.range.startOffset,
                anchorSelection.selection.range.endOffset,
                anchorSelection.selection.selectedText,
                anchorSelection.status,
                anchor.content,
                writer.id,
                writer.nickname.value,
                writer.slug.value,
                writer.profileImageUrl
            )
            FROM CommentAnchor anchor
            JOIN anchor.commentAnchorSelection anchorSelection
            JOIN anchorSelection.post post
            JOIN post.rilog rilog
            LEFT JOIN post.colog colog
            JOIN anchor.writer writer
            WHERE anchor.id IN :sourceIds
            """)
    List<InlineCommentNotificationRow> findAllBySourceIds(
            @Param("sourceIds") List<Long> sourceIds,
            @Param("userId") Long userId
    );

}
