package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.vo.S3TagTarget;
import kr.rilog.global.s3.properties.S3Properties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingRequest;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3ObjectTagger {

    private static final String S3_TAGGING_FAILED_EVENT = "s3_object_tagging_failed";
    private static final String S3_TAGGING_FAILED_LOG_FORMAT =
            "event=s3_object_tagging_failed bucket={} key={} tagStatus={}";

    private final S3Client s3Client;
    private final S3Properties properties;

    public void tag(List<S3TagTarget> uploadTargets) {
        uploadTargets.forEach(this::changeS3ObjectTag);
    }

    private void changeS3ObjectTag(S3TagTarget uploadTarget) {
        try {
            s3Client.putObjectTagging(PutObjectTaggingRequest.builder()
                    .bucket(properties.bucket())
                    .key(uploadTarget.key())
                    .tagging(uploadTarget.tagStatus().toTagging())
                    .build());
        } catch (SdkException exception) {
            log.atError()
                    .addKeyValue("event", S3_TAGGING_FAILED_EVENT)
                    .addKeyValue("bucket", properties.bucket())
                    .addKeyValue("key", uploadTarget.key())
                    .addKeyValue("tagStatus", uploadTarget.tagStatus())
                    .setCause(exception)
                    .log(
                            S3_TAGGING_FAILED_LOG_FORMAT,
                            properties.bucket(),
                            uploadTarget.key(),
                            uploadTarget.tagStatus()
                    );
        }
    }

}
