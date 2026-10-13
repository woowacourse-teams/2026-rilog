package kr.rilog.domain.therilog.exception;

import kr.rilog.global.exception.ErrorInformation;
import kr.rilog.global.exception.RilogBusinessException;

public class TheRilogTaskException extends RilogBusinessException {

    public TheRilogTaskException(ErrorInformation errorInformation) {
        super(errorInformation);
    }
}
