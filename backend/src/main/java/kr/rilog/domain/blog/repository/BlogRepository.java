package kr.rilog.domain.blog.repository;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Slug;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlogRepository extends JpaRepository<Blog, Long> {

    @Query("""
            SELECT blog
            FROM Blog blog
            WHERE blog.owner.id = :ownerId
              AND blog.blogType = kr.rilog.domain.blog.entity.enums.BlogType.RILOG
            """)
    Optional<Blog> findRilogByOwnerId(@Param("ownerId") Long ownerId);

    @Query("""
            SELECT blog
            FROM Blog blog
            WHERE blog.slug = :slug
              AND blog.blogType = :blogType
              AND blog.deletedAt IS NULL
            """)
    Optional<Blog> findBySlugAndBlogTypeAndDeletedAtIsNull(
            @Param("slug") Slug slug,
            @Param("blogType") BlogType blogType
    );

    Optional<Blog> findByIdAndBlogType(Long id, BlogType blogType);

    @Query("""
            SELECT blog
            FROM Blog blog
            WHERE blog.slug = :slug
              AND blog.deletedAt IS NULL
            """)
    Optional<Blog> findBySlugAndDeletedAtIsNull(@Param("slug") Slug slug);

    @Query("""
            SELECT CASE WHEN COUNT(blog) > 0 THEN true ELSE false END
            FROM Blog blog
            WHERE blog.slug = :slug
            """)
    boolean existsBySlug(@Param("slug") Slug slug);

    @Query("""
            SELECT CASE WHEN COUNT(blog) > 0 THEN true ELSE false END
            FROM Blog blog
            WHERE blog.profile.name = :profileName
              AND blog.deletedAt IS NULL
            """)
    boolean existsByProfileName(@Param("profileName") String profileName);

    @Query("""
            SELECT CASE WHEN COUNT(blog) > 0 THEN true ELSE false END
            FROM Blog blog
            WHERE blog.profile.name = :profileName
              AND blog.id <> :blogId
              AND blog.deletedAt IS NULL
            """)
    boolean existsByProfileNameExceptId(
            @Param("profileName") String profileName,
            @Param("blogId") Long blogId
    );

    @Query("""
            SELECT blogMember.blog
            FROM BlogMember blogMember
            WHERE blogMember.user.id = :userId
              AND blogMember.status = kr.rilog.domain.blog.entity.enums.BlogMemberStatus.ACTIVE
              AND blogMember.blog.blogType = kr.rilog.domain.blog.entity.enums.BlogType.COLOG
              AND blogMember.deletedAt IS NULL
              AND blogMember.blog.deletedAt IS NULL
            ORDER BY blogMember.joinedAt DESC, blogMember.blog.id DESC
            """)
    List<Blog> findAllActiveCologsByUserId(@Param("userId") Long userId);

}
