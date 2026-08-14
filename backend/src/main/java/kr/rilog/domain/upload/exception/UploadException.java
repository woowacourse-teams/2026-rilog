package kr.rilog.domain.upload.exception;

import kr.rilog.global.exception.ErrorInformation;
import kr.rilog.global.exception.RilogBusinessException;

public class UploadException extends RilogBusinessException {

    public UploadException(ErrorInformation errorInformation) {
        super(errorInformation);
    }

}
