package kr.rilog.domain.post.entity.vo;

import java.util.Objects;

public record TextBlock(
        String blockId,
        String text
) {

    public TextBlock {
        Objects.requireNonNull(blockId, "blockId는 null일 수 없습니다.");
        Objects.requireNonNull(text, "text는 null일 수 없습니다.");

        if (blockId.isBlank()) {
            throw new IllegalArgumentException("blockId는 비어 있을 수 없습니다."); // TODO use RilogException
        }
    }

    /**
     * NOTE
     * JavaScript string.length와 같은 offset 기준을 위해
     * Java String의 length()는 UTF-16 code unit 개수를 반환.
     */
    public int utf16Length() {
        return text.length();
    }

    public String slice(int startOffset, int endOffset) {
        if (startOffset < 0 || endOffset < startOffset || endOffset > text.length()) {
            throw new IllegalArgumentException(
                    "유효하지 않은 offset 범위입니다: [%d, %d), length=%d"
                            .formatted(startOffset, endOffset, text.length())); // TODO use RilogException
        }

        return text.substring(startOffset, endOffset);
    }

}
