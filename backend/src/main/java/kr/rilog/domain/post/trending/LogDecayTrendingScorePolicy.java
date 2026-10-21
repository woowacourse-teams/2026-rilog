package kr.rilog.domain.post.trending;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;

public class LogDecayTrendingScorePolicy implements TrendingScorePolicy {

    private static final BigDecimal COMMENT_BONUS_RATE = new BigDecimal("0.05"); // 외부 댓글 1개 당 5% 가산.

    private final double decayLog;

    public LogDecayTrendingScorePolicy(double halfLifeDays) {
        if (!Double.isFinite(halfLifeDays) || halfLifeDays <= 0) {
            throw new IllegalArgumentException("트렌딩 감쇠 기준 일수는 양수여야 합니다.");
        }
        this.decayLog = Math.log1p(halfLifeDays);
    }

    @Override
    public BigDecimal calculate(TrendingCandidate candidate, LocalDateTime evaluatedAt) {
        double elapsedDays = Math.max(0, Duration.between(candidate.publishedAt(), evaluatedAt).toSeconds() / 86_400.0);
        double decay = 1 / (1 + Math.log1p(elapsedDays) / decayLog);
        BigDecimal bonus = COMMENT_BONUS_RATE.multiply(BigDecimal.valueOf(candidate.externalCommentCount()))
                .min(BigDecimal.ONE); // 외부 댓글 가중치 최대 100%로 제한.
        return BigDecimal.valueOf(candidate.viewCount())
                .multiply(BigDecimal.valueOf(decay))
                .multiply(BigDecimal.ONE.add(bonus));
    }
}
