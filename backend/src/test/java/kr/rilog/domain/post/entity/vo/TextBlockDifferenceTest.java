package kr.rilog.domain.post.entity.vo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TextBlockDifferenceTest {

    private static final String BLOCK_ID = "block-id";
    private static final String TYPE = "paragraph";

    @Test
    @DisplayName("텍스트 블록의 변경은 공통 prefix와 기존·수정 tail로 계산한다.")
    void calculateDifferenceByCommonPrefix() {
        // given
        TextBlock previous = new TextBlock(BLOCK_ID, TYPE, "가나다라");
        TextBlock updated = new TextBlock(BLOCK_ID, TYPE, "가나나다라");

        // when
        TextBlockDiff difference = previous.calculateDifference(updated);

        // then
        TextBlockDiff expected = new TextBlockDiff(
                BLOCK_ID,
                new DiffSpan(0, 2, "가나"),
                new DiffSpan(2, 4, "다라"),
                new DiffSpan(2, 5, "나다라")
        );
        assertThat(difference).isEqualTo(expected);
    }

    @Test
    @DisplayName("두 텍스트가 같으면 전체 텍스트가 공통 prefix가 된다.")
    void calculateDifferenceWhenTextsAreEqual() {
        // given
        TextBlock previous = new TextBlock(BLOCK_ID, TYPE, "가나다라");
        TextBlock updated = new TextBlock(BLOCK_ID, TYPE, "가나다라");

        // when
        TextBlockDiff difference = previous.calculateDifference(updated);

        // then
        TextBlockDiff expected = new TextBlockDiff(
                BLOCK_ID,
                new DiffSpan(0, 4, "가나다라"),
                new DiffSpan(4, 4, ""),
                new DiffSpan(4, 4, "")
        );
        assertThat(difference).isEqualTo(expected);
    }

    @Test
    @DisplayName("첫 문자부터 다르면 공통 prefix는 빈 범위가 된다.")
    void calculateDifferenceWithoutCommonPrefix() {
        // given
        TextBlock previous = new TextBlock(BLOCK_ID, TYPE, "가나");
        TextBlock updated = new TextBlock(BLOCK_ID, TYPE, "다라");

        // when
        TextBlockDiff difference = previous.calculateDifference(updated);

        // then
        TextBlockDiff expected = new TextBlockDiff(
                BLOCK_ID,
                new DiffSpan(0, 0, ""),
                new DiffSpan(0, 2, "가나"),
                new DiffSpan(0, 2, "다라")
        );
        assertThat(difference).isEqualTo(expected);
    }

    @Test
    @DisplayName("기존 텍스트 전체가 공통 prefix이면 삭제 영역은 빈 범위가 된다.")
    void calculateDifferenceWhenTextIsAppended() {
        // given
        TextBlock previous = new TextBlock(BLOCK_ID, TYPE, "가나");
        TextBlock updated = new TextBlock(BLOCK_ID, TYPE, "가나다");

        // when
        TextBlockDiff difference = previous.calculateDifference(updated);

        // then
        TextBlockDiff expected = new TextBlockDiff(
                BLOCK_ID,
                new DiffSpan(0, 2, "가나"),
                new DiffSpan(2, 2, ""),
                new DiffSpan(2, 3, "다")
        );
        assertThat(difference).isEqualTo(expected);
    }

    @Test
    @DisplayName("텍스트 블록의 변경 offset은 UTF-16 code unit을 기준으로 계산한다.")
    void calculateDifferenceInUtf16CodeUnits() {
        // given
        TextBlock previous = new TextBlock(BLOCK_ID, TYPE, "가😀나");
        TextBlock updated = new TextBlock(BLOCK_ID, TYPE, "가😀다");

        // when
        TextBlockDiff difference = previous.calculateDifference(updated);

        // then
        TextBlockDiff expected = new TextBlockDiff(
                BLOCK_ID,
                new DiffSpan(0, 3, "가😀"),
                new DiffSpan(3, 4, "나"),
                new DiffSpan(3, 4, "다")
        );
        assertThat(difference).isEqualTo(expected);
    }

    @Test
    @DisplayName("수정된 텍스트 블록이 없으면 변경을 계산할 수 없다.")
    void rejectMissingUpdatedTextBlock() {
        // given
        TextBlock previous = new TextBlock(BLOCK_ID, TYPE, "본문");

        // when - then
        assertThatThrownBy(() -> previous.calculateDifference(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("수정된 텍스트 블록(비교대상)이 존재하지 않습니다.");
    }

    @Test
    @DisplayName("서로 다른 ID의 텍스트 블록은 변경을 계산할 수 없다.")
    void rejectTextBlockWithDifferentId() {
        // given
        TextBlock previous = new TextBlock(BLOCK_ID, TYPE, "이전 본문");
        TextBlock updated = new TextBlock("other-block-id", TYPE, "수정 본문");

        // when - then
        assertThatThrownBy(() -> previous.calculateDifference(updated))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("서로 다른 blockId는 비교할 수 없습니다.");
    }
}
