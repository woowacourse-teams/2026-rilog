package kr.rilog.domain.user.entity.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import kr.rilog.domain.user.exception.UserException;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import static kr.rilog.domain.user.exception.UserErrorInformation.INVALID_NICKNAME;

@Getter
@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Nickname {

    private static final int MIN_LENGTH = 2;
    private static final int MAX_LENGTH = 20;

    @Column(name = "nickname", length = MAX_LENGTH, unique = true)
    private String value;

    private Nickname(String value) {
        validate(value);
        this.value = value.strip();
    }

    public static Nickname from(String value) {
        return new Nickname(value);
    }

    private void validate(String value) {
        if (value == null || value.isBlank()) {
            throw new UserException(INVALID_NICKNAME);
        }

        String strippedValue = value.strip();
        if (strippedValue.length() < MIN_LENGTH || strippedValue.length() > MAX_LENGTH) {
            throw new UserException(INVALID_NICKNAME);
        }
    }

}
