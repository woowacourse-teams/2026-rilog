package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.TagStatus;
import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingRequest;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class S3ObjectTaggerTest {

    private static final String BUCKET = "rilog-bucket";

    @Test
    @DisplayName("S3 객체 주소 개수만큼 태그 변경을 요청한다.")
    void fileTagRequestsTagChangeForEveryObjectUrl() {
        // given
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTagger tagger = new S3ObjectTagger(s3Client, s3Properties());
        List<String> objectUrls = List.of(
                "https://rilog-bucket.s3.ap-northeast-2.amazonaws.com/images/2026/a%20b.png",
                "https://rilog-bucket.s3.ap-northeast-2.amazonaws.com/files/2026/document.pdf"
        );

        // when
        tagger.fileTag(objectUrls, TagStatus.CONFIRMED);

        // then
        verify(s3Client, times(objectUrls.size()))
                .putObjectTagging(any(PutObjectTaggingRequest.class));
    }

    @Test
    @DisplayName("S3 객체 주소가 비어 있으면 태그 변경을 요청하지 않는다.")
    void fileTagDoesNotCallS3WhenObjectUrlsAreEmpty() {
        // given
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTagger tagger = new S3ObjectTagger(s3Client, s3Properties());

        // when
        tagger.fileTag(List.of(), TagStatus.CONFIRMED);

        // then
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
