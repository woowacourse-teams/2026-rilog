package kr.rilog.global.response;

import lombok.AccessLevel;
import lombok.Builder;
import org.springframework.http.HttpStatus;

@Builder(access = AccessLevel.PRIVATE)
public record ApiResponse<T>(
        int status,
        String message,
        T data
) {

    public static <T> ApiResponse<T> response(HttpStatus httpStatus, String message, T data) {
        return ApiResponse.<T>builder()
                .status(httpStatus.value())
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> response(HttpStatus httpStatus, String message) {
        return ApiResponse.<T>builder()
                .status(httpStatus.value())
                .message(message)
                .build();
    }

}
