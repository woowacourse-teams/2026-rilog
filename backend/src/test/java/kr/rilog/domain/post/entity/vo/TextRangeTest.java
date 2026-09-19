package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.exception.PostException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_TEXT_RANGE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TextRangeTest {

    private static final String ERROR_INFORMATION = "errorInformation";

    @Test
    @DisplayName("[start, end) 범위의 길이는 end - start이다")
    void length() {
        // given
        int startOffset = 2;
        int endOffset = 5;
        TextRange range = TextRange.of(startOffset, endOffset);

        // when - then
        assertThat(range.getStartOffset()).isEqualTo(startOffset);
        assertThat(range.getEndOffset()).isEqualTo(endOffset);
        assertThat(range.length()).isEqualTo(endOffset - startOffset);
    }

    @ParameterizedTest
    @CsvSource({"-1, 2", "3, 3", "4, 3"})
    @DisplayName("범위는 0 이상이고 시작이 끝보다 작아야 한다")
    void rejectsInvalidOffsets(int start, int end) {
        assertThatThrownBy(() -> TextRange.of(start, end))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_TEXT_RANGE.getMessage());
    }

}
