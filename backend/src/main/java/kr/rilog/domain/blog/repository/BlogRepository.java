package kr.rilog.domain.blog.repository;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.Slug;
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

    Optional<Blog> findBySlugAndBlogTypeAndDeletedAtIsNull(Slug slug, BlogType blogType);

    Optional<Blog> findByIdAndBlogType(Long id, BlogType blogType);

    Optional<Blog> findBySlugAndDeletedAtIsNull(Slug slug);

    boolean existsBySlug(Slug slug);

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
