package kr.rilog.domain.auth.presentation.dto.request;

public record OAuthCallbackRequest(
        String code,
        String state,
        String error
) {
}
