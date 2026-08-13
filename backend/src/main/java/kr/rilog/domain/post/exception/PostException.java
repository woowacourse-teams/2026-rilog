package kr.rilog.domain.post.exception;

import kr.rilog.global.exception.ErrorInformation;
import kr.rilog.global.exception.RilogBusinessException;

public class PostException extends RilogBusinessException {

    public PostException(ErrorInformation errorInformation) {
        super(errorInformation);
    }

}
