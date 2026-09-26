package kr.rilog.global.advice;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import jakarta.servlet.http.HttpServletRequest;
import kr.rilog.domain.auth.exception.AuthErrorInformation;
import kr.rilog.global.exception.ErrorInformation;
import kr.rilog.global.exception.GlobalExceptionInformation;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.global.exception.RilogBusinessException;
import kr.rilog.global.exception.dto.ErrorDetail;
import kr.rilog.global.exception.dto.InvalidParam;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String HTTP_REQUEST_EXCEPTION_EVENT = "http_request_exception";
    private static final String EXCEPTION_LOG_FORMAT = "[{}] {}";
    private static final String UNKNOWN_EXCEPTION_LOG_FORMAT = "[{}] 예상치 못한 예외 발생";
    private static final Set<String> INFRASTRUCTURE_LOG_KEYS = Set.of(
            "provider", "operation", "durationMs", "failureType", "externalStatus",
            "bucket", "key", "uploadType", "contentType", "size", "expirationMinutes"
    );


    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDetail> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e, HttpServletRequest request
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.REQUEST_VALIDATION_FAILED;

        List<InvalidParam> invalidParams = e.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(fieldError -> new InvalidParam(
                        fieldError.getField(),
                        fieldError.getDefaultMessage()
                ))
                .toList();

        logInfoException(errorInformation, invalidParams, request);

        ErrorDetail errorDetail = ErrorDetail.of(
                errorInformation,
                invalidParams
        );

        return ResponseEntity
                .status(errorInformation.getHttpStatus())
                .body(errorDetail);
    }

    @ExceptionHandler(RilogBusinessException.class)
    public ResponseEntity<ErrorDetail> handleRilogBusinessException(
            RilogBusinessException e, HttpServletRequest request
    ) {
        ErrorInformation errorInformation = e.getErrorInformation();
        if (shouldLog(errorInformation)) {
            logExceptionByStatus(errorInformation, e, request);
        }
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(RilogInfrastructureException.class)
    public ResponseEntity<ErrorDetail> handleRilogInfrastructureException(
            RilogInfrastructureException e, HttpServletRequest request
    ) {
        ErrorInformation errorInformation = e.getErrorInformation();
        logErrorException(errorInformation, e.getMessage(), e, request);
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorDetail> handleHandlerMethodValidationException(
            HandlerMethodValidationException e, HttpServletRequest request
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.REQUEST_VALIDATION_FAILED;
        List<InvalidParam> invalidParams = e.getParameterValidationResults()
                .stream()
                .flatMap(validationResult -> validationResult.getResolvableErrors()
                        .stream()
                        .map(error -> InvalidParam.of(
                                extractParameterName(validationResult),
                                error.getDefaultMessage()
                        )))
                .toList();

        logInfoException(errorInformation, invalidParams, request);

        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation, invalidParams));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorDetail> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e, HttpServletRequest request
    ) {
        ErrorInformation errorInformation =
                GlobalExceptionInformation.INVALID_REQUEST_BODY;

        InvalidParam invalidParam = extractInvalidParam(e);
        logInfoException(errorInformation, invalidParam, request);

        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation, List.of(invalidParam)));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorDetail> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException e, HttpServletRequest request
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.METHOD_NOT_SUPPORTED;
        logInfoException(errorInformation, errorInformation.getMessage(), request);
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ErrorDetail> handleDuplicateKeyException(
            DataIntegrityViolationException e, HttpServletRequest request
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.DUPLICATE_KEY_CONFLICT;
        logExceptionByStatus(errorInformation, e, request);
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorDetail> handleDataIntegrityViolationException(
            DataIntegrityViolationException e, HttpServletRequest request
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.DATA_INTEGRITY_VIOLATION;
        logExceptionByStatus(errorInformation, e, request);
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorDetail> handleNoResourceFoundException(
            NoResourceFoundException e, HttpServletRequest request
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.STATIC_RESOURCE_NOT_FOUND;
        logInfoException(errorInformation, errorInformation.getMessage(), request);
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorDetail> handleMissingServletRequestParameterException(
            MissingServletRequestParameterException e, HttpServletRequest request
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.MISSING_REQUEST_PARAMETER;
        List<InvalidParam> invalidParams = List.of(InvalidParam.missingRequestParameters(e.getParameterName()));

        logInfoException(errorInformation, invalidParams, request);
        return ResponseEntity
                .status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation, invalidParams));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDetail> handleUnknownException(Exception e, HttpServletRequest request) {
        ErrorInformation errorInformation = GlobalExceptionInformation.INTERNAL_SERVER_ERROR;
        log.atError()
                .addKeyValue("event", HTTP_REQUEST_EXCEPTION_EVENT)
                .addKeyValue("errorCode", errorInformation.getErrorCode())
                .addKeyValue("httpStatus", errorInformation.getHttpStatus().value())
                .addKeyValue("method", request.getMethod())
                .addKeyValue("path", request.getRequestURI())
                .setCause(e)
                .log(UNKNOWN_EXCEPTION_LOG_FORMAT, errorInformation.getErrorCode());
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    private InvalidParam extractInvalidParam(HttpMessageNotReadableException e) {

        Throwable cause = e.getMostSpecificCause();

        if (cause instanceof InvalidFormatException ex) {
            return InvalidParam.invalidValue(extractFieldName(ex));
        }

        if (cause instanceof MismatchedInputException ex) {
            return InvalidParam.invalidFormat(extractFieldName(ex));
        }

        return InvalidParam.unreadableRequestBody();
    }

    private String extractFieldName(JsonMappingException e) {
        return e.getPath().stream()
                .map(JsonMappingException.Reference::getFieldName)
                .filter(Objects::nonNull)
                .collect(Collectors.joining("."));
    }

    private String extractParameterName(ParameterValidationResult validationResult) {
        return validationResult.getMethodParameter().getParameterName();
    }

    private void logExceptionByStatus(
            ErrorInformation errorInformation, Exception exception, HttpServletRequest request
    ) {
        if (errorInformation.getHttpStatus().is5xxServerError()) {
            logErrorException(errorInformation, errorInformation.getMessage(), exception, request);
            return;
        }

        logInfoException(errorInformation, errorInformation.getMessage(), request);
    }

    private boolean shouldLog(ErrorInformation errorInformation) {
        return errorInformation != AuthErrorInformation.EXPIRED_ACCESS_TOKEN
                && errorInformation != AuthErrorInformation.REFRESH_TOKEN_MISSING;
    }

    private void logInfoException(ErrorInformation errorInformation, Object context, HttpServletRequest request) {
        log.atInfo()
                .addKeyValue("event", HTTP_REQUEST_EXCEPTION_EVENT)
                .addKeyValue("errorCode", errorInformation.getErrorCode())
                .addKeyValue("httpStatus", errorInformation.getHttpStatus().value())
                .addKeyValue("method", request.getMethod())
                .addKeyValue("path", request.getRequestURI())
                .log(EXCEPTION_LOG_FORMAT, errorInformation.getErrorCode(), context);
    }

    private void logErrorException(
            ErrorInformation errorInformation, String context, Exception exception, HttpServletRequest request
    ) {
        var event = log.atError()
                .addKeyValue("event", HTTP_REQUEST_EXCEPTION_EVENT)
                .addKeyValue("errorCode", errorInformation.getErrorCode())
                .addKeyValue("httpStatus", errorInformation.getHttpStatus().value())
                .addKeyValue("method", request.getMethod())
                .addKeyValue("path", request.getRequestURI());
        if (exception instanceof RilogInfrastructureException infrastructureException) {
            infrastructureException.getLogContext().forEach((key, value) -> {
                if (INFRASTRUCTURE_LOG_KEYS.contains(key)) {
                    event.addKeyValue(key, value);
                }
            });
        }
        event.setCause(exception).log(EXCEPTION_LOG_FORMAT, errorInformation.getErrorCode(), context);
    }

}
