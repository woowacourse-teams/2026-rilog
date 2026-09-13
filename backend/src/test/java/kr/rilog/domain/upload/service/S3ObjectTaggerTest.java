package kr.rilog.domain.upload.service;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import kr.rilog.domain.upload.domain.enums.TagStatus;
import kr.rilog.domain.upload.domain.vo.S3TagTarget;
import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingRequest;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class S3ObjectTaggerTest {

    private static final String BUCKET = "rilog-bucket";
    private static final String OBJECT_KEY = "images/2026/image.png";

    @ParameterizedTest
    @EnumSource(TagStatus.class)
    @DisplayName("태깅 대상의 버킷, 객체 키와 태그 상태를 S3에 전달한다.")
    void requestTagChangeWithTargetInformation(TagStatus tagStatus) {
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTagger tagger = new S3ObjectTagger(s3Client, s3Properties());
        S3TagTarget target = new S3TagTarget(OBJECT_KEY, tagStatus);
        ArgumentCaptor<PutObjectTaggingRequest> requestCaptor =
                ArgumentCaptor.forClass(PutObjectTaggingRequest.class);

        tagger.tag(List.of(target));

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
        S3ObjectTagger tagger = new S3ObjectTagger(s3Client, s3Properties());
        List<S3TagTarget> targets = List.of(
                new S3TagTarget("images/2026/image.png", TagStatus.CONFIRMED),
                new S3TagTarget("images/2026/document.pdf", TagStatus.TEMPORARY)
        );

        tagger.tag(targets);

        verify(s3Client, times(targets.size()))
                .putObjectTagging(any(PutObjectTaggingRequest.class));
    }

    @Test
    @DisplayName("태깅 대상이 비어 있으면 S3 태그 변경을 요청하지 않는다.")
    void doNotRequestTagChangeWhenTargetsAreEmpty() {
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTagger tagger = new S3ObjectTagger(s3Client, s3Properties());

        tagger.tag(List.of());

        verifyNoInteractions(s3Client);
    }

    @Test
    @DisplayName("S3 태깅 실패는 대상 정보와 원인 예외를 기록하고 다음 대상을 계속 처리한다.")
    void logFailureWithTargetContextAndContinueRemainingTargets() {
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTagger tagger = new S3ObjectTagger(s3Client, s3Properties());
        SdkClientException failure = SdkClientException.create("s3 failed token=secret");
        List<S3TagTarget> targets = List.of(
                new S3TagTarget("images/2026/failed.png", TagStatus.CONFIRMED),
                new S3TagTarget("images/2026/next.png", TagStatus.TEMPORARY)
        );
        whenPutObjectTaggingFailsThenSucceeds(s3Client, failure);
        LogCapture logCapture = LogCapture.start();

        try {
            tagger.tag(targets);

            ArgumentCaptor<PutObjectTaggingRequest> requestCaptor =
                    ArgumentCaptor.forClass(PutObjectTaggingRequest.class);
            verify(s3Client, times(2)).putObjectTagging(requestCaptor.capture());
            assertThat(requestCaptor.getAllValues())
                    .extracting(PutObjectTaggingRequest::key)
                    .containsExactly("images/2026/failed.png", "images/2026/next.png");

            ILoggingEvent event = logCapture.onlyEvent();
            assertThat(event.getLevel()).isEqualTo(Level.ERROR);
            assertThat(event.getFormattedMessage())
                    .contains("event=s3_object_tagging_failed")
                    .contains("bucket=rilog-bucket")
                    .contains("key=images/2026/failed.png")
                    .contains("tagStatus=CONFIRMED")
                    .doesNotContain("token=secret");
            assertThat(event.getThrowableProxy().getClassName())
                    .isEqualTo(SdkClientException.class.getName());
        } finally {
            logCapture.stop();
        }
    }

    private void whenPutObjectTaggingFailsThenSucceeds(S3Client s3Client, SdkClientException failure) {
        org.mockito.Mockito.when(s3Client.putObjectTagging(any(PutObjectTaggingRequest.class)))
                .thenThrow(failure)
                .thenReturn(PutObjectTaggingResponse.builder().build());
    }

    private S3Properties s3Properties() {
        return new S3Properties(
                BUCKET,
                "ap-northeast-2",
                "images",
                10
        );
    }

    private record LogCapture(Logger logger, ListAppender<ILoggingEvent> appender) {

        private static LogCapture start() {
            Logger logger = (Logger) LoggerFactory.getLogger(S3ObjectTagger.class);
            ListAppender<ILoggingEvent> appender = new ListAppender<>();
            appender.start();
            logger.addAppender(appender);
            return new LogCapture(logger, appender);
        }

        private ILoggingEvent onlyEvent() {
            assertThat(appender.list).hasSize(1);
            return appender.list.getFirst();
        }

        private void stop() {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
