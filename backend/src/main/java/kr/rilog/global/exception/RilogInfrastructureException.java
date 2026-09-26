package kr.rilog.global.exception;

import lombok.Getter;

import java.util.Map;

@Getter
public class RilogInfrastructureException extends RuntimeException {

    private final ErrorInformation errorInformation;
    private final Map<String, Object> logContext;

    public RilogInfrastructureException(ErrorInformation errorInformation) {
        this(errorInformation, errorInformation.getMessage(), null, Map.of());
    }

    public RilogInfrastructureException(ErrorInformation errorInformation, Throwable cause) {
        this(errorInformation, errorInformation.getMessage(), cause, Map.of());
    }

    public RilogInfrastructureException(ErrorInformation errorInformation, String message, Throwable cause) {
        this(errorInformation, message, cause, Map.of());
    }

    public RilogInfrastructureException(
            ErrorInformation errorInformation, String message, Throwable cause, Map<String, Object> logContext
    ) {
        super(message, cause);
        this.errorInformation = errorInformation;
        this.logContext = Map.copyOf(logContext);
    }
}
