package kr.rilog.domain.post.entity.vo;

import kr.rilog.domain.post.exception.PostException;

import java.util.Set;

import static kr.rilog.domain.post.exception.PostErrorInformation.*;

public record TextBlock(
        String blockId,
        String type,
        String text
) {

    private static final Set<String> COMMENTABLE_BLOCK_TYPES =
            Set.of("paragraph", "heading", "quote", "bulletListItem", "numberedListItem", "checkListItem", "toggleListItem");

    public TextBlock {
        if (blockId == null || blockId.isBlank()
                || type == null || type.isBlank()
                || text == null) {
            throw new PostException(INVALID_TEXT_BLOCK);
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

    public TextBlockDiff calculateDifference(TextBlock updated) {
        if (updated == null) {
            throw new IllegalArgumentException("수정된 텍스트 블록(비교대상)이 존재하지 않습니다.");
        }

        if (!blockId.equals(updated.blockId())) {
            throw new IllegalArgumentException("서로 다른 blockId는 비교할 수 없습니다.");
        }

        int prefixLength = commonPrefixLength(text, updated.text());

        return new TextBlockDiff(
                blockId,
                DiffSpan.slice(text, 0, prefixLength),
                DiffSpan.slice(text, prefixLength, text.length()),
                DiffSpan.slice(updated.text(), prefixLength, updated.text().length())
        );
    }

    private static int commonPrefixLength(String previous, String updated) {
        int limit = Math.min(previous.length(), updated.length());
        int index = 0;

        while (index < limit && previous.charAt(index) == updated.charAt(index)) {
            index++;
        }

        return index;
    }

    public boolean isCommentableBlock() {
        return COMMENTABLE_BLOCK_TYPES.contains(type);
    }

}
