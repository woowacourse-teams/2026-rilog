package kr.rilog.domain.post.view;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class ViewerCookieResolverTest {

    private final ViewerCookieResolver resolver = new ViewerCookieResolver(
            new PostViewRegistrationProperties(true, true, "Lax"));

    @Test
    @DisplayName("로그인 사용자는 방문자 쿠키 대신 계정으로 식별한다.")
    void memberUsesAuthenticatedIdentity() {
        // given
        String cookie = "2dfd630c-698a-499f-960b-842626fc0387";

        // when
        var resolved = resolver.resolve(7L, cookie);

        // then
        assertThat(resolved).isEqualTo(new ViewerCookieResolver.ResolvedViewer(ViewerIdentity.member(7), null));
    }

    @Test
    @DisplayName("유효한 비회원 쿠키는 새로 발급하지 않고 재사용한다.")
    void validAnonymousCookieIsReused() {
        // given
        UUID id = UUID.fromString("2dfd630c-698a-499f-960b-842626fc0387");

        // when
        var resolved = resolver.resolve(null, id.toString());

        // then
        assertThat(resolved).isEqualTo(new ViewerCookieResolver.ResolvedViewer(ViewerIdentity.anonymous(id), null));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"bad", "1-1-1-1-1", "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz"})
    @DisplayName("방문자 쿠키가 없거나 유효하지 않으면 보안 속성을 가진 30일 쿠키를 발급한다.")
    void missingOrMalformedCookieIsReplaced(String value) {
        // when
        var resolved = resolver.resolve(null, value);

        // then
        var cookie = resolved.cookie();
        assertThat(cookie).isNotNull();
        assertSoftly(softly -> {
            softly.assertThat(resolved.identity()).isEqualTo(ViewerIdentity.anonymous(UUID.fromString(cookie.getValue())));
            softly.assertThat(cookie.getName()).isEqualTo(ViewerCookieResolver.COOKIE_NAME);
            softly.assertThat(cookie.isHttpOnly()).isTrue();
            softly.assertThat(cookie.isSecure()).isTrue();
            softly.assertThat(cookie.getSameSite()).isEqualTo("Lax");
            softly.assertThat(cookie.getPath()).isEqualTo("/v1");
            softly.assertThat(cookie.getMaxAge()).isEqualTo(Duration.ofDays(30));
        });
    }
}
