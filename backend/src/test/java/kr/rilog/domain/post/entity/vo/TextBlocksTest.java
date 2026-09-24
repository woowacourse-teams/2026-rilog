package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.exception.PostException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;
import static kr.rilog.domain.post.exception.PostErrorInformation.TEXT_BLOCK_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TextBlocksTest {

    private static final TextBlock PARAGRAPH_BLOCK =
            new TextBlock("paragraph-1", "paragraph", "문단 본문");
    private static final TextBlock HEADING_BLOCK =
            new TextBlock("heading-1", "heading", "제목 본문");

    @Test
    @DisplayName("텍스트 블록을 블록 ID로 조회할 수 있도록 보관한다.")
    void createStoresTextBlocksByBlockId() {
        // given & when
        TextBlocks textBlocks = TextBlocks.from(List.of(PARAGRAPH_BLOCK, HEADING_BLOCK));

        // then
        assertThat(textBlocks.get(PARAGRAPH_BLOCK.blockId())).isEqualTo(PARAGRAPH_BLOCK);
        assertThat(textBlocks.get(HEADING_BLOCK.blockId())).isEqualTo(HEADING_BLOCK);
    }

    @Test
    @DisplayName("텍스트 블록 목록이 null이면 생성할 수 없다.")
    void createRejectsNullCollection() {
        // when & then
        assertThatThrownBy(() -> TextBlocks.from(null))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("텍스트 블록 목록에 null이 포함되어 있으면 생성할 수 없다.")
    void createRejectsNullElement() {
        // given
        List<TextBlock> textBlocks = Arrays.asList(PARAGRAPH_BLOCK, null);

        // when & then
        assertThatThrownBy(() -> TextBlocks.from(textBlocks))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("같은 블록 ID가 중복되면 생성할 수 없다.")
    void createRejectsDuplicatedBlockId() {
        // given
        TextBlock duplicatedBlock = new TextBlock(PARAGRAPH_BLOCK.blockId(), "paragraph", "다른 본문");

        // when & then
        assertThatThrownBy(() -> TextBlocks.from(List.of(PARAGRAPH_BLOCK, duplicatedBlock)))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("생성에 사용한 목록이 변경되어도 보관한 텍스트 블록은 유지한다.")
    void createDefensivelyCopiesCollection() {
        // given
        List<TextBlock> source = new ArrayList<>(List.of(PARAGRAPH_BLOCK));
        TextBlocks textBlocks = TextBlocks.from(source);

        // when
        source.clear();

        // then
        assertThat(textBlocks.find(PARAGRAPH_BLOCK.blockId())).contains(PARAGRAPH_BLOCK);
    }

    @Test
    @DisplayName("요청한 블록 ID에 해당하는 텍스트 블록만 선택한다.")
    void matchingReturnsOnlyRequestedTextBlocks() {
        // given
        TextBlocks textBlocks = TextBlocks.from(List.of(PARAGRAPH_BLOCK, HEADING_BLOCK));

        // when
        TextBlocks matched = textBlocks.matching(Set.of(HEADING_BLOCK.blockId(), "missing-block"));

        // then
        assertThat(matched).isEqualTo(TextBlocks.from(List.of(HEADING_BLOCK)));
    }

    @Test
    @DisplayName("블록 ID 목록이 null이면 텍스트 블록을 선택할 수 없다.")
    void matchingRejectsNullBlockIds() {
        // given
        TextBlocks textBlocks = TextBlocks.from(List.of(PARAGRAPH_BLOCK));

        // when & then
        assertThatThrownBy(() -> textBlocks.matching(null))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("존재하는 블록 ID를 선택적으로 조회하면 텍스트 블록을 반환한다.")
    void findReturnsExistingTextBlock() {
        // given
        TextBlocks textBlocks = TextBlocks.from(List.of(PARAGRAPH_BLOCK));

        // when & then
        assertThat(textBlocks.find(PARAGRAPH_BLOCK.blockId())).contains(PARAGRAPH_BLOCK);
    }

    @Test
    @DisplayName("존재하지 않는 블록 ID를 선택적으로 조회하면 빈 값을 반환한다.")
    void findReturnsEmptyWhenTextBlockDoesNotExist() {
        // given
        TextBlocks textBlocks = TextBlocks.from(List.of(PARAGRAPH_BLOCK));

        // when & then
        assertThat(textBlocks.find("missing-block")).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 블록 ID를 필수로 조회하면 예외가 발생한다.")
    void getThrowsWhenTextBlockDoesNotExist() {
        // given
        TextBlocks textBlocks = TextBlocks.from(List.of(PARAGRAPH_BLOCK));

        // when & then
        assertThatThrownBy(() -> textBlocks.get("missing-block"))
                .isInstanceOf(PostException.class)
                .hasMessage(TEXT_BLOCK_NOT_FOUND.getMessage());
    }

}
