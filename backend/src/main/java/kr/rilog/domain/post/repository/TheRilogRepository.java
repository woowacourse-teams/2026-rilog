package kr.rilog.domain.post.repository;

import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.repository.projection.TheRilogSpotlightRow;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TheRilogRepository extends JpaRepository<Post, Long> {

    @Query("""
            SELECT post
            FROM Post post
            JOIN FETCH post.rilog blog
            WHERE blog.slug = :slug
              AND blog.blogType = kr.rilog.domain.blog.entity.enums.BlogType.RILOG
              AND blog.deletedAt IS NULL
              AND post.colog IS NULL
              AND post.postType = kr.rilog.domain.post.entity.enums.PostType.DAILY_HEADLINES
              AND post.status = kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED
              AND post.visibility = kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC
              AND post.deletedAt IS NULL
            ORDER BY post.publishedAt DESC, post.id DESC
            """)
    List<Post> findLatestPublicNews(
            @Param("slug") Slug slug,
            Pageable pageable
    );

    @Query("""
            SELECT new kr.rilog.domain.post.repository.projection.TheRilogSpotlightRow(
                post.id,
                post.postType,
                post.title,
                post.description,
                post.thumbnailImageUrl,
                post.publishedAt,
                post.source
            )
            FROM Post post
            JOIN post.rilog blog
            WHERE blog.slug = :slug
              AND blog.blogType = kr.rilog.domain.blog.entity.enums.BlogType.RILOG
              AND blog.deletedAt IS NULL
              AND post.colog IS NULL
              AND post.postType = :postType
              AND post.status = kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED
              AND post.visibility = kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC
              AND post.deletedAt IS NULL
            ORDER BY post.publishedAt DESC, post.id DESC
            """)
    List<TheRilogSpotlightRow> findLatestPublicSpotlights(
            @Param("slug") Slug slug,
            @Param("postType") PostType postType,
            Pageable pageable
    );
}
