package kr.rilog.domain.seo.repository;

import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.seo.repository.projection.PostSitemapRow;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.List;

public interface PostSeoRepository extends Repository<Post, Long> {

    @Query("""
            SELECT new kr.rilog.domain.seo.repository.projection.PostSitemapRow(
                CASE
                    WHEN colog IS NOT NULL THEN colog.slug.value
                    ELSE rilog.slug.value
                END,
                post.id,
                COALESCE(post.updatedAt, post.publishedAt)
            )
            FROM Post post
            JOIN post.rilog rilog
            LEFT JOIN post.colog colog
            WHERE post.status = kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED
              AND post.visibility = kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC
              AND post.deletedAt IS NULL
              AND rilog.deletedAt IS NULL
              AND (colog IS NULL OR colog.deletedAt IS NULL)
            ORDER BY post.id ASC
            """)
    List<PostSitemapRow> findSitemapPosts();
}
