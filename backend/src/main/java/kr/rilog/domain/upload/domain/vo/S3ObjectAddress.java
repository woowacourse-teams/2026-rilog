package kr.rilog.domain.upload.domain.vo;

import kr.rilog.domain.upload.exception.UploadException;

import java.net.URI;

import static kr.rilog.domain.upload.exception.UploadErrorInformation.*;

public record S3ObjectAddress(
        String bucket,
        String key
) {

    private static final String S3_HOST_SUFFIX = ".s3.ap-northeast-2.amazonaws.com";
    private static final String HTTPS_SCHEME = "https";

    public static S3ObjectAddress from(String objectUrl, String originBucket) {
        URI uri = URI.create(objectUrl);
        validateScheme(uri);

        String host = uri.getHost();
        validateHost(host);

        String parsedBucket = host.substring(0, host.length() - S3_HOST_SUFFIX.length());
        validateBucket(parsedBucket, originBucket);

        String decodedPath = uri.getPath();
        validatePath(decodedPath);
        String key = decodedPath.substring(1);

        return new S3ObjectAddress(parsedBucket, key);
    }

    private static void validateScheme(URI uri) {
        if (!HTTPS_SCHEME.equalsIgnoreCase(uri.getScheme())) {
            throw new UploadException(INVALID_S3_URL_SCHEME);
        }
    }

    private static void validateHost(String host) {
        if (host == null || !host.endsWith(S3_HOST_SUFFIX) || host.length() == S3_HOST_SUFFIX.length()) {
            throw new UploadException(UNSUPPORTED_S3_HOST);
        }
    }

    private static void validatePath(String path) {
        if (path == null || path.length() <= 1) {
            throw new UploadException(S3_OBJECT_KEY_MISSING);
        }
    }

    private static void validateBucket(String parsedBucket, String originBucket) {
        if (parsedBucket.equals(originBucket)) {
            throw new UploadException(UNSUPPORTED_S3_BUCKET);
        }
    }

}
