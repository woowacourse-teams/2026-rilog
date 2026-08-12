package kr.rilog.global.exception;

/**
 * 인증 실패 원인을 나타내는 민감 정보가 포함되지 않은 진단 메시지입니다.
 *
 * <p>운영 로그에 기록될 수 있으므로 요청 파라미터, OAuth 인가 코드,
 * 액세스 토큰 및 쿠키 값을 포함해서는 안 됩니다.</p>
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
