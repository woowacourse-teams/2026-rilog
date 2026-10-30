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
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3ObjectTagger {

    private static final String S3_TAGGING_FAILED_EVENT = "s3_object_tagging_failed";
    private static final String S3_TAGGING_SUCCESS_EVENT = "s3_object_tagging_success";
    private static final String S3_TAGGING_FAILED_LOG_FORMAT =
            "event=s3_object_tagging_failed bucket={} key={} tagStatus={}";
    private static final String NO_SUCH_KEY_ERROR_CODE = "NoSuchKey";

    private final S3Client s3Client;
    private final S3Properties properties;

    /**
     * 대상마다 태그를 바꾸고, 실패한 대상은 기록만 하고 건너뛴다.
     *
     * @return 태그를 바꾼 대상
     */
    public List<S3TagTarget> tag(List<S3TagTarget> uploadTargets) {
        return tag(uploadTargets, false);
    }

    /**
     * {@link #tag}와 같지만 객체가 없으면(NoSuchKey) 실패로 기록하지 않고 건너뛴다.
     * 압축 실패나 지원하지 않는 형식으로 만들어지지 않았을 수 있는 압축본처럼 없어도 정상인 대상에 쓴다.
     *
     * @return 태그를 바꾼 대상
     */
    public List<S3TagTarget> tagIfExists(List<S3TagTarget> uploadTargets) {
        return tag(uploadTargets, true);
    }

    private List<S3TagTarget> tag(List<S3TagTarget> uploadTargets, boolean skipMissing) {
        return uploadTargets.stream()
                .filter(uploadTarget -> changeS3ObjectTag(uploadTarget, skipMissing))
                .toList();
    }

    private boolean changeS3ObjectTag(S3TagTarget uploadTarget, boolean skipMissing) {
        long startedAt = System.nanoTime();
        try {
            s3Client.putObjectTagging(PutObjectTaggingRequest.builder()
                    .bucket(properties.bucket())
                    .key(uploadTarget.key())
                    .tagging(uploadTarget.tagStatus().toTagging())
                    .build());
            log.atInfo()
                    .addKeyValue("event", S3_TAGGING_SUCCESS_EVENT)
                    .addKeyValue("operation", "put_object_tagging")
                    .addKeyValue("bucket", properties.bucket())
                    .addKeyValue("key", uploadTarget.key())
                    .addKeyValue("tagStatus", uploadTarget.tagStatus())
                    .addKeyValue("durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt));
            return true;
        } catch (SdkException exception) {
            if (skipMissing && isMissingObject(exception)) {
                return false;
            }
            var event = log.atError()
                    .addKeyValue("event", S3_TAGGING_FAILED_EVENT)
                    .addKeyValue("operation", "put_object_tagging")
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
            return false;
        }
    }

    // NoSuchBucket 등 다른 404는 설정 오류이므로 실패로 기록한다.
    private boolean isMissingObject(SdkException exception) {
        return exception instanceof S3Exception s3Exception
                && s3Exception.awsErrorDetails() != null
                && NO_SUCH_KEY_ERROR_CODE.equals(s3Exception.awsErrorDetails().errorCode());
    }

    private void addAwsField(LoggingEventBuilder event, String key, String value) {
        if (StringUtils.hasText(value) && !"UNKNOWN".equals(value)) {
            event.addKeyValue(key, value);
        }
    }

}
