package kr.rilog.domain.auth.application;

public record GithubOAuthUser(
        Long id,
        String login,
        String avatarUrl
) {
}
