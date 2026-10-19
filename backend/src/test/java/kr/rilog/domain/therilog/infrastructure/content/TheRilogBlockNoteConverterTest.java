package kr.rilog.domain.therilog.infrastructure.content;

import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.exception.PostException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class TheRilogBlockNoteConverterTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private final TheRilogBlockNoteConverter converter = new TheRilogBlockNoteConverter();

    @Test
    @DisplayName("뉴스 Markdown을 첨부된 기존 BlockNote 문서와 같은 구조로 변환한다.")
    void convertSuppliedNewsDocument() throws IOException {
        String markdown = resource("daily-headlines.md");
        JsonNode expected = MAPPER.readTree(resource("daily-headlines-blocknote.json"));

        JsonNode converted = converter.convert(markdown);

        assertThat(withoutIds(converted)).isEqualTo(withoutIds(expected));
    }

    @Test
    @DisplayName("중첩 강조와 링크의 스타일 및 이스케이프한 문자를 보존한다.")
    void preserveInlineFormatting() {
        String markdown = "**굵은 *기울임***과 [**원문**](https://example.com/a_(b)?x=1&y=2), `a_b*`, \\*문자\\*";

        JsonNode converted = converter.convert(markdown);

        JsonNode content = converted.get(0).path("content");
        assertSoftly(softly -> {
            softly.assertThat(content.get(0).path("styles").path("bold").asBoolean()).isTrue();
            softly.assertThat(content.get(1).path("styles").path("italic").asBoolean()).isTrue();
            softly.assertThat(content.get(3).path("href").asString()).isEqualTo("https://example.com/a_(b)?x=1&y=2");
            softly.assertThat(content.get(3).path("content").get(0).path("styles").path("bold").asBoolean()).isTrue();
            softly.assertThat(PostContent.from(converted).extractTextBlocks().getFirst().text())
                    .isEqualTo("굵은 기울임과 원문, a_b*, *문자*");
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"*기울임 **굵게** 기울임*", "_기울임 __굵게__ 기울임_"})
    @DisplayName("기울임 안의 굵은 강조를 종료 구분자로 오인하지 않고 보존한다.")
    void preserveBoldInsideItalic(String markdown) {
        JsonNode expected = MAPPER.readTree("""
                [
                  {"type":"text","text":"기울임 ","styles":{"italic":true}},
                  {"type":"text","text":"굵게","styles":{"italic":true,"bold":true}},
                  {"type":"text","text":" 기울임","styles":{"italic":true}}
                ]
                """);

        JsonNode converted = converter.convert(markdown);

        assertThat(converted.get(0).path("content")).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource(value = {"'## ###'|''", "'## title ###'|title"}, delimiter = '|')
    @DisplayName("헤딩 끝의 닫는 해시 표식을 제목 내용으로 남기지 않는다.")
    void removeClosingHeadingHashes(String markdown, String expectedTitle) {
        JsonNode converted = converter.convert(markdown);

        assertThat(PostContent.from(converted).extractHeadingBlocks().getFirst().text())
                .isEqualTo(expectedTitle);
    }

    @ParameterizedTest
    @CsvSource(value = {
            "'*literal \\*'|'*literal *'",
            "'**literal \\*\\*'|'**literal **'",
            "'*literal `*`'|'*literal *'"
    }, delimiter = '|')
    @DisplayName("이스케이프된 문자와 인라인 코드의 별표를 강조 종료로 오인하지 않는다.")
    void preserveUnclosedEmphasisMarkers(String markdown, String expectedText) {
        JsonNode converted = converter.convert(markdown);

        assertThat(PostContent.from(converted).extractTextBlocks().getFirst().text()).isEqualTo(expectedText);
        assertThat(converted.get(0).path("content").get(0).path("styles"))
                .isEqualTo(MAPPER.createObjectNode());
    }

    @Test
    @DisplayName("목록의 순서와 중첩 구조를 BlockNote 자식 블록에 보존한다.")
    void preserveNestedLists() {
        String markdown = """
                - 첫 항목
                  3. 세 번째부터 시작
                  4. 다음 항목
                - 둘째 항목
                """;

        JsonNode converted = converter.convert(markdown);

        JsonNode nested = converted.get(0).path("children");
        assertSoftly(softly -> {
            softly.assertThat(converted.size()).isEqualTo(2);
            softly.assertThat(converted.get(0).path("type").asString()).isEqualTo("bulletListItem");
            softly.assertThat(nested.size()).isEqualTo(2);
            softly.assertThat(nested.get(0).path("type").asString()).isEqualTo("numberedListItem");
            softly.assertThat(nested.get(0).path("props").path("start").asInt()).isEqualTo(3);
            softly.assertThat(PostContent.from(converted).extractTextBlocks().stream().map(block -> block.text()))
                    .containsExactly("첫 항목", "세 번째부터 시작", "다음 항목", "둘째 항목");
        });
    }

    @Test
    @DisplayName("코드의 줄바꿈과 언어 및 인용 문장을 기존 블록 유형으로 보존한다.")
    void preserveCodeAndQuote() {
        String markdown = """
                ```java
                var value = "**문자**";
                System.out.println(value);
                ```

                > **인용** 문장
                > 다음 줄
                """;

        JsonNode converted = converter.convert(markdown);

        assertSoftly(softly -> {
            softly.assertThat(converted.get(0).path("type").asString()).isEqualTo("codeBlock");
            softly.assertThat(converted.get(0).path("props").path("language").asString()).isEqualTo("java");
            softly.assertThat(converted.get(0).path("content").get(0).path("text").asString())
                    .isEqualTo("var value = \"**문자**\";\nSystem.out.println(value);");
            softly.assertThat(converted.get(0).path("content").get(0).path("styles").isEmpty()).isTrue();
            softly.assertThat(converted.get(1).path("type").asString()).isEqualTo("quote");
            softly.assertThat(PostContent.from(converted).extractTextBlocks().get(1).text())
                    .isEqualTo("인용 문장\n다음 줄");
        });
    }

    @Test
    @DisplayName("Mermaid 코드의 언어와 화살표 및 줄바꿈을 기존 BlockNote 코드 블록에 보존한다.")
    void preserveMermaidCode() {
        String mermaid = """
                flowchart TD
                    A[03:00 n8n 시작] --> B[GitHub 최신 지침 버전 고정]
                    B --> C[후보 수집 · 기존 발행분과 중복 검사]
                    C --> D[Codex CLI 원문 검증 · 선별 · 작성]
                    D --> E[썸네일 제작 · Rilog S3 업로드]
                    E --> F[원문 대조 · 수량 · 형식 · 이미지 검사]
                    F -->|통과| G[시트 저장 · 재조회 · 자동 승인]
                    F -->|실패| H[대체 후보 또는 보류]
                    G --> I[05:00 Rilog 배치 발행]
                    I --> J[발행 결과 확인 · 실패 기록]""";

        JsonNode converted = converter.convert("```mermaid\n" + mermaid + "\n```");

        assertThat(converted).singleElement().satisfies(block -> {
            assertThat(block.path("type").asString()).isEqualTo("codeBlock");
            assertThat(block.path("props").path("language").asString()).isEqualTo("mermaid");
            assertThat(block.path("content").get(0).path("text").asString()).isEqualTo(mermaid);
        });
    }

    @Test
    @DisplayName("변환된 모든 블록은 댓글과 목차에서 사용할 서로 다른 UUID를 가진다.")
    void assignUniqueBlockIds() {
        JsonNode converted = converter.convert("# 제목\n\n- 항목\n  - 자식\n\n***");

        List<String> ids = new ArrayList<>();
        collectIds(converted, ids);

        assertThat(ids).hasSize(4).doesNotHaveDuplicates().allSatisfy(id ->
                assertThat(UUID.fromString(id).toString()).isEqualTo(id));
    }

    @ParameterizedTest
    @CsvSource(value = {
            "'응답 시간 < 100ms'|'응답 시간 < 100ms'",
            "'1<2 && 3>2'|'1<2 && 3>2'",
            "'\\<span>태그 문자\\</span>'|'<span>태그 문자</span>'"
    }, delimiter = '|')
    @DisplayName("비교 기호와 이스케이프한 꺾쇠는 일반 텍스트로 보존한다.")
    void preserveLiteralAngleBrackets(String markdown, String expectedText) {
        JsonNode converted = converter.convert(markdown);

        assertThat(PostContent.from(converted).extractTextBlocks().getFirst().text()).isEqualTo(expectedText);
    }

    @Test
    @DisplayName("표의 셀 서식과 열 정렬을 기존 BlockNote 표 구조로 보존한다.")
    void preserveTableFormattingAndAlignment() {
        String markdown = """
                | **기능** | 코드 | 출처 |
                | :--- | :---: | ---: |
                | GC | `freeze()` | [원문](https://example.com/gc) |
                """;
        JsonNode expected = MAPPER.readTree("""
                {
                  "type": "tableContent", "columnWidths": [null, null, null], "headerRows": 1, "headerCols": 0,
                  "rows": [
                    {"cells": [
                      {"type": "tableCell", "props": {"backgroundColor": "default", "textColor": "default", "textAlignment": "left", "colspan": 1, "rowspan": 1},
                       "content": [{"type": "text", "text": "기능", "styles": {"bold": true}}]},
                      {"type": "tableCell", "props": {"backgroundColor": "default", "textColor": "default", "textAlignment": "center", "colspan": 1, "rowspan": 1},
                       "content": [{"type": "text", "text": "코드", "styles": {}}]},
                      {"type": "tableCell", "props": {"backgroundColor": "default", "textColor": "default", "textAlignment": "right", "colspan": 1, "rowspan": 1},
                       "content": [{"type": "text", "text": "출처", "styles": {}}]}
                    ]},
                    {"cells": [
                      {"type": "tableCell", "props": {"backgroundColor": "default", "textColor": "default", "textAlignment": "left", "colspan": 1, "rowspan": 1},
                       "content": [{"type": "text", "text": "GC", "styles": {}}]},
                      {"type": "tableCell", "props": {"backgroundColor": "default", "textColor": "default", "textAlignment": "center", "colspan": 1, "rowspan": 1},
                       "content": [{"type": "text", "text": "freeze()", "styles": {"code": true}}]},
                      {"type": "tableCell", "props": {"backgroundColor": "default", "textColor": "default", "textAlignment": "right", "colspan": 1, "rowspan": 1},
                       "content": [{"type": "link", "href": "https://example.com/gc", "content": [{"type": "text", "text": "원문", "styles": {}}]}]}
                    ]}
                  ]
                }
                """);

        JsonNode converted = converter.convert(markdown);

        assertThat(converted.get(0).path("type").asString()).isEqualTo("table");
        assertThat(converted.get(0).path("content")).isEqualTo(expected);
    }

    @Test
    @DisplayName("표 셀의 이스케이프한 파이프를 열 구분자로 나누지 않고 코드와 강조 안에도 보존한다.")
    void preserveEscapedPipesInTableCells() {
        String markdown = """
                | f\\|oo |
                | --- |
                | `\\|` **\\|** |
                """;
        JsonNode expected = MAPPER.readTree("""
                [{"type":"text","text":"|","styles":{"code":true}},
                 {"type":"text","text":" ","styles":{}},
                 {"type":"text","text":"|","styles":{"bold":true}}]
                """);

        JsonNode converted = converter.convert(markdown);

        JsonNode rows = converted.get(0).path("content").path("rows");
        assertThat(rows.get(0).path("cells").get(0).path("content").get(0).path("text").asString())
                .isEqualTo("f|oo");
        assertThat(rows.get(1).path("cells")).hasSize(1);
        assertThat(rows.get(1).path("cells").get(0).path("content")).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "이름 | 값\n--- | ---\n하나 | 둘",
            "| 이름 | 값\n--- | --- |\n하나 | 둘 |"
    })
    @DisplayName("양끝 파이프를 생략한 표도 두 열의 셀 내용으로 변환한다.")
    void convertTablesWithoutOuterPipes(String markdown) {
        JsonNode converted = converter.convert(markdown);

        JsonNode cells = converted.get(0).path("content").path("rows").get(1).path("cells");
        assertThat(cells).hasSize(2);
        assertThat(cells.get(0).path("content").get(0).path("text").asString()).isEqualTo("하나");
        assertThat(cells.get(1).path("content").get(0).path("text").asString()).isEqualTo("둘");
    }

    @Test
    @DisplayName("표의 부족한 셀은 빈 셀로 채워 열 수를 유지한다.")
    void padShortTableRows() {
        JsonNode converted = converter.convert("| 이름 | 값 |\n| --- | --- |\n| 하나 |");

        JsonNode cells = converted.get(0).path("content").path("rows").get(1).path("cells");
        assertThat(cells).hasSize(2);
        assertThat(cells.get(1).path("content")).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({"'## 다음 제목', heading", "'다음 문장', paragraph"})
    @DisplayName("표 앞 문단과 표 뒤 제목 및 문단을 독립된 블록으로 보존한다.")
    void preserveBlocksSurroundingTable(String followingBlock, String followingType) {
        String markdown = """
                소개 문장
                | 이름 | 값 |
                | --- | --- |
                | 하나 | 둘 |
                %s

                마지막 문장
                """.formatted(followingBlock);

        JsonNode converted = converter.convert(markdown);

        List<String> types = new ArrayList<>();
        converted.forEach(block -> types.add(block.path("type").asString()));
        assertThat(types).containsExactly("paragraph", "table", followingType, "paragraph");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "| 이름 | 값 |\n| --- |\n| 하나 | 둘 |",
            "| 이름 | 값 |\n| --- | --- |\n| 하나 | 둘 | 초과 셀 |"
    })
    @DisplayName("표의 열 수가 맞지 않아 내용을 버려야 하는 입력은 변환하지 않는다.")
    void rejectTablesThatWouldLoseCells(String markdown) {
        assertThatThrownBy(() -> converter.convert(markdown))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\n\t"})
    @DisplayName("비어 있는 Markdown은 발행할 본문으로 변환하지 않는다.")
    void rejectEmptyMarkdown(String markdown) {
        assertThatThrownBy(() -> converter.convert(markdown))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "[원문](javascript:alert(1))", "[원문](data:text/html,content)",
            "![사진](https://example.com/image.png)", "<script>alert(1)</script>",
            "<span title=\"1 < 2\">본문</span>", "</span>", "<!-- 주석 -->", "<!doctype html>",
            "##### 지원하지 않는 제목", "```java\n닫히지 않은 코드",
            "| 제목 | 값 |\n| --- | --- |\n| 하나 | [원문](javascript:alert(1)) |", "- [x] 미지원 체크 목록",
            "밑줄 제목\n===", "[참조 링크][source]"
    })
    @DisplayName("위험한 링크와 지원하지 않는 구조는 내용을 유실하며 발행하지 않는다.")
    void rejectUnsafeOrUnsupportedMarkdown(String markdown) {
        assertThatThrownBy(() -> converter.convert(markdown))
                .isInstanceOf(PostException.class)
                .hasMessage(INVALID_POST_CONTENT.getMessage());
    }

    private String resource(String name) throws IOException {
        try (var stream = getClass().getResourceAsStream("/therilog/" + name)) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private JsonNode withoutIds(JsonNode source) {
        JsonNode copy = source.deepCopy();
        removeIds(copy);
        return copy;
    }

    private void removeIds(JsonNode node) {
        if (node instanceof ObjectNode object) {
            object.remove("id");
        }
        node.forEach(this::removeIds);
    }

    private void collectIds(JsonNode blocks, List<String> ids) {
        for (JsonNode block : blocks) {
            ids.add(block.path("id").asString());
            collectIds(block.path("children"), ids);
        }
    }
}
