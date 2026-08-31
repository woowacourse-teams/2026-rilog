package kr.rilog.domain.comment.repository;

import kr.rilog.domain.comment.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    Optional<Comment> findByIdAndDeletedAtIsNull(Long commentId);

    @Query("""
            SELECT comment
            FROM Comment comment
            JOIN FETCH comment.user user
            LEFT JOIN FETCH comment.parent parent
            WHERE comment.post.id = :postId
              AND comment.deletedAt IS NULL
            ORDER BY comment.createdAt ASC, comment.id ASC
            """)
    List<Comment> findAllByPostIdOrderByCreatedAtAscIdAsc(@Param("postId") Long postId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE Comment comment
            SET comment.deletedAt = :deletedAt,
                comment.updatedAt = :deletedAt
            WHERE comment.parent.id = :parentId
              AND comment.deletedAt IS NULL
            """)
    int softDeleteAllRepliesByParentId(
            @Param("parentId") Long parentId,
            @Param("deletedAt") LocalDateTime deletedAt
    );
}
