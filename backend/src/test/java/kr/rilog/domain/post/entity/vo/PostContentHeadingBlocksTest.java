package kr.rilog.domain.post.entity.vo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static kr.rilog.support.fixure.PostContentFixture.readTree;
import static kr.rilog.support.fixure.PostContentFixture.toggle;
import static org.assertj.core.api.Assertions.assertThat;

class PostContentHeadingBlocksTest {

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    @DisplayName("본문의 제목 블록은 H1·H2·H3 레벨에 관계없이 읽을 수 있다.")
    void extractsHeadingAtEveryLevel(int level) {
        // given
        PostContent content = content(heading("topic", level, "기사 제목"));

        // when
        List<TextBlock> result = content.extractHeadingBlocks();

        // then
        assertThat(result).isEqualTo(List.of(new TextBlock("topic", "heading", "기사 제목")));
    }

    @Test
    @DisplayName("본문의 일반 문단은 제목 블록에 포함하지 않는다.")
    void excludesParagraphs() {
        // given
        PostContent content = content(paragraph("기사 설명"));

        // when
        List<TextBlock> result = content.extractHeadingBlocks();

        // then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("본문의 중첩된 제목 블록도 문서 순서대로 읽을 수 있다.")
    void preservesNestedDocumentOrder() {
        // given
        PostContent content = content(
                heading("first", 1, "첫 번째 기사"),
                toggle(heading("nested", 3, "중첩된 기사")),
                heading("last", 2, "마지막 기사")
        );

        // when
        List<TextBlock> result = content.extractHeadingBlocks();

        // then
        assertThat(result).isEqualTo(List.of(
                new TextBlock("first", "heading", "첫 번째 기사"),
                new TextBlock("nested", "heading", "중첩된 기사"),
                new TextBlock("last", "heading", "마지막 기사")
        ));
    }

    @Test
    @DisplayName("제목 블록의 스타일과 링크가 섞인 텍스트는 하나의 제목으로 읽을 수 있다.")
    void serializesStyledAndLinkedHeadingText() {
        // given
        PostContent content = PostContent.from(readTree("""
                [{"id":"topic","type":"heading","props":{"level":2},"children":[],
                  "content":[
                    {"type":"text","text":"AI ","styles":{"bold":true}},
                    {"type":"link","href":"https://example.com","content":[
                      {"type":"text","text":"모델","styles":{}}
                    ]},
                    {"type":"text","text":" 공개","styles":{}}
                  ]}]
                """));

        // when
        List<TextBlock> result = content.extractHeadingBlocks();

        // then
        assertThat(result).isEqualTo(List.of(new TextBlock("topic", "heading", "AI 모델 공개")));
    }

    @Test
    @DisplayName("같은 제목을 가진 제목 블록도 각각의 문서 순서를 유지한다.")
    void preservesDuplicateHeadingTitles() {
        // given
        PostContent content = content(
                heading("first", 1, "같은 제목"),
                heading("second", 2, "같은 제목")
        );

        // when
        List<TextBlock> result = content.extractHeadingBlocks();

        // then
        assertThat(result).isEqualTo(List.of(
                new TextBlock("first", "heading", "같은 제목"),
                new TextBlock("second", "heading", "같은 제목")
        ));
    }

    private String heading(String id, int level, String title) {
        return """
                {"id":"%s","type":"heading","props":{"level":%d},
                 "content":[{"type":"text","text":"%s","styles":{}}],"children":[]}
                """.formatted(id, level, title);
    }
}
