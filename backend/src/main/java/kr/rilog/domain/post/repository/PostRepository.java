package kr.rilog.domain.post.repository;


import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

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

    long countByCologIdAndStatusAndVisibilityAndDeletedAtIsNull(
            Long cologId,
            PostStatus status,
            PostVisibility visibility
    );

}
