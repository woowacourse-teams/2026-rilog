package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.exception.PostException;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;

public record TextBlock(
        String blockId,
        String text
) {

    public TextBlock {
        if (blockId == null || blockId.isBlank() || text == null) {
            throw new PostException(INVALID_POST_CONTENT);
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
            throw new PostException(INVALID_POST_CONTENT);
        }

        return text.substring(startOffset, endOffset);
    }

}
