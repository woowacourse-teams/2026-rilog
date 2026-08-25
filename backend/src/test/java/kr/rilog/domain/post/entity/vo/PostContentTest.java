package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.exception.PostException;
import kr.rilog.support.fixure.PostContentFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static kr.rilog.support.fixure.PostContentFixture.*;
import static org.assertj.core.api.Assertions.*;

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

        assertThatThrownBy(()->PostContent.from(value))
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
        assertThat(before.fileUrlsRemovedIn(after))
                .containsExactly(IMAGE_URL_B);
    }

    private static JsonNode json(String raw) {
        return MAPPER.readTree(raw);
    }

}
