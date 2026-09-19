package kr.rilog.domain.post.entity.vo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TextBlockTest {

    private static final String BLOCK_ID = "block-id";

    @Test
    @DisplayName("생성한 텍스트 블록은 블록 ID를 보존한다.")
    void preserveBlockId() {
        // given
        String text = "본문";

        // when
        TextBlock textBlock = new TextBlock(BLOCK_ID, text);

        // then
        assertThat(textBlock.blockId()).isEqualTo(BLOCK_ID);
    }

    @Test
    @DisplayName("텍스트의 공백, 탭과 개행을 원문 그대로 보존한다.")
    void preserveWhitespaceInText() {
        // given
        String original = "  처음에는\t값이 있습니다.\n";

        // when
        TextBlock textBlock = new TextBlock(BLOCK_ID, original);

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
        TextBlock textBlock = new TextBlock(BLOCK_ID, decomposedKorean);

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
        TextBlock emptyTextBlock = new TextBlock("empty-block", emptyText);
        TextBlock lineBreakTextBlock = new TextBlock("line-break-block", lineBreak);

        // then
        assertThat(List.of(emptyTextBlock.text(), lineBreakTextBlock.text()))
                .containsExactly(emptyText, lineBreak);
    }

    @Test
    @DisplayName("텍스트 길이를 UTF-16 코드 단위로 계산한다.")
    void calculateLengthInUtf16CodeUnits() {
        // given
        TextBlock textBlock = new TextBlock(BLOCK_ID, "가😀\n");

        // when
        int length = textBlock.utf16Length();

        // then
        assertThat(length).isEqualTo(4);
    }

    @Test
    @DisplayName("UTF-16 offset의 시작을 포함하고 끝을 제외하여 텍스트를 자른다.")
    void sliceByHalfOpenUtf16Offsets() {
        // given
        TextBlock textBlock = new TextBlock(BLOCK_ID, "가😀나");

        // when
        String sliced = textBlock.slice(1, 3);

        // then
        assertThat(sliced).isEqualTo("😀");
    }

    @Test
    @DisplayName("처음부터 UTF-16 길이까지 자르면 전체 텍스트를 반환한다.")
    void sliceEntireTextAtBoundaryOffsets() {
        // given
        TextBlock textBlock = new TextBlock(BLOCK_ID, "가😀나");

        // when
        String sliced = textBlock.slice(0, textBlock.utf16Length());

        // then
        assertThat(sliced).isEqualTo(textBlock.text());
    }

    @Test
    @DisplayName("텍스트 끝에서 시작과 끝 offset이 같으면 빈 문자열을 반환한다.")
    void returnEmptyTextWhenOffsetsAreEqualAtTextEnd() {
        // given
        TextBlock textBlock = new TextBlock(BLOCK_ID, "본문");

        // when
        String sliced = textBlock.slice(textBlock.utf16Length(), textBlock.utf16Length());

        // then
        assertThat(sliced).isEmpty();
    }

}
