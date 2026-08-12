package kr.rilog.global.exception;

public final class AuthException extends RilogBusinessException {

    private final AuthFailureReason failureReason;

    public AuthException(AuthErrorInformation errorInformation) {
        this(errorInformation, AuthFailureReason.UNSPECIFIED);
    }

    public AuthException(
            AuthErrorInformation errorInformation,
            AuthFailureReason failureReason
    ) {
        super(errorInformation);
        this.failureReason = failureReason;
    }

    public AuthFailureReason getFailureReason() {
        return failureReason;
    }

}
