package kr.rilog.domain.blog.repository;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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

    Optional<Blog> findBySlugAndBlogType(String slug, BlogType blogType);

    boolean existsBySlug(String slug);

}
