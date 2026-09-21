package kr.rilog.domain.comment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.domain.post.entity.vo.TextRange;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Set;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_BLOCK_NOT_COMMENTABLE;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;

@Getter
@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommentAnchorSelection {

    private static final Set<String> COMMENTABLE_BLOCK_TYPES = Set.of("paragraph", "heading", "quote");

    @Column(name = "block_id", nullable = false)
    private String blockId;

    @Embedded
    private TextRange range;

    @Column(
            name = "selected_text",
            nullable = false,
            columnDefinition = "text"
    )
    private String selectedText;

    private CommentAnchorSelection(String blockId, TextRange range, String selectedText) {
        validateValues(blockId, range, selectedText);
        this.blockId = blockId;
        this.range = range;
        this.selectedText = selectedText;
    }

    public static CommentAnchorSelection select(
            TextBlock block,
            int startOffset,
            int endOffset,
            String selectedText
    ) {
        if (block == null) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }

        if (!COMMENTABLE_BLOCK_TYPES.contains(block.type())) {
            throw new CommentException(COMMENT_ANCHOR_BLOCK_NOT_COMMENTABLE);
        }

        TextRange range = TextRange.of(startOffset, endOffset);
        if (!block.slice(range).equals(selectedText)) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }

        return new CommentAnchorSelection(block.blockId(), range, selectedText);
    }

    public static CommentAnchorSelection of(
            String blockId,
            int startOffset,
            int endOffset,
            String selectedText
    ) {
        return new CommentAnchorSelection(blockId, TextRange.of(startOffset, endOffset), selectedText);
    }

    public CommentAnchorSelection relocate(TextRange newRange) {
        return new CommentAnchorSelection(blockId, newRange, selectedText);
    }

    private static void validateValues(String blockId, TextRange range, String selectedText) {
        if (blockId == null || blockId.isBlank()
                || range == null
                || selectedText == null
                || selectedText.isEmpty()
                || selectedText.length() != range.length()) {
            throw new CommentException(INVALID_COMMENT_ANCHOR);
        }
    }

}
