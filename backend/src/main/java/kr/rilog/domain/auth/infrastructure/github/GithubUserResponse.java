package kr.rilog.domain.auth.infrastructure.github;

import com.fasterxml.jackson.annotation.JsonProperty;

record GithubUserResponse(
        Long id,
        String login,
        @JsonProperty("avatar_url")
        String avatarUrl
) {
}
