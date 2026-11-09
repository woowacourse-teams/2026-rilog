package kr.rilog.domain.post.trending;

import kr.rilog.domain.post.entity.enums.Category;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;

public class LogDecayTrendingScorePolicy implements TrendingScorePolicy {

    private static final double EARLY_WEIGHT = 0.8;
    private static final int FULL_WEIGHT_END_DAYS = 7;
    private static final int EARLY_DECAY_END_DAYS = 8;
    private static final int LATE_DECAY_START_DAYS = 14;
    private static final double LATE_DECAY_HALF_LIFE_DAYS = 7;
    private static final double LOG_LATE_DECAY_START = Math.log1p(LATE_DECAY_START_DAYS);
    private static final double LATE_START_WEIGHT = 1 / (1 + LOG_LATE_DECAY_START / Math.log1p(7));
    private static final BigDecimal COMMENT_BONUS_RATE = new BigDecimal("0.05");
    private static final BigDecimal TECH_COMMENT_CREDIT = BigDecimal.TEN;

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
        BigDecimal commentCount = BigDecimal.valueOf(candidate.externalCommentCount());
        if (candidate.category() == Category.TECH) {
            commentCount = commentCount.add(TECH_COMMENT_CREDIT);
        }
        BigDecimal bonus = commentCount.multiply(COMMENT_BONUS_RATE).min(BigDecimal.ONE);
        return BigDecimal.valueOf(candidate.viewCount())
                .multiply(BigDecimal.valueOf(timeWeight(elapsedDays)))
                .multiply(BigDecimal.ONE.add(bonus));
    }

    private double timeWeight(double elapsedDays) {
        if (elapsedDays <= FULL_WEIGHT_END_DAYS) {
            return 1;
        }
        if (elapsedDays <= EARLY_DECAY_END_DAYS) {
            double progress = (elapsedDays - FULL_WEIGHT_END_DAYS) / (EARLY_DECAY_END_DAYS - FULL_WEIGHT_END_DAYS);
            return 1 - (1 - EARLY_WEIGHT) * progress;
        }
        if (elapsedDays <= LATE_DECAY_START_DAYS) {
            double progress = (elapsedDays - EARLY_DECAY_END_DAYS) / (LATE_DECAY_START_DAYS - EARLY_DECAY_END_DAYS);
            return EARLY_WEIGHT + (LATE_START_WEIGHT - EARLY_WEIGHT) * progress;
        }
        // 로그 감쇠 설정을 바꿔도 14일 기준점에서 끊기지 않게 연결한다.
        double logDecayRatio = (decayLog + LOG_LATE_DECAY_START) / (decayLog + Math.log1p(elapsedDays));
        double additionalDecay = Math.pow(0.5, (elapsedDays - LATE_DECAY_START_DAYS) / LATE_DECAY_HALF_LIFE_DAYS);
        return LATE_START_WEIGHT * logDecayRatio * additionalDecay;
    }
}
