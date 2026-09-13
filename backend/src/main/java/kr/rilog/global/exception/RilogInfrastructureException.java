package kr.rilog.global.exception;

import lombok.Getter;

@Getter
public class RilogInfrastructureException extends RuntimeException {

    private final ErrorInformation errorInformation;

    public RilogInfrastructureException(ErrorInformation errorInformation) {
        super(errorInformation.getMessage());
        this.errorInformation = errorInformation;
    }

    public RilogInfrastructureException(ErrorInformation errorInformation, Throwable cause) {
        super(errorInformation.getMessage(), cause);
        this.errorInformation = errorInformation;
    }

    public RilogInfrastructureException(ErrorInformation errorInformation, String message, Throwable cause) {
        super(message, cause);
        this.errorInformation = errorInformation;
    }
}
