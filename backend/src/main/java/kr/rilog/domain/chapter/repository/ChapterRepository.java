package kr.rilog.domain.chapter.repository;

import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.projection.ChapterIndexProjection;
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

    @Query("""
        SELECT new kr.rilog.domain.chapter.repository.projection.ChapterIndexProjection(
            chapter.id,
            chapter.name.value,
            COUNT(post.id)
        )
        FROM Chapter chapter
        LEFT JOIN Post post
               ON post.chapter = chapter
              AND post.status = kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED
              AND post.visibility = kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC
              AND post.deletedAt IS NULL
        WHERE chapter.blog.id = :blogId
          AND chapter.deletedAt IS NULL
        GROUP BY chapter.id, chapter.name.value, chapter.order
        ORDER BY chapter.order ASC
        """)
    List<ChapterIndexProjection> findChapterIndexByBlogId(
            @Param("blogId") Long blogId
    );

}
