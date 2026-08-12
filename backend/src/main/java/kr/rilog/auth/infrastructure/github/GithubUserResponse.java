package kr.rilog.auth.infrastructure.github;

import com.fasterxml.jackson.annotation.JsonProperty;

record GithubUserResponse(
        Long id,
        @JsonProperty("avatar_url") String avatarUrl,
        @JsonProperty("html_url") String htmlUrl,
        String email
) {
}
