package kr.rilog.domain.seo.repository;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.seo.repository.projection.BlogSitemapRow;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BlogSeoRepository extends Repository<Blog, Long> {

    @Query("""
            SELECT new kr.rilog.domain.seo.repository.projection.BlogSitemapRow(
                blog.slug.value
            )
            FROM Blog blog
            WHERE blog.deletedAt IS NULL
            ORDER BY blog.id ASC
            """)
    List<BlogSitemapRow> findSitemapBlogs();
}
