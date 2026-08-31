package kr.rilog.domain.chapter.repository;

import kr.rilog.domain.chapter.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {

    List<Chapter> findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(Long blogId);

    Optional<Chapter> findByIdAndBlogIdAndDeletedAtIsNull(Long chapterId, Long blogId);

}
