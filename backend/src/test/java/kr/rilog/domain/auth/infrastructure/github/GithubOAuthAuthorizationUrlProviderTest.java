package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class GithubOAuthAuthorizationUrlProviderTest {

    @Test
    @DisplayName("GitHub OAuth 인증 URL을 생성한다")
    void createAuthorizationUriBuildsGithubAuthorizationUri() {
        // given
        GithubOAuthAuthorizationUrlProvider provider = new GithubOAuthAuthorizationUrlProvider(properties());

        // when
        URI redirectUri = provider.createAuthorizationUri("oauth-state");

        // then
        MultiValueMap<String, String> queryParams = UriComponentsBuilder.fromUri(redirectUri)
                .build()
                .getQueryParams();

        assertThat(provider.provider()).isEqualTo(SocialLoginProvider.GITHUB);
        assertThat(provider.stateTtl()).isEqualTo(Duration.ofMinutes(5));
        assertThat(redirectUri.getScheme()).isEqualTo("https");
        assertThat(redirectUri.getHost()).isEqualTo("github.com");
        assertThat(redirectUri.getPath()).isEqualTo("/login/oauth/authorize");
        assertThat(queryParams.getFirst("client_id")).isEqualTo("github-client-id");
        assertThat(queryParams.getFirst("redirect_uri")).isEqualTo("http://localhost:8080/v1/auth/github/callback");
        assertThat(queryParams.getFirst("scope")).isEqualTo("read:user,user:email");
        assertThat(queryParams.getFirst("state")).isEqualTo("oauth-state");
    }

    private GithubOAuthProperties properties() {
        return GithubOAuthProperties.of(
                "github-client-id",
                "github-client-secret",
                URI.create("http://localhost:8080/v1/auth/github/callback"),
                Duration.ofMinutes(5),
                "read:user,user:email"
        );
    }
}
