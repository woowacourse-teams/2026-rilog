package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.TagStatus;
import kr.rilog.domain.upload.domain.vo.S3ObjectAddress;
import kr.rilog.global.s3.properties.S3Properties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3ObjectTagger {

    private final S3Client s3Client;
    private final S3Properties properties;

    public void fileTag(List<String> objectUrls, TagStatus tagStatus) {
        for (String objectUrl : objectUrls) {
            S3ObjectAddress address = S3ObjectAddress.from(objectUrl);
            changeS3ObjectTag(address.key(), tagStatus);
        }
    }

    private void changeS3ObjectTag(String key, TagStatus tagStatus) {
        s3Client.putObjectTagging(PutObjectTaggingRequest.builder()
                .bucket(properties.bucket())
                .key(key)
                .tagging(tagStatus.toTagging())
                .build());
    }

}
