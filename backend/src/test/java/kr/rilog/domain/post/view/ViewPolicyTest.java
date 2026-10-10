package kr.rilog.domain.post.view;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class ViewPolicyTest {

    private final ViewPolicy policy = new ViewPolicy();

    @Test
    @DisplayName("1시간 미만의 경과 시간은 다시 인정하지 않는다")
    void rejectsBeforeOneHour() {
        assertThat(policy.canAccept(0, Duration.ofHours(1).toNanos() - 1)).isFalse();
    }

    @Test
    @DisplayName("정확히 1시간이 경과하면 다시 인정한다")
    void acceptsAtOneHour() {
        assertThat(policy.canAccept(500, 500 + Duration.ofHours(1).toNanos())).isTrue();
    }

    @Test
    @DisplayName("음수 nanoTime도 유효한 인정 시각이다")
    void acceptsAcrossNegativeTicks() {
        assertThat(policy.canAccept(-Duration.ofMinutes(30).toNanos(), Duration.ofMinutes(30).toNanos())).isTrue();
    }

    @Test
    @DisplayName("nanoTime의 long 경계를 넘어도 경과 시간으로 판단한다")
    void acceptsAcrossTickWrap() {
        long last = Long.MAX_VALUE - Duration.ofSeconds(1).toNanos();
        assertThat(policy.canAccept(last, last + Duration.ofHours(1).toNanos())).isTrue();
    }
}
