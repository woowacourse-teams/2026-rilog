package kr.rilog.domain.blog.entity.vo;

import kr.rilog.domain.user.exception.UserErrorInformation;
import kr.rilog.domain.user.exception.UserException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.AssertionsForClassTypes.*;

class SlugTest {

    @Test
    @DisplayName("4-20자 사이이고 허용 문자로 구성된 슬러그는 사용가능하다.")
    void slugSuccessTest() {
        // given
        String slugText = "rilog";

        // when & then
        assertThatCode(() -> Slug.from(slugText))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("대문자가 들어와도, 슬러그는 소문자로 저장된다.")
    void shouldApplyLowerCaseInSlug() {
        // given
        String upperSlug = "UPPERSLUG";

        // when
        Slug slug = Slug.from(upperSlug);

        // then
        assertThat(slug.getValue()).isEqualTo(upperSlug.toLowerCase());
    }

    @Test
    @DisplayName("앞뒤 공백이 포함된 슬러그는 앞뒤 공백을 제거한다.")
    void surroundedBlankSlugIsSavedAsStrippedValue() {
        // given
        String slug = " rilog-01 ";

        // when
        Slug savedSlug = Slug.from(slug);

        // then
        assertThat(savedSlug.getValue()).isEqualTo("rilog-01");
    }

    @Test
    @DisplayName("4자 미만의 슬러그는 예외가 발생한다.")
    void throwExceptionWhenSlugLengthLessThanFour() {
        // given
        String shortSlug = "abc";

        // when & then
        assertThatThrownBy(() -> Slug.from(shortSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_SLUG.getMessage());
    }

    @Test
    @DisplayName("20자 초과의 슬러그는 예외가 발생한다.")
    void throwExceptionWhenSlugLengthOverThanTwenty() {
        // given
        String longSlug = "123456789012345678901";

        // when & then
        assertThatThrownBy(() -> Slug.from(longSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_SLUG.getMessage());
    }

    @Test
    @DisplayName("허용되지 않은 문자가 포함된 슬러그는 예외가 발생한다.")
    void throwExceptionWhenSlugContainsInvalidCharacter() {
        // given
        String invalidSlug = "ri.log-";

        // when & then
        assertThatThrownBy(() -> Slug.from(invalidSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_SLUG.getMessage());
    }

    @Test
    @DisplayName("null인 슬러그는 예외가 발생한다.")
    void throwExceptionWhenSlugIsNull() {
        // given
        String nullSlug = null;

        // when & then
        assertThatThrownBy(() -> Slug.from(nullSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_SLUG.getMessage());
    }

    @Test
    @DisplayName("비어있는 슬러그는 예외가 발생한다.")
    void throwExceptionWhenSlugIsBlank() {
        // given
        String blankSlug = "";

        // when & then
        assertThatThrownBy(() -> Slug.from(blankSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(UserErrorInformation.INVALID_SLUG.getMessage());
    }

    @Test
    @DisplayName("서로 다른 슬러그에 different()를 사용하면 True를 반환한다.")
    void isDifferent() {
        // given
        Slug slug1 = Slug.from("rilog-01");
        Slug slug2 = Slug.from("rilog-02");

        // when
        boolean result = slug1.isDifferent(slug2);

        // then
        assertThat(result).isTrue();
    }

}
