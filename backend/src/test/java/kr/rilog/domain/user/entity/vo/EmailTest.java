package kr.rilog.domain.user.entity.vo;

import kr.rilog.domain.user.exception.UserErrorInformation;
import kr.rilog.domain.user.exception.UserException;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class EmailTest {

    @Test
    @DisplayName("이메일 형식이고 256자 이하인 이메일은 사용가능하다.")
    void emailFormatAndUnderThanTwoHundredFiftySixEmailIsAvailable() {
        // given
        String email = "riro@example.com";

        // when
        Email savedEmail = Email.from(email);

        // then
        Assertions.assertThat(savedEmail.getValue()).isEqualTo(email);
    }

    @Test
    @DisplayName("대문자와 앞뒤 공백이 포함된 이메일은 소문자로 저장하고 앞뒤 공백을 제거한다.")
    void uppercaseAndSurroundedBlankEmailIsSavedAsLowercaseStrippedValue() {
        // given
        String email = " Riro@Example.com ";

        // when
        Email savedEmail = Email.from(email);

        // then
        Assertions.assertThat(savedEmail.getValue()).isEqualTo("riro@example.com");
    }

    @Test
    @DisplayName("이메일 형식이 아닌 이메일은 예외가 발생한다.")
    void throwExceptionWhenEmailFormatIsInvalid() {
        // given
        String invalidEmail = "riro.example.com";

        // when & then
        Assertions.assertThatThrownBy(() -> Email.from(invalidEmail))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_EMAIL.getMessage());
    }

    @Test
    @DisplayName("256자 초과의 이메일은 예외가 발생한다.")
    void throwExceptionWhenEmailLengthOverThanTwoHundredFiftySix() {
        // given
        String longEmail = "a".repeat(245) + "@example.com";

        // when & then
        Assertions.assertThatThrownBy(() -> Email.from(longEmail))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_EMAIL.getMessage());
    }

    @Test
    @DisplayName("null인 이메일은 예외가 발생한다.")
    void throwExceptionWhenEmailIsNull() {
        // given
        String nullEmail = null;

        // when & then
        Assertions.assertThatThrownBy(() -> Email.from(nullEmail))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_EMAIL.getMessage());
    }

    @Test
    @DisplayName("비어있는 이메일은 예외가 발생한다.")
    void throwExceptionWhenEmailIsBlank() {
        // given
        String blankEmail = "";

        // when & then
        Assertions.assertThatThrownBy(() -> Email.from(blankEmail))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_EMAIL.getMessage());
    }

}
