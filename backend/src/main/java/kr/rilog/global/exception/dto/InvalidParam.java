package kr.rilog.global.exception.dto;

public record InvalidParam(
        String name,
        String reason
) {

    public static InvalidParam invalidFormat(String name) {
        return new InvalidParam(name, "요청 값의 형식이 올바르지 않습니다.");
    }

    public static InvalidParam invalidValue(String name) {
        return new InvalidParam(name, "올바르지 않은 값입니다.");
    }

    public static InvalidParam unreadableRequestBody() {
        return new InvalidParam(null, "요청 본문을 읽을 수 없습니다.");
    }

    public static InvalidParam missingRequestParameters(String name) {
        return new InvalidParam(name, "필수 요청 파라미터가 누락되었습니다.");
    }

    public static InvalidParam of(String name, String reason) {
        return new InvalidParam(name, reason);
    }

}
