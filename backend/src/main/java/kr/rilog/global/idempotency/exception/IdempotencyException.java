package kr.rilog.global.idempotency.exception;

import kr.rilog.global.exception.ErrorInformation;
import kr.rilog.global.exception.RilogBusinessException;

public class IdempotencyException extends RilogBusinessException {

    public IdempotencyException(ErrorInformation errorInformation) {
        super(errorInformation);
    }

}
