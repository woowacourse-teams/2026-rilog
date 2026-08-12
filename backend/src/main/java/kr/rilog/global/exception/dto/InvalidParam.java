package kr.rilog.global.exception.dto;

public record InvalidParam(
        String name,
        String reason
) {
}
