package kr.rilog.domain.post.entity.vo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DiffSpanTest {

    @Test
    @DisplayName("시작 offset을 포함하고 끝 offset을 제외하여 DiffSpan을 생성한다.")
    void sliceByOffsets() {
        // given
        String source = "가나다라";

        // when
        DiffSpan span = DiffSpan.slice(source, 1, 3);

        // then
        assertThat(span).isEqualTo(new DiffSpan(1, 3, "나다"));
    }

    @Test
    @DisplayName("DiffSpan은 TextRange와 달리, 빈 범위를 표현할 수 있다.")
    void createEmptySpan() {
        // given
        String source = "가나";

        // when
        DiffSpan span = DiffSpan.slice(source, 2, 2);

        // then
        assertThat(span).isEqualTo(new DiffSpan(2, 2, ""));
    }

    @Test
    @DisplayName("DiffSpan의 텍스트가 null이면 생성할 수 없다.")
    void rejectNullText() {
        assertThatThrownBy(() -> new DiffSpan(0, 0, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("DiffSpan의 text가 null입니다.");
    }

    @ParameterizedTest
    @CsvSource(value = {"-1, 0, text", "2, 1, ''", "0, 2, text"})
    @DisplayName("DiffSpan의 범위가 유효하지 않으면 생성할 수 없다.")
    void rejectInvalidRange(int startOffset, int endOffset, String text) {
        assertThatThrownBy(() -> new DiffSpan(startOffset, endOffset, text))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("잘못된 diff 범위입니다.");
    }
}
