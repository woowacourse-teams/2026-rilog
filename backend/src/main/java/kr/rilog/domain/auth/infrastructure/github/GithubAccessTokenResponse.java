package kr.rilog.domain.auth.infrastructure.github;

import com.fasterxml.jackson.annotation.JsonProperty;

record GithubAccessTokenResponse(
        @JsonProperty("access_token")
        String accessToken,
        @JsonProperty("token_type")
        String tokenType,
        String scope
) {
}
