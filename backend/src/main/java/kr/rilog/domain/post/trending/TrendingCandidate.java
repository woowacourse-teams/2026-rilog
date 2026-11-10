package kr.rilog.domain.post.trending;

import kr.rilog.domain.post.entity.enums.Category;

import java.time.LocalDateTime;

public record TrendingCandidate(Long postId, LocalDateTime publishedAt, long viewCount, long externalCommentCount, Category category) {
}
