package kr.rilog.domain.auth.exception;

import kr.rilog.global.exception.RilogBusinessException;

public class AuthException extends RilogBusinessException {

    public AuthException(AuthErrorInformation errorInformation) {
        super(errorInformation);
    }

}
