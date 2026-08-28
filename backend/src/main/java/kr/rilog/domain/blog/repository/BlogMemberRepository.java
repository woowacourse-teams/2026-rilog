package kr.rilog.domain.blog.repository;

import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.vo.Slug;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BlogMemberRepository extends JpaRepository<BlogMember, Long> {

    Optional<BlogMember> findByBlogIdAndUserIdAndStatus(Long blogId, Long userId, BlogMemberStatus status);

    boolean existsByBlogIdAndUserIdAndStatus(Long blogId, Long userId, BlogMemberStatus status);

    @Query("""
            SELECT COUNT(blogMember)
            FROM BlogMember blogMember
            JOIN blogMember.user user
            WHERE blogMember.blog.id = :blogId
              AND blogMember.status = kr.rilog.domain.blog.entity.enums.BlogMemberStatus.ACTIVE
              AND blogMember.deletedAt IS NULL
              AND user.deletedAt IS NULL
            """)
    long countActiveMembersByBlogId(@Param("blogId") Long blogId);

    @Query("""
            SELECT blogMember
            FROM BlogMember blogMember
            JOIN FETCH blogMember.user user
            WHERE blogMember.blog.id = :blogId
              AND blogMember.status = :status
              AND blogMember.deletedAt IS NULL
              AND user.deletedAt IS NULL
            ORDER BY blogMember.joinedAt ASC, blogMember.id ASC
            """)
    List<BlogMember> findAllWithUserByBlogIdAndStatus(@Param("blogId") Long blogId, @Param("status") BlogMemberStatus status);


    @Query("""
            select bm
            from BlogMember bm
            join fetch bm.blog b
            where b.slug = :slug
              and bm.user.id = :userId
              and bm.deletedAt is null
              and b.deletedAt is null
            """)
    Optional<BlogMember> findWithBlogBySlugAndUserId(
            @Param("slug") Slug slug,
            @Param("userId") Long memberId
    );

    Optional<BlogMember> findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
            Long blogId,
            Long userId,
            BlogMemberStatus status
    );

    Optional<BlogMember> findByIdAndBlogIdAndStatusAndDeletedAtIsNull(
            Long memberId,
            Long blogId,
            BlogMemberStatus status
    );

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE BlogMember blogMember
            SET blogMember.status = kr.rilog.domain.blog.entity.enums.BlogMemberStatus.LEFT,
                blogMember.deletedAt = :deletedAt,
                blogMember.updatedAt = :deletedAt
            WHERE blogMember.blog.id = :blogId
              AND blogMember.status = kr.rilog.domain.blog.entity.enums.BlogMemberStatus.ACTIVE
              AND blogMember.deletedAt IS NULL
            """)
    int softDeleteAllByBlogId(
            @Param("blogId") Long blogId,
            @Param("deletedAt") LocalDateTime deletedAt
    );

    @Query("""
            SELECT COUNT(bm.id)
            FROM BlogMember bm
            JOIN bm.user u
            WHERE bm.blog.id = :blogId
              AND bm.status = :status
              AND bm.deletedAt IS NULL
              AND u.deletedAt IS NULL
            """)
    long countActiveMembers(@Param("blogId") Long blogId, @Param("status") BlogMemberStatus status);

}
