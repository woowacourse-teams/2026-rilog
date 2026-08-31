package kr.rilog.domain.chapter.repository;

import kr.rilog.domain.chapter.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {

    List<Chapter> findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(Long blogId);

    @Query("""
            SELECT chapter
            FROM Chapter chapter
            WHERE chapter.blog.id IN :blogIds
              AND chapter.deletedAt IS NULL
            ORDER BY chapter.blog.id ASC, chapter.order ASC
            """)
    List<Chapter> findAllByBlogIds(@Param("blogIds") List<Long> blogIds);

    Optional<Chapter> findByIdAndBlogIdAndDeletedAtIsNull(Long chapterId, Long blogId);

}
