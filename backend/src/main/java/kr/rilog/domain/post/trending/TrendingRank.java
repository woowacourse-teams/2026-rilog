package kr.rilog.domain.post.trending;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;

public record TrendingRank(Long postId, LocalDateTime publishedAt, BigDecimal score) {

    public static final Comparator<TrendingRank> BEST_FIRST = Comparator.comparing(TrendingRank::score)
            .thenComparing(TrendingRank::publishedAt)
            .thenComparing(TrendingRank::postId)
            .reversed();
}
