package kr.rilog.domain.post.trending;

import java.time.LocalDateTime;

public record TrendingCandidate(Long postId, LocalDateTime publishedAt, long viewCount, long externalCommentCount) {
}
