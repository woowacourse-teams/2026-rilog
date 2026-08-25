package kr.rilog.support.fixure;

import kr.rilog.domain.post.entity.vo.PostContent;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public class PostContentFixture {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static final String IMAGE_URL_A =
            "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/rilog/images/originals/aaa.png";
    public static final String IMAGE_URL_B =
            "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/rilog/images/originals/bbb.png";
    public static final String FILE_URL =
            "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/rilog/files/ccc.pdf";

    public static String imageBlock(String url) {
        return """
                {
                  "id": "img-1",
                  "type": "image",
                  "props": { "name": "image.png", "url": "%s", "caption": "", "showPreview": true },
                  "children": []
                }
                """.formatted(url);
    }

    public static String fileBlock(String url) {
        return """
                {
                  "id": "file-1",
                  "type": "file",
                  "props": { "name": "spec.pdf", "url": "%s", "caption": "" },
                  "children": []
                }
                """.formatted(url);
    }

    public static String paragraph(String text) {
        return """
                {
                  "id": "p-1",
                  "type": "paragraph",
                  "props": { "textAlignment": "left" },
                  "content": [ { "type": "text", "text": "%s", "styles": {} } ],
                  "children": []
                }
                """.formatted(text);
    }

    /** 토글 — children 안에 블록이 통째로 들어간다 */
    public static String toggle(String... children) {
        return """
                {
                  "id": "toggle-1",
                  "type": "toggleListItem",
                  "props": { "textAlignment": "left" },
                  "content": [ { "type": "text", "text": "토글", "styles": {} } ],
                  "children": [ %s ]
                }
                """.formatted(String.join(",", children));
    }

    /** 표 — content가 배열이 아니라 객체다 */
    public static String table() {
        return """
                {
                  "id": "table-1",
                  "type": "table",
                  "props": { "textColor": "default" },
                  "content": {
                    "type": "tableContent",
                    "columnWidths": [ null, null ],
                    "rows": [
                      { "cells": [
                          { "type": "tableCell",
                            "content": [ { "type": "text", "text": "칸1", "styles": {} } ],
                            "props": { "colspan": 1, "rowspan": 1 } }
                      ] }
                    ]
                  },
                  "children": []
                }
                """;
    }

    public static String divider() {
        return """
                { "id": "div-1", "type": "divider", "props": {}, "children": [] }
                """;
    }

    // --- 조립 ---

    public static PostContent content(String... blocks) {
        return PostContent.from(readTree("[" + String.join(",", blocks) + "]"));
    }

    public static JsonNode readTree(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (Exception e) {
            throw new IllegalStateException("테스트 JSON이 잘못됐다: " + json, e);
        }
    }

}
