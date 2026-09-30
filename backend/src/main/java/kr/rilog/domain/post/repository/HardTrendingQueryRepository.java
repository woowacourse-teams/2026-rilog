package kr.rilog.domain.post.repository;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.entity.HardTrending;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface HardTrendingQueryRepository extends Repository<HardTrending, Long> {

    @Query("""
            SELECT new kr.rilog.domain.post.repository.projection.PostFullFeedRow(
                post.id,
                post.title,
                post.thumbnailImageUrl,
                post.category,
                post.visibility,
                post.publishedAt,

                chapter.id,
                chapter.name.value,
                chapter.order,

                author.id,
                author.nickname.value,
                author.slug.value,
                author.profileImageUrl,

                CASE WHEN colog.id IS NOT NULL THEN colog.blogType ELSE rilog.blogType END,
                CASE WHEN colog.id IS NOT NULL THEN colog.id ELSE rilog.id END,
                CASE WHEN colog.id IS NOT NULL THEN colog.slug.value ELSE rilog.slug.value END,
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.name ELSE rilog.profile.name END,
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.profileImageUrl ELSE rilog.profile.profileImageUrl END,

                COUNT(anchor.id)
            )
            FROM HardTrending trending
            JOIN trending.post post
            JOIN post.user author
            JOIN post.rilog rilog
            LEFT JOIN post.colog colog
            LEFT JOIN post.chapter chapter
            LEFT JOIN CommentAnchorSelection anchorSelection
                   ON anchorSelection.post = post
            LEFT JOIN CommentAnchor anchor
                   ON anchor.commentAnchorSelection = anchorSelection
                  AND anchor.deletedAt IS NULL
            WHERE post.status = :status
              AND post.visibility = :publicVisibility
              AND post.deletedAt IS NULL
              AND (:category IS NULL OR post.category = :category)
              AND (
                  :blogType IS NULL
                  OR (colog.id IS NOT NULL AND colog.blogType = :blogType)
                  OR (colog.id IS NULL AND rilog.blogType = :blogType)
              )
            GROUP BY
                trending.id,
                post.id,
                post.title,
                post.thumbnailImageUrl,
                post.category,
                post.visibility,
                post.publishedAt,
                chapter.id,
                chapter.name.value,
                chapter.order,
                author.id,
                author.nickname.value,
                author.slug.value,
                author.profileImageUrl,
                CASE WHEN colog.id IS NOT NULL THEN colog.blogType ELSE rilog.blogType END,
                CASE WHEN colog.id IS NOT NULL THEN colog.id ELSE rilog.id END,
                CASE WHEN colog.id IS NOT NULL THEN colog.slug.value ELSE rilog.slug.value END,
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.name ELSE rilog.profile.name END,
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.profileImageUrl ELSE rilog.profile.profileImageUrl END
            ORDER BY trending.id ASC
            """)
    Slice<PostFullFeedRow> findTrendingPosts(
            @Param("status") PostStatus status,
            @Param("publicVisibility") PostVisibility publicVisibility,
            @Param("category") Category category,
            @Param("blogType") BlogType blogType,
            Pageable pageable
    );
}
