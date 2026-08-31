package kr.rilog.domain.post.repository;

import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PostFeedQueryRepository extends JpaRepository<Post, Long> {

    // THINK 정렬 기준 확장성. P0
    @Query("""
            SELECT new kr.rilog.domain.post.repository.projection.PostFullFeedRow(
                p.id,
                p.title,
                p.thumbnailImageUrl,
                p.category,
                p.visibility,
                p.publishedAt,

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
            )
            FROM Post p
            JOIN p.user author
            JOIN p.rilog rilog
            LEFT JOIN p.colog colog
            LEFT JOIN p.chapter chapter
            WHERE p.status = :status
              AND p.visibility = :visibility
              AND p.deletedAt IS NULL
            ORDER BY p.publishedAt DESC, p.id DESC
            """)
    Slice<PostFullFeedRow> findFullFeed(
            @Param("status") PostStatus status,
            @Param("visibility") PostVisibility visibility,
            Pageable pageable
    );

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
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.profileImageUrl ELSE rilog.profile.profileImageUrl END
            )
            FROM Post post
            JOIN post.user author
            JOIN post.rilog rilog
            LEFT JOIN post.colog colog
            LEFT JOIN post.chapter chapter
            WHERE post.rilog.id = :rilogId
              AND post.status = :status
              AND (post.visibility = :publicVisibility OR post.user.id = :requesterId)
              AND (:category IS NULL OR post.category = :category)
              AND (:chapterId IS NULL OR (chapter.id = :chapterId AND chapter.blog.id = :rilogId))
              AND (:targetCologId IS NULL OR colog.id = :targetCologId)
              AND post.deletedAt IS NULL
            ORDER BY post.publishedAt DESC, post.id DESC
            """)
    Slice<PostFullFeedRow> findRilogFeedPosts(
            @Param("rilogId") Long rilogId,
            @Param("requesterId") Long requesterId,
            @Param("status") PostStatus status,
            @Param("publicVisibility") PostVisibility publicVisibility,
            @Param("category") Category category,
            @Param("chapterId") Long chapterId,
            @Param("targetCologId") Long targetCologId,
            Pageable pageable
    );

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

                colog.blogType,
                colog.id,
                colog.slug.value,
                colog.profile.name,
                colog.profile.profileImageUrl
            )
            FROM Post post
            JOIN post.user author
            JOIN post.colog colog
            LEFT JOIN post.chapter chapter
            WHERE post.colog.id = :cologId
              AND post.status = :status
              AND (post.visibility = :publicVisibility OR post.user.id = :requesterId)
              AND (:category IS NULL OR post.category = :category)
              AND (:chapterId IS NULL OR (chapter.id = :chapterId AND chapter.blog.id = :cologId))
              AND post.deletedAt IS NULL
            ORDER BY post.publishedAt DESC, post.id DESC
            """)
    Slice<PostFullFeedRow> findCologFeedPosts(
            @Param("cologId") Long cologId,
            @Param("requesterId") Long requesterId,
            @Param("status") PostStatus status,
            @Param("publicVisibility") PostVisibility publicVisibility,
            @Param("category") Category category,
            @Param("chapterId") Long chapterId,
            Pageable pageable
    );

}
