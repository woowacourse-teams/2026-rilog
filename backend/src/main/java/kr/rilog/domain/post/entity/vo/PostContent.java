package kr.rilog.domain.post.entity.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import tools.jackson.databind.JsonNode;

import java.util.*;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;

@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostContent {

    private static final String ID = "id";
    private static final String CONTENT = "content";
    private static final String CHILDREN = "children";
    private static final String TEXT = "text";
    private static final String TEXT_INLINE_TYPE = "text";
    private static final String LINK_INLINE_TYPE = "link";
    private static final String TYPE = "type";
    private static final String PROPS = "props";
    private static final String URL = "url";
    private static final Set<String> FILE_BLOCK_TYPES = Set.of("image", "file");

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content", columnDefinition = "json", nullable = false)
    private JsonNode value;

    private PostContent(JsonNode value) {
        this.value = value;
    }

    public static PostContent from(JsonNode value) {
        if (value == null || !value.isArray()) {
            throw new PostException(INVALID_POST_CONTENT);
        }
        return new PostContent(value);
    }

    public List<String> fileUrlsNotIn(PostContent newContent) {
        Set<String> remaining = new HashSet<>(newContent.extractFileUrls());
        return extractFileUrls().stream()
                .filter(url -> !remaining.contains(url))
                .toList();
    }

    public TagAssets extractTagAssets() {
        List<String> strings = extractFileUrls();
        return TagAssets.from(strings);
    }

    public List<String> extractFileUrls() {
        Set<String> urls = new LinkedHashSet<>();
        collect(value, urls);
        return List.copyOf(urls);
    }

    private void collect(JsonNode node, Set<String> urls) {
        if (isFileBlock(node)) {
            readUrl(node).ifPresent(urls::add);
        }
        for (JsonNode child : node) {
            collect(child, urls);
        }
    }

    private boolean isFileBlock(JsonNode node) {
        return node.isObject()
                && FILE_BLOCK_TYPES.contains(node.path(TYPE).asString(""));
    }

    private Optional<String> readUrl(JsonNode node) {
        JsonNode url = node.path(PROPS).path(URL);
        if (!url.isString() || url.asString().isBlank()) {
            return Optional.empty();
        }
        return Optional.of(url.asString());
    }

    public JsonNode getContent() {
        return value;
    }

    private void appendInlineContent(
            JsonNode inlineContent,
            StringBuilder result
    ) {
        if (!inlineContent.isObject()) {
            throw new PostException(INVALID_POST_CONTENT);
        }

        String type = extractStringField(inlineContent, TYPE);
        switch (type) {
            case TEXT_INLINE_TYPE -> appendText(inlineContent, result);
            case LINK_INLINE_TYPE -> appendLinkText(inlineContent, result);
            default -> throw new PostException(INVALID_POST_CONTENT);
        }
    }

    private void appendLinkText(JsonNode linkContent, StringBuilder result) {
        JsonNode contents = linkContent.get(CONTENT);
        if (contents == null || !contents.isArray()) {
            throw new PostException(INVALID_POST_CONTENT);
        }

        for (JsonNode content : contents) {
            if (!content.isObject()) {
                throw new PostException(INVALID_POST_CONTENT);
            }

            String type = extractStringField(content, TYPE);
            if (!TEXT_INLINE_TYPE.equals(type)) {
                throw new PostException(INVALID_POST_CONTENT);
            }

            appendText(content, result);
        }
    }

    private void appendText(JsonNode textContent, StringBuilder result) {
        result.append(extractStringField(textContent, TEXT));
    }

    public String extractStringField(JsonNode node, String fieldName) {
        JsonNode field = node.get(fieldName);
        if (field == null || !field.isString()) {
            throw new PostException(INVALID_POST_CONTENT);
        }

        return field.asString();
    }

    private String readBlockId(JsonNode block) {
        JsonNode id = block.get(ID);
        if (id == null || !id.isString() || id.asString().isBlank()) {
            throw new PostException(INVALID_POST_CONTENT);
        }

        return id.asString();
    }

}
