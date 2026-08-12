package kr.rilog.global.exception;

/**
 * A credential-free diagnostic reason for authentication failures.
 *
 * <p>The value may be written to operational logs. Request parameters,
 * OAuth codes, access tokens, and cookie values must never be placed here.</p>
 */
public enum AuthFailureReason {

    UNSPECIFIED,
    OAUTH_STATE_NOT_FOUND,
    OAUTH_ATTEMPT_ALREADY_USED,
    OAUTH_ATTEMPT_EXPIRED,
    OAUTH_BROWSER_BINDING_MISMATCH,
    OAUTH_REQUEST_MALFORMED,
    GITHUB_ACCESS_DENIED,
    GITHUB_CALLBACK_REJECTED,
    GITHUB_TOKEN_REQUEST_FAILED,
    GITHUB_TOKEN_RESPONSE_INVALID,
    GITHUB_USER_REQUEST_FAILED,
    GITHUB_USER_RESPONSE_INVALID
}
