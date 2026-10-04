package kr.rilog.domain.post.view;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostViewPropertiesTest {

    @Test
    @DisplayName("생략한 용량 설정에만 기본값을 적용한다")
    void appliesDefaultsOnlyToMissingValues() {
        assertThat(new PostViewProperties(null, null)).isEqualTo(new PostViewProperties(10_000, 100_000));
        assertThat(new PostViewProperties(1, null)).isEqualTo(new PostViewProperties(1, 100_000));
        assertThat(new PostViewProperties(null, 1)).isEqualTo(new PostViewProperties(10_000, 1));
        assertThat(new PostViewProperties(2, 3)).isEqualTo(new PostViewProperties(2, 3));
    }

    @Test
    @DisplayName("어느 용량이든 0 이하이면 설정을 거부한다")
    void rejectsNonPositiveValues() {
        for (int invalid : new int[]{0, -1}) {
            assertThatThrownBy(() -> new PostViewProperties(invalid, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("조회수 카운터와 독자 기록 한도는 양수여야 합니다.");
            assertThatThrownBy(() -> new PostViewProperties(null, invalid))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("조회수 카운터와 독자 기록 한도는 양수여야 합니다.");
        }
    }
}
