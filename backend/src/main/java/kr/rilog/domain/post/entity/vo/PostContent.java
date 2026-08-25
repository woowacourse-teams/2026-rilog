package kr.rilog.domain.post.entity.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import kr.rilog.domain.post.exception.PostException;
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

    private static final String TYPE = "type";
    private static final String PROPS = "props";
    private static final String URL = "url";
    private static final Set<String> FILE_BLOCK_TYPES = Set.of("image", "file");

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content", columnDefinition = "jsonb", nullable = false)
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

}
