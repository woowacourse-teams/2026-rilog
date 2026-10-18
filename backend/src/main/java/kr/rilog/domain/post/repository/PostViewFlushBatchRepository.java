package kr.rilog.domain.post.repository;

import kr.rilog.domain.post.entity.PostViewFlushBatchRecord;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PostViewFlushBatchRepository extends Repository<PostViewFlushBatchRecord, String> {

    Optional<PostViewFlushBatchRecord> findById(String batchId);

    @Modifying
    @Query(value = """
            insert into post_view_flush_batch (batch_id, post_id, delta, created_at)
            values (:batchId, :postId, :delta, :createdAt)
            """, nativeQuery = true)
    void insert(@Param("batchId") String batchId, @Param("postId") long postId,
                @Param("delta") long delta, @Param("createdAt") LocalDateTime createdAt);
}
