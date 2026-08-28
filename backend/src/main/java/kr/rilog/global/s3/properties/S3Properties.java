package kr.rilog.global.s3.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "aws.s3")
public record S3Properties(
        String bucket,
        String region,
        String rootDirectory,
        long presignedUrlExpirationMinutes
) {
}
