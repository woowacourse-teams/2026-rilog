package kr.rilog.global.advice;

import kr.rilog.global.exception.ErrorInformation;
import kr.rilog.global.exception.GlobalExceptionInformation;
import kr.rilog.global.exception.RilogBusinessException;
import kr.rilog.global.exception.dto.ErrorDetail;
import kr.rilog.global.exception.dto.InvalidParam;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String EXCEPTION_LOG_FORMAT = "[{}] {}";
    private static final String DATA_INTEGRITY_EXCEPTION_LOG_FORMAT = "[{}] 데이터 무결성 예외 발생";
    private static final String UNKNOWN_EXCEPTION_LOG_FORMAT = "[{}] 예상치 못한 예외 발생";


    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDetail> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e
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

        log.info(EXCEPTION_LOG_FORMAT, errorInformation.getErrorCode(), invalidParams);

        ErrorDetail errorDetail = ErrorDetail.of(
                errorInformation,
                invalidParams
        );

        return ResponseEntity
                .status(errorInformation.getHttpStatus())
                .body(errorDetail);
    }

    @ExceptionHandler(RilogBusinessException.class)
    public ResponseEntity<ErrorDetail> handleRilogBusinessException(RilogBusinessException e) {
        ErrorInformation errorInformation = e.getErrorInformation();
        log.info(EXCEPTION_LOG_FORMAT, errorInformation.getErrorCode(), errorInformation.getMessage());
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorDetail> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.INVALID_REQUEST_BODY;
        log.info(EXCEPTION_LOG_FORMAT, errorInformation.getErrorCode(), e.getMessage());
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorDetail> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException e
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.METHOD_NOT_SUPPORTED;
        log.info(EXCEPTION_LOG_FORMAT, errorInformation.getErrorCode(), e.getMessage());
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ErrorDetail> handleDuplicateKeyException(
            DataIntegrityViolationException e
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.DATA_NOT_DUPLICATED_KEY;
        log.error(DATA_INTEGRITY_EXCEPTION_LOG_FORMAT, errorInformation.getErrorCode(), e);
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorDetail> handleDataIntegrityViolationException(
            DataIntegrityViolationException e
    ) {
        ErrorInformation errorInformation = GlobalExceptionInformation.DATA_INTEGRITY_VIOLATION;
        log.error(DATA_INTEGRITY_EXCEPTION_LOG_FORMAT, errorInformation.getErrorCode(), e);
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDetail> handleUnknownException(Exception e) {
        ErrorInformation errorInformation = GlobalExceptionInformation.INTERNAL_SERVER_ERROR;
        log.error(UNKNOWN_EXCEPTION_LOG_FORMAT, errorInformation.getErrorCode(), e);
        return ResponseEntity.status(errorInformation.getHttpStatus())
                .body(ErrorDetail.of(errorInformation));
    }

}
