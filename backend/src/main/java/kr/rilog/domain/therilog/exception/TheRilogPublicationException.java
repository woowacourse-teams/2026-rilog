package kr.rilog.domain.therilog.exception;

import kr.rilog.global.exception.ErrorInformation;
import kr.rilog.global.exception.RilogBusinessException;

public class TheRilogPublicationException extends RilogBusinessException {

    public TheRilogPublicationException(ErrorInformation errorInformation) {
        super(errorInformation);
    }
}
