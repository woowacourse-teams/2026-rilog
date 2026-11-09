package kr.rilog.domain.post.trending;

import kr.rilog.domain.post.entity.enums.Category;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.math.RoundingMode;
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

    @ParameterizedTest
    @CsvSource({
            "TECH, 0, 150",
            "TECH, 9, 195",
            "TECH, 10, 200",
            "TECH, 11, 200",
            "TECH, 9223372036854775807, 200",
            "RETROSPECT, 0, 100"
    })
    @DisplayName("기술 글에만 댓글 10개분을 더하고 가산율을 최대 100%로 제한한다")
    void appliesTechCreditBeforeCap(Category category, long comments, String expected) {
        TrendingCandidate candidate = new TrendingCandidate(1L, NOW, 100, comments, category);
        assertThat(policy.calculate(candidate, NOW)).isEqualByComparingTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
            "0, 100",
            "24, 100",
            "168, 100",
            "180, 90",
            "192, 80",
            "264, 61.717443",
            "336, 43.434885",
            "360, 38.816728",
            "504, 20.108771",
            "672, 9.544436"
    })
    @DisplayName("발행 후 경계값과 중간 구간의 점수를 반영한다")
    void appliesAgeDecayCurve(long elapsedHours, String expected) {
        assertThat(score(100, 0, NOW.minusHours(elapsedHours)).setScale(6, RoundingMode.HALF_UP))
                .isEqualByComparingTo(expected);
    }

    private BigDecimal score(long views, long comments, LocalDateTime publishedAt) {
        return policy.calculate(new TrendingCandidate(1L, publishedAt, views, comments, Category.DAILY), NOW);
    }
}
