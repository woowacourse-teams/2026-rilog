package kr.rilog.domain.post.repository;

import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import kr.rilog.domain.post.repository.projection.TeamFeedPostRow;
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
                p.thumbnailUrl,
                p.category,
                p.visibility,
                p.publishedAt,
            
                author.id,
                author.nickname,
                author.slug,
                author.profileImageUrl,
            
                colog.id,
                colog.name,
                colog.slug,
                colog.coverImageUrl
            )
            FROM Post p
            JOIN p.user author
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
            SELECT new kr.rilog.domain.post.repository.projection.TeamFeedPostRow(
                post.id,
                post.title,
                post.thumbnailUrl,
                post.category,
                post.status,
                post.visibility,
                post.publishedAt,
                author.id,
                author.nickname,
                author.slug,
                author.profileImageUrl
            )
            FROM Post post
            JOIN post.user author
            WHERE post.colog.id = :cologId
              AND post.status = :status
              AND post.visibility = :visibility
              AND post.deletedAt IS NULL
            ORDER BY post.publishedAt DESC, post.id DESC
            """)
    Slice<TeamFeedPostRow> findTeamPosts(
            @Param("cologId") Long cologId,
            @Param("status") PostStatus status,
            @Param("visibility") PostVisibility visibility,
            Pageable pageable
    );

}
