package kr.rilog.domain.user.entity.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import kr.rilog.domain.user.exception.UserException;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.regex.Pattern;

import static kr.rilog.domain.user.exception.UserErrorInformation.INVALID_EMAIL;

@Getter
@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Email {

    private static final int MAX_LENGTH = 256;
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );

    @Column(name = "email", length = MAX_LENGTH)
    private String value;

    private Email(String value) {
        validate(value);
        this.value = value.strip().toLowerCase();
    }

    public static Email from(String value) {
        return new Email(value);
    }

    private void validate(String value) {
        if (value == null || value.isBlank()) {
            throw new UserException(INVALID_EMAIL);
        }

        String strippedValue = value.strip();

        if (strippedValue.length() > MAX_LENGTH) {
            throw new UserException(INVALID_EMAIL);
        }

        if (!EMAIL_PATTERN.matcher(strippedValue).matches()) {
            throw new UserException(INVALID_EMAIL);
        }
    }

}
