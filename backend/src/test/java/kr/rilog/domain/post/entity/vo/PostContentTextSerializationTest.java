package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.exception.PostException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;
import static kr.rilog.support.fixure.PostContentFixture.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostContentTextSerializationTest {

    @Test
    @DisplayName("텍스트 인라인 콘텐츠를 배열 순서대로 원문 그대로 직렬화한다.")
    void serializeTextInlineContentsInOrder() {
        // given
        PostContent content = content("""
                {
                  "id": "block-1",
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": " 처음에는 ", "styles": {}},
                    {"type": "text", "text": "Discount | undefined", "styles": {"code": true}},
                    {"type": "text", "text": "였던 타입입니다.\\n", "styles": {"bold": true}}
                  ],
                  "children": []
                }
                """);

        // when
        List<TextBlock> textBlocks = content.extractTextBlocks();

        // then
        assertThat(textBlocks).containsExactly(
                new TextBlock("block-1", "paragraph", " 처음에는 Discount | undefined였던 타입입니다.\n")
        );
    }

    @Test
    @DisplayName("링크는 URL을 제외하고 표시 문자열만 순서대로 직렬화한다.")
    void serializeOnlyLinkDisplayText() {
        // given
        PostContent content = content("""
                {
                  "id": "block-1",
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "자세한 내용은 ", "styles": {}},
                    {
                      "type": "link",
                      "href": "https://example.com",
                      "content": [
                        {"type": "text", "text": "공식 ", "styles": {}},
                        {"type": "text", "text": "문서", "styles": {"bold": true}}
                      ]
                    },
                    {"type": "text", "text": "를 참고하세요.", "styles": {}}
                  ],
                  "children": []
                }
                """);

        // when
        List<TextBlock> textBlocks = content.extractTextBlocks();

        // then
        assertThat(textBlocks).containsExactly(
                new TextBlock("block-1", "paragraph", "자세한 내용은 공식 문서를 참고하세요.")
        );
    }

    @Test
    @DisplayName("빈 content와 개행만 있는 content를 서로 다른 텍스트 블록으로 추출한다.")
    void distinguishEmptyContentFromLineBreak() {
        // given
        PostContent content = content("""
                {
                  "id": "empty-block",
                  "type": "paragraph",
                  "content": [],
                  "children": []
                }
                """, """
                {
                  "id": "line-break-block",
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "\\n", "styles": {}}
                  ],
                  "children": []
                }
                """);

        // when
        List<TextBlock> textBlocks = content.extractTextBlocks();

        // then
        assertThat(textBlocks).containsExactly(
                new TextBlock("empty-block", "paragraph", ""),
                new TextBlock("line-break-block", "paragraph", "\n")
        );
    }

    @Test
    @DisplayName("자식 블록은 부모 텍스트에 합치지 않고 별도의 텍스트 블록으로 추출한다.")
    void extractChildAsSeparateTextBlock() {
        // given
        PostContent content = content("""
                {
                  "id": "parent-block",
                  "type": "toggleListItem",
                  "content": [
                    {"type": "text", "text": "부모", "styles": {}}
                  ],
                  "children": [
                    {
                      "id": "child-block",
                      "type": "paragraph",
                      "content": [
                        {"type": "text", "text": "자식", "styles": {}}
                      ],
                      "children": []
                    }
                  ]
                }
                """);

        // when
        List<TextBlock> textBlocks = content.extractTextBlocks();

        // then
        assertThat(textBlocks).containsExactly(
                new TextBlock("parent-block", "toggleListItem", "부모"),
                new TextBlock("child-block", "paragraph", "자식")
        );
    }

    @Test
    @DisplayName("코드 블록의 공백과 개행을 원문 그대로 직렬화하고 블록 타입을 함께 추출한다.")
    void serializeCodeBlockWithoutModification() {
        // given
        PostContent content = content("""
                {
                  "id": "code-block",
                  "type": "codeBlock",
                  "props": {"language": "java"},
                  "content": [
                    {"type": "text", "text": "if (valid) {\\n\\treturn value;\\n}\\n", "styles": {}}
                  ],
                  "children": []
                }
                """);

        // when
        List<TextBlock> textBlocks = content.extractTextBlocks();

        // then
        assertThat(textBlocks).containsExactly(
                new TextBlock("code-block", "codeBlock", "if (valid) {\n\treturn value;\n}\n")
        );
    }

    @Test
    @DisplayName("content 배열이 있는 블록의 type이 없으면 예외가 발생한다.")
    void throwWhenBlockTypeIsMissing() {
        // given
        PostContent content = content("""
                {
                  "id": "block-1",
                  "content": [],
                  "children": []
                }
                """);

        // when & then
        assertThatThrownBy(content::extractTextBlocks)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("텍스트가 없는 이미지, 파일, 구분선과 표 블록은 추출하지 않는다.")
    void excludeNonTextBlocks() {
        // given
        PostContent content = content(
                imageBlock(IMAGE_URL_A),
                fileBlock(FILE_URL),
                divider(),
                table()
        );

        // when
        List<TextBlock> textBlocks = content.extractTextBlocks();

        // then
        assertThat(textBlocks).isEmpty();
    }

    @Test
    @DisplayName("블록의 content가 null이면 예외가 발생한다.")
    void throwWhenBlockContentIsNull() {
        // given
        PostContent content = content("""
                {
                  "id": "block-1",
                  "type": "paragraph",
                  "content": null,
                  "children": []
                }
                """);

        // when & then
        assertThatThrownBy(content::extractTextBlocks)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("content 배열의 요소가 null이면 예외가 발생한다.")
    void throwWhenInlineContentElementIsNull() {
        // given
        PostContent content = contentWithInlineContent("null");

        // when & then
        assertThatThrownBy(content::extractTextBlocks)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("인라인 콘텐츠가 객체가 아니면 예외가 발생한다.")
    void throwWhenInlineContentIsNotObject() {
        // given
        PostContent content = contentWithInlineContent("\"문자열\"");

        // when & then
        assertThatThrownBy(content::extractTextBlocks)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("인라인 콘텐츠에 type이 없으면 예외가 발생한다.")
    void throwWhenInlineContentTypeIsMissing() {
        // given
        PostContent content = contentWithInlineContent("{}");

        // when & then
        assertThatThrownBy(content::extractTextBlocks)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("인라인 콘텐츠의 type을 지원하지 않으면 예외가 발생한다.")
    void throwWhenInlineContentTypeIsUnsupported() {
        // given
        PostContent content = contentWithInlineContent("{\"type\": \"mention\"}");

        // when & then
        assertThatThrownBy(content::extractTextBlocks)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("text 타입에 text 필드가 없으면 예외가 발생한다.")
    void throwWhenTextFieldIsMissing() {
        // given
        PostContent content = contentWithInlineContent("{\"type\": \"text\"}");

        // when & then
        assertThatThrownBy(content::extractTextBlocks)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("text 타입의 text 값이 문자열이 아니면 예외가 발생한다.")
    void throwWhenTextFieldIsNotString() {
        // given
        PostContent content = contentWithInlineContent("{\"type\": \"text\", \"text\": 1}");

        // when & then
        assertThatThrownBy(content::extractTextBlocks)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @DisplayName("링크 내부 content가 텍스트 배열이 아니면 예외가 발생한다.")
    @ValueSource(strings = {
            "{\"type\": \"link\"}",
            "{\"type\": \"link\", \"content\": null}",
            "{\"type\": \"link\", \"content\": {}}",
            "{\"type\": \"link\", \"content\": [{\"type\": \"link\", \"content\": []}]}"
    })
    void throwWhenLinkContentIsInvalid(String rawLinkContent) {
        // given
        PostContent content = content("""
                {
                  "id": "block-1",
                  "type": "paragraph",
                  "content": [%s],
                  "children": []
                }
                """.formatted(rawLinkContent));

        // when & then
        assertThatThrownBy(content::extractTextBlocks)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @Test
    @DisplayName("children이 배열이 아니면 예외가 발생한다.")
    void throwWhenChildrenIsNotArray() {
        // given
        PostContent content = content("""
                {
                  "id": "block-1",
                  "type": "paragraph",
                  "content": [],
                  "children": {}
                }
                """);

        // when & then
        assertThatThrownBy(content::extractTextBlocks)
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    private static PostContent contentWithInlineContent(String rawInlineContent) {
        return content("""
                {
                  "id": "block-1",
                  "type": "paragraph",
                  "content": [%s],
                  "children": []
                }
                """.formatted(rawInlineContent));
    }

}
