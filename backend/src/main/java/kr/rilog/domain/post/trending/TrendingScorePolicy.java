package kr.rilog.domain.post.trending;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@FunctionalInterface
public interface TrendingScorePolicy {

    BigDecimal calculate(TrendingCandidate candidate, LocalDateTime evaluatedAt);
}
