package kr.rilog.domain.post.repository;


import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.projection.DraftListRow;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("""
            SELECT new kr.rilog.domain.post.repository.projection.DraftListRow(
                post.id,
                post.title,
                post.publishedAt
            )
            FROM Post post
            WHERE post.user.id = :writerId
              AND post.status = :status
              AND post.deletedAt IS NULL
            ORDER BY post.publishedAt DESC, post.id DESC
            """)
    Slice<DraftListRow> findDraftsByWriterId(
            @Param("writerId") Long writerId,
            @Param("status") PostStatus status,
            Pageable pageable
    );

    long countByStatusAndVisibility(PostStatus status, PostVisibility visibility);

    @Query("""
            SELECT COUNT(post)
            FROM Post post
            WHERE post.colog.id = :cologId
              AND post.status = kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED
              AND post.visibility = kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC
              AND post.deletedAt IS NULL
            """)
    long countPublicPublishedPostsByCologId(@Param("cologId") Long cologId);

    @Query("""
            SELECT p
            FROM Post p
            JOIN FETCH p.user u
            JOIN FETCH p.rilog r
            LEFT JOIN FETCH p.colog c
            WHERE p.id = :postId
              AND p.deletedAt IS NULL
            """)
    Optional<Post> findDetailById(
            @Param("postId") Long postId
    );

    @Query("""
        SELECT p
        FROM Post p
        JOIN FETCH p.user u
        JOIN FETCH p.rilog r
        LEFT JOIN FETCH p.colog c
        WHERE p.id = :postId
          AND p.status = :status
          AND p.deletedAt IS NULL
        """)
    Optional<Post> findDetailByIdAndStatus(
            @Param("postId") Long postId,
            @Param("status") PostStatus status
    );

    @Query("""
        SELECT p
        FROM Post p
        JOIN FETCH p.rilog r
        WHERE p.id = :postId
          AND p.status = kr.rilog.domain.post.entity.enums.PostStatus.DRAFT
          AND p.deletedAt IS NULL
        """)
    Optional<Post> findDraftById(@Param("postId") Long postId);

    long countByCologIdAndStatusAndVisibilityAndDeletedAtIsNull(
            Long cologId,
            PostStatus status,
            PostVisibility visibility
    );

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE Post post
            SET post.deletedAt = :deletedAt,
                post.updatedAt = :deletedAt
            WHERE post.colog.id = :cologId
              AND post.deletedAt IS NULL
            """)
    int softDeleteAllByCologId(
            @Param("cologId") Long cologId,
            @Param("deletedAt") LocalDateTime deletedAt
    );

}
