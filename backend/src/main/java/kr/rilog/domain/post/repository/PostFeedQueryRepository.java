package kr.rilog.domain.post.repository;

import kr.rilog.domain.post.entity.Post;
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
            
                author.id,
                author.nickname.value,
                author.slug.value,
                author.profileImageUrl,
            
                CASE WHEN colog.id IS NOT NULL THEN colog.blogType ELSE rilog.blogType END,
                CASE WHEN colog.id IS NOT NULL THEN colog.id ELSE rilog.id END,
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.slug.value ELSE rilog.profile.slug.value END,
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.name ELSE rilog.profile.name END,
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.profileImageUrl ELSE rilog.profile.profileImageUrl END
            )
            FROM Post p
            JOIN p.user author
            JOIN p.rilog rilog
            LEFT JOIN p.colog colog
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

                author.id,
                author.nickname.value,
                author.slug.value,
                author.profileImageUrl,

                CASE WHEN colog.id IS NOT NULL THEN colog.blogType ELSE rilog.blogType END,
                CASE WHEN colog.id IS NOT NULL THEN colog.id ELSE rilog.id END,
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.slug.value ELSE rilog.profile.slug.value END,
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.name ELSE rilog.profile.name END,
                CASE WHEN colog.id IS NOT NULL THEN colog.profile.profileImageUrl ELSE rilog.profile.profileImageUrl END
            )
            FROM Post post
            JOIN post.user author
            JOIN post.rilog rilog
            LEFT JOIN post.colog colog
            WHERE post.rilog.id = :rilogId
              AND post.status = :status
              AND post.visibility = :visibility
              AND post.deletedAt IS NULL
            ORDER BY post.publishedAt DESC, post.id DESC
            """)
    Slice<PostFullFeedRow> findPublicRilogPosts(
            @Param("rilogId") Long rilogId,
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

                author.id,
                author.nickname.value,
                author.slug.value,
                author.profileImageUrl,

                colog.blogType,
                colog.id,
                colog.profile.slug.value,
                colog.profile.name,
                colog.profile.profileImageUrl
            )
            FROM Post post
            JOIN post.user author
            JOIN post.colog colog
            WHERE post.colog.id = :cologId
              AND post.status = :status
              AND post.visibility = :visibility
              AND post.deletedAt IS NULL
            ORDER BY post.publishedAt DESC, post.id DESC
            """)
    Slice<PostFullFeedRow> findPublicCologPosts(
            @Param("cologId") Long cologId,
            @Param("status") PostStatus status,
            @Param("visibility") PostVisibility visibility,
            Pageable pageable
    );

}
