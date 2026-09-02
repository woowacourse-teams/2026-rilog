package kr.rilog.domain.chapter.entity;

import kr.rilog.domain.chapter.entity.vo.ChapterName;
import kr.rilog.domain.chapter.exception.ChapterException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.INVALID_CHAPTER_NAME;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChapterNameTest {

    public static final int MAX_LENGTH = 20;

    @Test
    @DisplayName("한 글자의 챕터 이름을 생성할 수 있다.")
    void createWithMinimumLength() {
        // given
        String value = "장";

        // when & then
        assertThatCode(() -> ChapterName.from(value))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("최대 길이의 챕터 이름을 생성할 수 있다.")
    void createWithMaximumLength() {
        // given
        String value = "가".repeat(MAX_LENGTH);

        // when & then
        assertThatCode(() -> ChapterName.from(value))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("챕터 이름의 앞뒤 공백을 제거한다.")
    void stripSurroundingWhitespace() {
        // given
        String value = "  개발 이야기  ";

        // when
        ChapterName chapterName = ChapterName.from(value);

        // then
        assertThat(chapterName.getValue()).isEqualTo("개발 이야기");
    }

    @Test
    @DisplayName("챕터 이름이 null이면 예외가 발생한다.")
    void throwWhenNull() {
        assertThatThrownBy(() -> ChapterName.from(null))
                .isInstanceOf(ChapterException.class)
                .hasMessage(INVALID_CHAPTER_NAME.getMessage());
    }

    @Test
    @DisplayName("챕터 이름이 공백으로만 이루어지면 예외가 발생한다.")
    void throwWhenBlank() {
        // given
        String value = "   ";

        // when & then
        assertThatThrownBy(() -> ChapterName.from(value))
                .isInstanceOf(ChapterException.class)
                .hasMessage(INVALID_CHAPTER_NAME.getMessage());
    }

    @Test
    @DisplayName("챕터 이름이 최대 길이를 초과하면 예외가 발생한다.")
    void throwWhenLongerThanMaximumLength() {
        // given
        String value = "가".repeat(MAX_LENGTH + 1);

        // when & then
        assertThatThrownBy(() -> ChapterName.from(value))
                .isInstanceOf(ChapterException.class)
                .hasMessage(INVALID_CHAPTER_NAME.getMessage());
    }

}
