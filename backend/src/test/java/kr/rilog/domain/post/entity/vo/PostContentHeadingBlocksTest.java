package kr.rilog.domain.post.entity.vo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.heading;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static kr.rilog.support.fixure.PostContentFixture.toggle;
import static org.assertj.core.api.Assertions.assertThat;

class PostContentHeadingBlocksTest {

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    @DisplayName("본문에서 제목 블록만 추출하며 제목 레벨에 제한을 두지 않는다.")
    void selectsHeadingsRegardlessOfLevel(int level) {
        // given
        PostContent content = content(paragraph("기사 설명"), heading("topic", level, "기사 제목"));

        // when
        List<TextBlock> result = content.extractHeadingBlocks();

        // then
        assertThat(result).isEqualTo(List.of(new TextBlock("topic", "heading", "기사 제목")));
    }

    @Test
    @DisplayName("중첩된 제목 블록도 같은 제목을 합치지 않고 문서 순서대로 추출한다.")
    void preservesNestedHeadingOrder() {
        // given
        PostContent content = content(
                heading("first", 1, "같은 제목"),
                toggle(heading("nested", 3, "중첩된 기사")),
                heading("last", 2, "같은 제목")
        );

        // when
        List<TextBlock> result = content.extractHeadingBlocks();

        // then
        assertThat(result).isEqualTo(List.of(
                new TextBlock("first", "heading", "같은 제목"),
                new TextBlock("nested", "heading", "중첩된 기사"),
                new TextBlock("last", "heading", "같은 제목")
        ));
    }
}
