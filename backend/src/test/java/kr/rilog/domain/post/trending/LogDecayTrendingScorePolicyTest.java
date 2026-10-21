package kr.rilog.domain.post.trending;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class LogDecayTrendingScorePolicyTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 21, 12, 0);
    private final TrendingScorePolicy policy = new LogDecayTrendingScorePolicy(7);

    @Test
    @DisplayName("외부 댓글마다 조회수의 5%를 더하되 20개부터는 100%까지만 가산한다")
    void addsFivePercentPerCommentWithOneHundredPercentCap() {
        assertThat(score(100, 0, NOW)).isEqualByComparingTo("100");
        assertThat(score(100, 1, NOW)).isEqualByComparingTo("105");
        assertThat(score(100, 19, NOW)).isEqualByComparingTo("195");
        assertThat(score(100, 20, NOW)).isEqualByComparingTo("200");
        assertThat(score(100, Long.MAX_VALUE, NOW)).isEqualByComparingTo("200");
        assertThat(score(0, 20, NOW)).isZero();
    }

    @Test
    @DisplayName("로그 시간 감쇠는 설정한 일수에서 절반이며 하루 중에도 연속적으로 감소한다")
    void decaysContinuouslyAndCanChangeDecaySpeed() {
        assertThat(score(100, 0, NOW.minusDays(7))).isEqualByComparingTo("50");
        assertThat(score(100, 0, NOW.minusDays(28))).isLessThan(new BigDecimal("50"));
        assertThat(score(100, 0, NOW.minusHours(12)))
                .isBetween(score(100, 0, NOW.minusDays(1)), new BigDecimal("100"));
        TrendingScorePolicy slower = new LogDecayTrendingScorePolicy(14);
        assertThat(slower.calculate(new TrendingCandidate(1L, NOW.minusDays(14), 100, 0), NOW))
                .isEqualByComparingTo("50");
    }

    private BigDecimal score(long views, long comments, LocalDateTime publishedAt) {
        return policy.calculate(new TrendingCandidate(1L, publishedAt, views, comments), NOW);
    }
}
