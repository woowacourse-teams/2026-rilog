package kr.rilog.domain.post.trending;

import java.math.BigDecimal;

public record TrendingScore(Long postId, BigDecimal score) {
}
