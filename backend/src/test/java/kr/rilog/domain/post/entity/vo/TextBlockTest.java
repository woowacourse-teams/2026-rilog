package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.exception.PostException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TextBlockTest {

    private static final String BLOCK_ID = "block-id";
    private static final String TYPE = "paragraph";

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " "})
    @DisplayName("블록 ID가 유효한 문자열이 아니면 게시글 예외가 발생한다.")
    void throwPostExceptionWhenBlockIdIsInvalid(String blockId) {
        assertThatThrownBy(() -> new TextBlock(blockId, TYPE, "본문"))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " "})
    @DisplayName("블록 타입이 유효한 문자열이 아니면 게시글 예외가 발생한다.")
    void throwPostExceptionWhenTypeIsInvalid(String type) {
        assertThatThrownBy(() -> new TextBlock(BLOCK_ID, type, "본문"))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("텍스트가 null이면 게시글 예외가 발생한다.")
    void throwPostExceptionWhenTextIsNull() {
        assertThatThrownBy(() -> new TextBlock(BLOCK_ID, TYPE, null))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("생성한 텍스트 블록은 블록 ID를 보존한다.")
    void preserveBlockId() {
        // given
        String text = "본문";

        // when
        TextBlock textBlock = new TextBlock(BLOCK_ID, TYPE, text);

        // then
        assertThat(textBlock.blockId()).isEqualTo(BLOCK_ID);
    }

    @Test
    @DisplayName("생성한 텍스트 블록은 블록 타입을 보존한다.")
    void preserveType() {
        // when
        TextBlock textBlock = new TextBlock(BLOCK_ID, "codeBlock", "본문");

        // then
        assertThat(textBlock.type()).isEqualTo("codeBlock");
    }

    @Test
    @DisplayName("텍스트의 공백, 탭과 개행을 원문 그대로 보존한다.")
    void preserveWhitespaceInText() {
        // given
        String original = "  처음에는\t값이 있습니다.\n";

        // when
        TextBlock textBlock = new TextBlock(BLOCK_ID, TYPE, original);

        // then
        assertThat(textBlock.text()).isEqualTo(original);
    }

    @Test
    @DisplayName("텍스트의 유니코드 표현을 정규화하지 않는다.")
    void preserveUnicodeRepresentation() {
        // given
        String decomposedKorean = "\u1100\u1161";
        String composedKorean = "\uAC00";

        // when
        TextBlock textBlock = new TextBlock(BLOCK_ID, TYPE, decomposedKorean);

        // then
        assertThat(textBlock.text())
                .isEqualTo(decomposedKorean)
                .isNotEqualTo(composedKorean);
    }

    @Test
    @DisplayName("빈 텍스트와 개행만 있는 텍스트를 서로 다른 값으로 보존한다.")
    void distinguishEmptyTextFromLineBreak() {
        // given
        String emptyText = "";
        String lineBreak = "\n";

        // when
        TextBlock emptyTextBlock = new TextBlock("empty-block", TYPE, emptyText);
        TextBlock lineBreakTextBlock = new TextBlock("line-break-block", TYPE, lineBreak);

        // then
        assertThat(List.of(emptyTextBlock.text(), lineBreakTextBlock.text()))
                .containsExactly(emptyText, lineBreak);
    }

    @Test
    @DisplayName("텍스트 길이를 UTF-16 코드 단위로 계산한다.")
    void calculateLengthInUtf16CodeUnits() {
        // given
        TextBlock textBlock = new TextBlock(BLOCK_ID, TYPE, "가😀\n");

        // when
        int length = textBlock.utf16Length();

        // then
        assertThat(length).isEqualTo(4);
    }

    @Test
    @DisplayName("UTF-16 offset의 시작을 포함하고 끝을 제외하여 텍스트를 자른다.")
    void sliceByHalfOpenUtf16Offsets() {
        // given
        TextBlock textBlock = new TextBlock(BLOCK_ID, TYPE, "가😀나");

        // when
        String sliced = textBlock.slice(1, 3);

        // then
        assertThat(sliced).isEqualTo("😀");
    }

    @Test
    @DisplayName("처음부터 UTF-16 길이까지 자르면 전체 텍스트를 반환한다.")
    void sliceEntireTextAtBoundaryOffsets() {
        // given
        TextBlock textBlock = new TextBlock(BLOCK_ID, TYPE, "가😀나");

        // when
        String sliced = textBlock.slice(0, textBlock.utf16Length());

        // then
        assertThat(sliced).isEqualTo(textBlock.text());
    }

    @Test
    @DisplayName("텍스트 끝에서 시작과 끝 offset이 같으면 빈 문자열을 반환한다.")
    void returnEmptyTextWhenOffsetsAreEqualAtTextEnd() {
        // given
        TextBlock textBlock = new TextBlock(BLOCK_ID, TYPE, "본문");

        // when
        String sliced = textBlock.slice(textBlock.utf16Length(), textBlock.utf16Length());

        // then
        assertThat(sliced).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
            "-1, 0",
            "1, 0",
            "0, 3"
    })
    @DisplayName("offset 범위가 유효하지 않으면 게시글 예외가 발생한다.")
    void throwPostExceptionWhenOffsetRangeIsInvalid(int startOffset, int endOffset) {
        // given
        TextBlock textBlock = new TextBlock(BLOCK_ID, TYPE, "본문");

        // when & then
        assertThatThrownBy(() -> textBlock.slice(startOffset, endOffset))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

}
