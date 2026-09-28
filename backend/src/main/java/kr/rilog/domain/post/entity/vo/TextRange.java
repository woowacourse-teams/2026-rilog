package kr.rilog.domain.post.entity.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import kr.rilog.domain.post.exception.PostException;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_TEXT_RANGE;

@Getter
@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TextRange {

    @Column(name = "start_offset", nullable = false)
    private int startOffset;

    @Column(name = "end_offset", nullable = false)
    private int endOffset;

    private TextRange(int startOffset, int endOffset) {
        validate(startOffset, endOffset);
        this.startOffset = startOffset;
        this.endOffset = endOffset;
    }

    public static TextRange of(int startOffset, int endOffset) {
        return new TextRange(startOffset, endOffset);
    }

    public int length() {
        return endOffset - startOffset;
    }

    private void validate(int startOffset, int endOffset) {
        if (startOffset < 0 || startOffset >= endOffset) {
            throw new PostException(INVALID_TEXT_RANGE);
        }
    }

}
