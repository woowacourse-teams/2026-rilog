package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.vo.S3TagTarget;
import kr.rilog.global.s3.properties.S3Properties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingRequest;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3ObjectTagger {

    private static final String S3_TAGGING_FAILED_EVENT = "s3_object_tagging_failed";
    private static final String S3_TAGGING_FAILED_LOG_FORMAT =
            "event=s3_object_tagging_failed bucket={} key={} tagStatus={}";
    private static final String S3_TAGGING_COMPLETED_EVENT = "s3_object_tagging_completed";
    private static final String S3_TAGGING_COMPLETED_LOG_FORMAT =
            "event=s3_object_tagging_completed bucket={} key={} tagStatus={}";

    private final S3Client s3Client;
    private final S3Properties properties;

    public void tag(List<S3TagTarget> uploadTargets) {
        uploadTargets.forEach(this::changeS3ObjectTag);
    }

    private void changeS3ObjectTag(S3TagTarget uploadTarget) {
        long startedAt = System.nanoTime();
        try {
            PutObjectTaggingResponse response = s3Client.putObjectTagging(PutObjectTaggingRequest.builder()
                    .bucket(properties.bucket())
                    .key(uploadTarget.key())
                    .tagging(uploadTarget.tagStatus().toTagging())
                    .build());
            var event = log.atInfo()
                    .addKeyValue("event", S3_TAGGING_COMPLETED_EVENT)
                    .addKeyValue("bucket", properties.bucket())
                    .addKeyValue("key", uploadTarget.key())
                    .addKeyValue("tagStatus", uploadTarget.tagStatus())
                    .addKeyValue("durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt));
            if (response.responseMetadata() != null) {
                addAwsField(event, "awsRequestId", response.responseMetadata().requestId());
            }
            event.log(S3_TAGGING_COMPLETED_LOG_FORMAT, properties.bucket(), uploadTarget.key(), uploadTarget.tagStatus());
        } catch (SdkException exception) {
            var event = log.atError()
                    .addKeyValue("event", S3_TAGGING_FAILED_EVENT)
                    .addKeyValue("bucket", properties.bucket())
                    .addKeyValue("key", uploadTarget.key())
                    .addKeyValue("tagStatus", uploadTarget.tagStatus())
                    .addKeyValue("durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt));
            if (exception instanceof S3Exception s3Exception) {
                if (s3Exception.statusCode() > 0) {
                    event.addKeyValue("externalStatus", s3Exception.statusCode());
                }
                addAwsField(event, "awsRequestId", s3Exception.requestId());
                if (s3Exception.awsErrorDetails() != null) {
                    addAwsField(event, "awsErrorCode", s3Exception.awsErrorDetails().errorCode());
                }
            }
            event.setCause(exception)
                    .log(
                            S3_TAGGING_FAILED_LOG_FORMAT,
                            properties.bucket(),
                            uploadTarget.key(),
                            uploadTarget.tagStatus()
                    );
        }
    }

    private void addAwsField(LoggingEventBuilder event, String key, String value) {
        if (StringUtils.hasText(value) && !"UNKNOWN".equals(value)) {
            event.addKeyValue(key, value);
        }
    }

}
