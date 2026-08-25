package kr.rilog.domain.upload.domain.vo;

import java.net.URI;

public record S3ObjectAddress(
        String bucket,
        String key
) {

    private static final String S3_HOST_SUFFIX =
            ".s3.ap-northeast-2.amazonaws.com";

    public static S3ObjectAddress from(String objectUrl) {
        URI uri = URI.create(objectUrl);
        validateScheme(uri, objectUrl);

        String host = uri.getHost();
        validateHost(host, objectUrl);

        String bucket = host.substring(0, host.length() - S3_HOST_SUFFIX.length());
        String decodedPath = uri.getPath();
        validatePath(decodedPath, objectUrl);
        String key = decodedPath.substring(1);

        return new S3ObjectAddress(bucket, key);
    }

    // TODO 예외처리
    private static void validateScheme(URI uri, String objectUrl) {
        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException(
                    "HTTPS 주소가 아닙니다: " + objectUrl);
        }
    }

    // TODO 예외처리
    private static void validateHost(String host, String objectUrl) {
        if (host == null
                || !host.endsWith(S3_HOST_SUFFIX)
                || host.length() == S3_HOST_SUFFIX.length()) {
            throw new IllegalArgumentException(
                    "지원하지 않는 S3 주소입니다: " + objectUrl);
        }
    }

    // TODO 예외처리
    private static void validatePath(String path, String objectUrl) {
        if (path == null || path.length() <= 1) {
            throw new IllegalArgumentException(
                    "S3 객체 키가 없습니다: " + objectUrl);
        }
    }

}
