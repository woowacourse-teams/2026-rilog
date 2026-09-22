package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.exception.PostException;

import static kr.rilog.domain.post.exception.PostErrorInformation.*;

public record TextBlock(
        String blockId,
        String type,
        String text
) {

    public TextBlock {
        if (blockId == null || blockId.isBlank()
                || type == null || type.isBlank()
                || text == null) {
            throw new PostException(INVALID_TEXT_BLOCK); // TODO change INVALID_TEXT_BLOCK
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

    public String slice(TextRange range) {
        if (range.getEndOffset() > text.length()) {
            throw new PostException(INVALID_TEXT_RANGE);
        }

        return text.substring(range.getStartOffset(), range.getEndOffset());
    }

}
