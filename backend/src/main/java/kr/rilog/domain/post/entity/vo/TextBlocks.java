package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.exception.PostException;
import lombok.EqualsAndHashCode;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;
import static kr.rilog.domain.post.exception.PostErrorInformation.TEXT_BLOCK_NOT_FOUND;

@EqualsAndHashCode
public final class TextBlocks {

    private final Map<String, TextBlock> values;

    private TextBlocks(Map<String, TextBlock> values) {
        this.values = Collections.unmodifiableMap(
                new LinkedHashMap<>(values)
        );
    }

    public static TextBlocks from(Collection<TextBlock> textBlocks) {
        if (textBlocks == null) {
            throw new PostException(INVALID_POST_CONTENT);
        }

        LinkedHashMap<String, TextBlock> values = new LinkedHashMap<>();
        for (TextBlock textBlock : textBlocks) {
            if (textBlock == null) {
                throw new PostException(INVALID_POST_CONTENT);
            }

            TextBlock duplicated = values.putIfAbsent(
                    textBlock.blockId(),
                    textBlock
            );

            if (duplicated != null) {
                throw new PostException(INVALID_POST_CONTENT);
            }
        }

        return new TextBlocks(values);
    }

    public TextBlocks matching(Set<String> blockIds) {
        if (blockIds == null) {
            throw new PostException(INVALID_POST_CONTENT);
        }

        LinkedHashMap<String, TextBlock> matched = new LinkedHashMap<>();
        for (Map.Entry<String, TextBlock> entry : values.entrySet()) {
            if (blockIds.contains(entry.getKey())) {
                matched.put(entry.getKey(), entry.getValue());
            }
        }

        return new TextBlocks(matched);
    }

    public Optional<TextBlock> find(String blockId) {
        return Optional.ofNullable(values.get(blockId));
    }

    public TextBlock get(String blockId) {
        return find(blockId)
                .orElseThrow(() -> new PostException(TEXT_BLOCK_NOT_FOUND));
    }

}
