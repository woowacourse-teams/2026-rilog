package kr.rilog.domain.user.entity.vo;

import kr.rilog.domain.user.exception.UserErrorInformation;
import kr.rilog.domain.user.exception.UserException;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NicknameTest {

    @Test
    @DisplayName("2-20자 사이의 닉네임은 사용가능하다.")
    void betweenTwoToTwentyNicknameIsAvailable() {
        // given
        String twoLength = "hi";
        String twentyLength = "12345678901234567890";

        // when
        Nickname twoLengthNickname = Nickname.from(twoLength);
        Nickname twentyLengthNickname = Nickname.from(twentyLength);

        // then
        Assertions.assertThat(twoLengthNickname.getValue()).isEqualTo(twoLength);
        Assertions.assertThat(twentyLengthNickname.getValue()).isEqualTo(twentyLength);
    }

    @Test
    @DisplayName("2자 미만의 닉네임은 예외가 발생한다.")
    void throwExceptionWhenNicknameLengthLessThanTwo() {
        // given
        String shortNickname = "n";

        // when & then
        Assertions.assertThatThrownBy(() -> Nickname.from(shortNickname))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_NICKNAME.getMessage());
    }

    @Test
    @DisplayName("20자 초과의 닉네임은 예외가 발생한다.")
    void throwExceptionWhenNicknameLengthOverThanTwenty() {
        // given
        String longNickname = "WrongNickOverThenTwenty";

        // when & then
        Assertions.assertThatThrownBy(() -> Nickname.from(longNickname))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_NICKNAME.getMessage());
    }

    @Test
    @DisplayName("null인 닉네임은 예외가 발생한다.")
    void throwExceptionWhenNicknameIsNull() {
        // given
        String nullNickName = null;

        // when & then
        Assertions.assertThatThrownBy(() -> Nickname.from(nullNickName))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_NICKNAME.getMessage());
    }

    @Test
    @DisplayName("null인이거나 비어있는 닉네임은 예외가 발생한다.")
    void throwExceptionWhenNicknameIsBlank() {
        // given
        String blankNickName = "";

        // when & then
        Assertions.assertThatThrownBy(() -> Nickname.from(blankNickName))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_NICKNAME.getMessage());
    }

}
