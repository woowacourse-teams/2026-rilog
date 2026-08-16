package kr.rilog.domain.post.repository;


import org.springframework.data.repository.query.Param;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    long countByStatusAndVisibility(PostStatus status, PostVisibility visibility);

    @Query("""
            SELECT p
            FROM Post p
            JOIN FETCH p.user
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
        LEFT JOIN FETCH p.rilog r
        LEFT JOIN FETCH p.colog c
        WHERE p.id = :postId
          AND p.deletedAt IS NULL
          AND (
                r.slug = :slug
                OR c.slug = :slug
              )
        """)
    Optional<Post> findDetailByIdAndBlogSlug(
            @Param("postId") Long postId,
            @Param("slug") String slug
    );
    
}
