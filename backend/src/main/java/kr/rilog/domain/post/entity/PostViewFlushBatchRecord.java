package kr.rilog.domain.post.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import kr.rilog.domain.post.view.ViewFlushBatch;
import kr.rilog.global.exception.RilogInfrastructureException;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_INVALID;

@Entity
@Table(name = "post_view_flush_batch")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostViewFlushBatchRecord {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "batch_id", nullable = false, length = 36)
    private String batchId;

    @Column(name = "post_id", nullable = false)
    private long postId;

    @Column(name = "delta", nullable = false)
    private long delta;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public void validateMatches(ViewFlushBatch batch) {
        if (postId != batch.postId() || delta != batch.delta()) {
            throw new RilogInfrastructureException(POST_VIEW_COUNT_INVALID);
        }
    }
}
