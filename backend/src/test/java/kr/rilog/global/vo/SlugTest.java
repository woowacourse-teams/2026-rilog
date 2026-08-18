package kr.rilog.global.vo;

import kr.rilog.domain.blog.entity.Slug;
import kr.rilog.domain.user.exception.UserErrorInformation;
import kr.rilog.domain.user.exception.UserException;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SlugTest {

    @Test
    @DisplayName("대문자가 들어와도, 슬러그는 소문자로 저장된다.")
    void shouldApplyLowerCaseInSlug() {
        // given
        String upperSlug = "UPPERSLUG";

        // when
        Slug slug = Slug.from(upperSlug);

        // then
        Assertions.assertThat(slug.getValue()).isEqualTo(upperSlug.toLowerCase());
    }

    @Test
    @DisplayName("4-20자 사이이고 허용 문자로 구성된 슬러그는 사용가능하다.")
    void betweenFourToTwentyAndAllowedCharactersSlugIsAvailable() {
        // given
        String fourLength = "ab1_";
        String twentyLength = "12345678901234567890";

        // when
        Slug fourLengthSlug = Slug.from(fourLength);
        Slug twentyLengthSlug = Slug.from(twentyLength);

        // then
        Assertions.assertThat(fourLengthSlug.getValue()).isEqualTo(fourLength);
        Assertions.assertThat(twentyLengthSlug.getValue()).isEqualTo(twentyLength);
    }

    @Test
    @DisplayName("앞뒤 공백이 포함된 슬러그는 앞뒤 공백을 제거한다.")
    void surroundedBlankSlugIsSavedAsStrippedValue() {
        // given
        String slug = " rilog-01 ";

        // when
        Slug savedSlug = Slug.from(slug);

        // then
        Assertions.assertThat(savedSlug.getValue()).isEqualTo("rilog-01");
    }

    @Test
    @DisplayName("4자 미만의 슬러그는 예외가 발생한다.")
    void throwExceptionWhenSlugLengthLessThanFour() {
        // given
        String shortSlug = "abc";

        // when & then
        Assertions.assertThatThrownBy(() -> Slug.from(shortSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_SLUG.getMessage());
    }

    @Test
    @DisplayName("20자 초과의 슬러그는 예외가 발생한다.")
    void throwExceptionWhenSlugLengthOverThanTwenty() {
        // given
        String longSlug = "123456789012345678901";

        // when & then
        Assertions.assertThatThrownBy(() -> Slug.from(longSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_SLUG.getMessage());
    }

    @Test
    @DisplayName("허용되지 않은 문자가 포함된 슬러그는 예외가 발생한다.")
    void throwExceptionWhenSlugContainsInvalidCharacter() {
        // given
        String invalidSlug = "ri.log";

        // when & then
        Assertions.assertThatThrownBy(() -> Slug.from(invalidSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_SLUG.getMessage());
    }

    @Test
    @DisplayName("null인 슬러그는 예외가 발생한다.")
    void throwExceptionWhenSlugIsNull() {
        // given
        String nullSlug = null;

        // when & then
        Assertions.assertThatThrownBy(() -> Slug.from(nullSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_SLUG.getMessage());
    }

    @Test
    @DisplayName("비어있는 슬러그는 예외가 발생한다.")
    void throwExceptionWhenSlugIsBlank() {
        // given
        String blankSlug = "";

        // when & then
        Assertions.assertThatThrownBy(() -> Slug.from(blankSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_SLUG.getMessage());
    }

}
