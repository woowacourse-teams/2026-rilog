package kr.rilog.global.exception;

public final class AuthException extends RilogBusinessException {

    public AuthException(AuthErrorInformation errorInformation) {
        super(errorInformation);
    }
}
