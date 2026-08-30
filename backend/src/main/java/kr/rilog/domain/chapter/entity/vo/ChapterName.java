package kr.rilog.domain.chapter.entity.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import kr.rilog.domain.chapter.exception.ChapterException;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.INVALID_CHAPTER_NAME;

@Getter
@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChapterName {

    private static final int MAX_LENGTH = 20;

    @Column(name = "name", nullable = false, length = MAX_LENGTH)
    private String value;

    private ChapterName(String value) {
        String normalized = normalize(value);
        validate(normalized);
        this.value = normalized;
    }

    public static ChapterName from(String value) {
        return new ChapterName(value);
    }

    private static String normalize(String value) {
        return value == null ? null : value.strip();
    }

    private static void validate(String value) {
        if (value == null || value.isBlank() || value.length() > MAX_LENGTH) {
            throw new ChapterException(INVALID_CHAPTER_NAME);
        }
    }

}
