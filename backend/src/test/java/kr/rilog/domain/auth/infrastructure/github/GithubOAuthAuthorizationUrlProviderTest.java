package kr.rilog.domain.auth.infrastructure.github;

import kr.rilog.domain.auth.application.SocialLoginProvider;
import kr.rilog.domain.auth.config.GithubOAuthProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;

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

        assertEquals(SocialLoginProvider.GITHUB, provider.provider());
        assertEquals(Duration.ofMinutes(5), provider.stateTtl());
        assertEquals("https", redirectUri.getScheme());
        assertEquals("github.com", redirectUri.getHost());
        assertEquals("/login/oauth/authorize", redirectUri.getPath());
        assertEquals("github-client-id", queryParams.getFirst("client_id"));
        assertEquals("http://localhost:8080/v1/auth/github/callback", queryParams.getFirst("redirect_uri"));
        assertEquals("read:user,user:email", queryParams.getFirst("scope"));
        assertEquals("oauth-state", queryParams.getFirst("state"));
    }

    private GithubOAuthProperties properties() {
        return new GithubOAuthProperties(
                "github-client-id",
                "github-client-secret",
                URI.create("http://localhost:8080/v1/auth/github/callback"),
                Duration.ofMinutes(5),
                "read:user,user:email"
        );
    }
}
