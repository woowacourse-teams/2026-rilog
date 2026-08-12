package kr.rilog.auth.infrastructure.github;

import com.fasterxml.jackson.annotation.JsonProperty;

record GithubTokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("token_type") String tokenType
) {

}
