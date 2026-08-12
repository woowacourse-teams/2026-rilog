package kr.rilog.domain.user.exception;

import kr.rilog.global.exception.RilogBusinessException;

public class UserException extends RilogBusinessException {

    public UserException(UserErrorInformation errorInformation) {
        super(errorInformation);
    }
}
