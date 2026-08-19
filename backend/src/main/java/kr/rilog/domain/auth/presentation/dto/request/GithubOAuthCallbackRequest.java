package kr.rilog.domain.auth.presentation.dto.request;

public record GithubOAuthCallbackRequest(
        String code,
        String state,
        String error
) {
}
