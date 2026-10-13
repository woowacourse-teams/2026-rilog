package kr.rilog.domain.therilog.exception;

import kr.rilog.global.exception.ErrorInformation;
import kr.rilog.global.exception.RilogBusinessException;

public class TheRilogSheetException extends RilogBusinessException {

    public TheRilogSheetException(ErrorInformation errorInformation) {
        super(errorInformation);
    }
}
