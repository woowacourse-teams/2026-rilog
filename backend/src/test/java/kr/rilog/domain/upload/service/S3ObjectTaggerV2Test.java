package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.TagStatus;
import kr.rilog.domain.upload.domain.vo.v2.S3TagTarget;
import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class S3ObjectTaggerV2Test {

    private static final String BUCKET = "rilog-bucket";
    private static final String OBJECT_KEY = "images/2026/image.png";

    @ParameterizedTest
    @EnumSource(TagStatus.class)
    @DisplayName("태깅 대상의 버킷, 객체 키와 태그 상태를 S3에 전달한다.")
    void requestTagChangeWithTargetInformation(TagStatus tagStatus) {
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTaggerV2 tagger = new S3ObjectTaggerV2(s3Client, s3Properties());
        S3TagTarget target = new S3TagTarget(OBJECT_KEY, tagStatus);
        ArgumentCaptor<PutObjectTaggingRequest> requestCaptor =
                ArgumentCaptor.forClass(PutObjectTaggingRequest.class);

        tagger.fileTag(List.of(target));

        verify(s3Client).putObjectTagging(requestCaptor.capture());
        PutObjectTaggingRequest expected = PutObjectTaggingRequest.builder()
                .bucket(BUCKET)
                .key(OBJECT_KEY)
                .tagging(tagStatus.toTagging())
                .build();
        assertThat(requestCaptor.getValue()).isEqualTo(expected);
    }

    @Test
    @DisplayName("태깅 대상마다 S3 태그 변경을 한 번씩 요청한다.")
    void requestTagChangeForEveryTarget() {
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTaggerV2 tagger = new S3ObjectTaggerV2(s3Client, s3Properties());
        List<S3TagTarget> targets = List.of(
                new S3TagTarget("images/2026/image.png", TagStatus.CONFIRMED),
                new S3TagTarget("images/2026/document.pdf", TagStatus.TEMPORARY)
        );

        tagger.fileTag(targets);

        verify(s3Client, times(targets.size()))
                .putObjectTagging(any(PutObjectTaggingRequest.class));
    }

    @Test
    @DisplayName("태깅 대상이 비어 있으면 S3 태그 변경을 요청하지 않는다.")
    void doNotRequestTagChangeWhenTargetsAreEmpty() {
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTaggerV2 tagger = new S3ObjectTaggerV2(s3Client, s3Properties());

        tagger.fileTag(List.of());

        verifyNoInteractions(s3Client);
    }

    private S3Properties s3Properties() {
        return new S3Properties(
                BUCKET,
                "ap-northeast-2",
                "images",
                10
        );
    }

}
