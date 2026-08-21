package kr.rilog.domain.blog.entity.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import kr.rilog.domain.user.exception.UserException;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.regex.Pattern;

import static kr.rilog.domain.user.exception.UserErrorInformation.INVALID_SLUG;

@Getter
@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Slug {

    private static final int MIN_LENGTH = 4;
    private static final int MAX_LENGTH = 20;
    private static final Pattern SLUG_PATTERN = Pattern.compile("^[A-Za-z0-9_-]+$");

    @Column(name = "slug", length = MAX_LENGTH, unique = true)
    private String value;

    private Slug(String value) {
        validate(value);
        this.value = value.toLowerCase().strip();
    }

    public static Slug from(String value) {
        return new Slug(value);
    }

    private void validate(String value) {
        if (value == null || value.isBlank()) {
            throw new UserException(INVALID_SLUG);
        }

        String strippedValue = value.strip();

        if (strippedValue.length() < MIN_LENGTH || strippedValue.length() > MAX_LENGTH) {
            throw new UserException(INVALID_SLUG);
        }

        if (!SLUG_PATTERN.matcher(strippedValue).matches()) {
            throw new UserException(INVALID_SLUG);
        }
    }

}
