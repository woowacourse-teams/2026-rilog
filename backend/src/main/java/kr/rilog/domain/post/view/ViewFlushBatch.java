package kr.rilog.domain.post.view;

import java.time.Instant;
import java.util.UUID;

public record ViewFlushBatch(UUID batchId, long postId, long delta, Instant createdAt) { }
