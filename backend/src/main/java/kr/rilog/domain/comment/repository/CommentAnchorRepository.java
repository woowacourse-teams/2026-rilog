package kr.rilog.domain.comment.repository;

import kr.rilog.domain.comment.entity.CommentAnchor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CommentAnchorRepository extends JpaRepository<CommentAnchor, Long> {

    @Modifying(flushAutomatically = true)
    @Query(value = """
            UPDATE comment_anchor
            SET deleted_at = :deletedAt,
                updated_at = :deletedAt
            WHERE id = :commentAnchorId
              AND deleted_at IS NULL
            """, nativeQuery = true)
    int softDeleteIfActive(
            @Param("commentAnchorId") Long commentAnchorId,
            @Param("deletedAt") LocalDateTime deletedAt
    );

    @Query("""
            SELECT anchor
            FROM CommentAnchor anchor
            JOIN FETCH anchor.commentAnchorSelection anchorSelection
            JOIN FETCH anchor.writer writer
            WHERE anchorSelection.post.id = :postId
              AND anchorSelection.deletedAt IS NULL
              AND anchor.deletedAt IS NULL
              AND writer.deletedAt IS NULL
            ORDER BY anchorSelection.createdAt ASC,
                     anchorSelection.id ASC,
                     anchor.createdAt ASC,
                     anchor.id ASC
            """)
    List<CommentAnchor> findAllByPostId(@Param("postId") Long postId);

    @Query("""
            SELECT anchor
            FROM CommentAnchor anchor
            JOIN anchor.commentAnchorSelection anchorSelection
            WHERE anchor.id = :commentAnchorId
              AND anchorSelection.post.id = :postId
              AND anchorSelection.deletedAt IS NULL
              AND anchor.deletedAt IS NULL
            """)
    Optional<CommentAnchor> findByIdAndPostId(
            @Param("commentAnchorId") Long commentAnchorId,
            @Param("postId") Long postId
    );

}
