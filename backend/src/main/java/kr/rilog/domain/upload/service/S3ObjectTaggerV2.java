package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.vo.v2.S3TagTarget;
import kr.rilog.global.s3.properties.S3Properties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingRequest;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3ObjectTaggerV2 {

    private final S3Client s3Client;
    private final S3Properties properties;

    public void fileTag(List<S3TagTarget> uploadTargets) {
        uploadTargets.forEach(this::changeS3ObjectTag);
    }

    private void changeS3ObjectTag(S3TagTarget uploadTarget) {
        s3Client.putObjectTagging(PutObjectTaggingRequest.builder()
                .bucket(properties.bucket())
                .key(uploadTarget.key())
                .tagging(uploadTarget.tagStatus().toTagging())
                .build());
    }

}
