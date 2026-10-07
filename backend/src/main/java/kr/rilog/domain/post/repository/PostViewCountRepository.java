package kr.rilog.domain.post.repository;

import kr.rilog.domain.post.entity.PostViewCount;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostViewCountRepository extends Repository<PostViewCount, Long> {

    @Modifying
    @Query(value = "insert into post_view_count (post_id, view_count) values (:postId, 0)", nativeQuery = true)
    void initialize(@Param("postId") Long postId);

    @Query("select counter.viewCount from PostViewCount counter where counter.postId = :postId")
    Optional<Long> findViewCountByPostId(@Param("postId") Long postId);
}
