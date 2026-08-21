package kr.rilog.global.exception;

import lombok.Getter;

@Getter
public class RilogBusinessException extends RuntimeException{

    private final ErrorInformation errorInformation;

    protected RilogBusinessException(ErrorInformation errorInformation) {
        super(errorInformation.getMessage());
        this.errorInformation = errorInformation;
    }

}
