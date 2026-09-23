package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.exception.PostException;
import kr.rilog.support.fixure.PostContentFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Set;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;
import static kr.rilog.domain.post.exception.PostErrorInformation.TEXT_BLOCK_NOT_FOUND;
import static kr.rilog.support.fixure.PostContentFixture.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.util.ReflectionTestUtils.invokeMethod;

class PostContentTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    @Test
    @DisplayName("블록 배열로 생성한다")
    void createWithBlocks() {
        JsonNode value = json("""
                [
                  {"type": "paragraph", "props": {"text": "안녕하세요"}},
                  {"type": "image", "props": {"url": "https://cdn.rilog.kr/a.png"}}
                ]
                """);

        assertThatCode(() -> PostContent.from(value))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("빈 배열로도 생성한다")
    void createWithEmptyArray() {
        PostContent content = PostContent.from(json("[]"));

        assertThat(content.extractFileUrls()).isEmpty();
    }

    @Test
    @DisplayName("값이 null이면 예외가 발생한다")
    void throwWhenNull() {
        assertThatThrownBy(() -> PostContent.from(null))
                .isInstanceOf(PostException.class);
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @DisplayName("배열이 아니면 예외가 발생한다")
    @ValueSource(strings = {
            "{\"type\": \"paragraph\"}",    // 객체
            "\"본문입니다\"",                // 문자열
            "123",                          // 숫자
            "true",                         // 불린
            "null"                          // JSON null
    })
    void throwWhenNotArray(String raw) {
        // given
        JsonNode value = json(raw);

        // when
        assertThatThrownBy(() -> PostContent.from(value))
                .isInstanceOf(PostException.class);
    }

    @Test
    @DisplayName("에디터가 실제로 만든 본문에서 파일과 이미지를 찾는다")
    void extractsFromRealEditorOutput() {
        // given
        PostContent content = content(imageBlock(IMAGE_URL_A), imageBlock(IMAGE_URL_B));

        // when & then
        assertThat(content.extractFileUrls()).containsExactly(
                PostContentFixture.IMAGE_URL_A,
                PostContentFixture.IMAGE_URL_B
        );
    }

    @Test
    @DisplayName("PostContent끼리 파일 차집합을 찾는다.")
    void findsRemovedUrls() {
        // given
        PostContent before = content(imageBlock(IMAGE_URL_A), imageBlock(IMAGE_URL_B));
        PostContent after = content(imageBlock(IMAGE_URL_A));

        // when & then
        assertThat(before.fileUrlsNotIn(after))
                .containsExactly(IMAGE_URL_B);
    }

    @Test
    @DisplayName("블록의 문자열 ID를 읽는다.")
    void readBlockId() {
        // given
        PostContent content = content();
        JsonNode block = json("{\"id\": \"block-1\"}");

        // when
        String blockId = invokeMethod(content, "readBlockId", block);

        // then
        assertThat(blockId).isEqualTo("block-1");
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @DisplayName("블록 ID가 유효한 문자열이 아니면 예외가 발생한다.")
    @ValueSource(strings = {
            "{}",
            "{\"id\": null}",
            "{\"id\": 1}",
            "{\"id\": true}",
            "{\"id\": {}}",
            "{\"id\": \"\"}",
            "{\"id\": \" \"}"
    })
    void throwWhenBlockIdIsInvalid(String rawBlock) {
        // given
        PostContent content = content();
        JsonNode block = json(rawBlock);

        // when & then
        assertThatThrownBy(() -> invokeMethod(content, "readBlockId", block))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("블록 ID 목록으로 조회하면 일치하는 텍스트 블록만 반환한다.")
    void findTextBlocksReturnsOnlyMatchingTextBlocks() {
        // given
        PostContent content = content(
                paragraph("가나다라"),
                toggle()
        );

        // when
        TextBlocks actual = content.findTextBlocks(Set.of(PARAGRAPH_BLOCK_ID));

        // then
        TextBlocks expected = TextBlocks.from(List.of(
                new TextBlock(PARAGRAPH_BLOCK_ID, "paragraph", "가나다라")
        ));
        assertThat(actual).isEqualTo(expected);
    }

    @Test
    @DisplayName("블록 ID로 조회하면 일치하는 텍스트 블록을 반환한다.")
    void findTextBlockReturnsMatchingTextBlock() {
        // given
        PostContent content = content(paragraph("가나다라"));

        // when
        TextBlock actual = content.findTextBlock(PARAGRAPH_BLOCK_ID);

        // then
        assertThat(actual).isEqualTo(new TextBlock(PARAGRAPH_BLOCK_ID, "paragraph", "가나다라"));
    }

    @Test
    @DisplayName("존재하지 않는 블록 ID로 조회하면 예외가 발생한다.")
    void findTextBlockThrowsWhenBlockDoesNotExist() {
        // given
        PostContent content = content(paragraph("가나다라"));

        // when & then
        assertThatThrownBy(() -> content.findTextBlock("missing-block"))
                .isInstanceOf(PostException.class)
                .hasMessage(TEXT_BLOCK_NOT_FOUND.getMessage());
    }

    private static JsonNode json(String raw) {
        return MAPPER.readTree(raw);
    }

}
