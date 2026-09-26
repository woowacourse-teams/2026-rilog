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
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import software.amazon.awssdk.awscore.exception.AwsErrorDetails;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingRequest;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.util.List;
import java.util.Map;

import static java.util.stream.Collectors.toMap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class S3ObjectTaggerTest {

    private static final String BUCKET = "rilog-bucket";
    private static final String OBJECT_KEY = "images/2026/image.png";

    @ParameterizedTest
    @EnumSource(TagStatus.class)
    @DisplayName("태깅 성공은 DEBUG 레벨에서도 로그를 남기지 않는다.")
    void successfulTaggingDoesNotLog(TagStatus tagStatus) {
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTagger tagger = new S3ObjectTagger(s3Client, s3Properties());
        LogCapture capture = LogCapture.start();
        when(s3Client.putObjectTagging(any(PutObjectTaggingRequest.class)))
                .thenReturn(PutObjectTaggingResponse.builder().build());

        try {
            tagger.tag(List.of(new S3TagTarget(OBJECT_KEY, tagStatus)));

            verify(s3Client).putObjectTagging(any(PutObjectTaggingRequest.class));
            assertThat(capture.appender().list).isEmpty();
        } finally {
            capture.stop();
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    @DisplayName("S3 서비스 오류는 실제로 취득한 외부 상태와 AWS 오류 정보만 기록한다.")
    void logAvailableAwsFailureDetails(boolean hasDetails) {
        S3Client s3Client = mock(S3Client.class);
        var builder = S3Exception.builder().message("tagging failed");
        if (hasDetails) {
            builder.statusCode(403).requestId("aws-failure-123")
                    .awsErrorDetails(AwsErrorDetails.builder().errorCode("AccessDenied").build());
        }
        when(s3Client.putObjectTagging(any(PutObjectTaggingRequest.class))).thenThrow(builder.build());
        LogCapture capture = LogCapture.start();

        try {
            new S3ObjectTagger(s3Client, s3Properties()).tag(List.of(new S3TagTarget(OBJECT_KEY, TagStatus.CONFIRMED)));

            ILoggingEvent event = capture.onlyEvent();
            assertThat(event.getLevel()).isEqualTo(Level.ERROR);
            assertDuration(event);
            if (hasDetails) {
                assertThat(logFields(event)).containsEntry("externalStatus", "403")
                        .containsEntry("awsErrorCode", "AccessDenied").containsEntry("awsRequestId", "aws-failure-123");
            } else {
                assertThat(logFields(event)).doesNotContainKeys("externalStatus", "awsErrorCode", "awsRequestId");
            }
        } finally {
            capture.stop();
        }
    }

    @ParameterizedTest
    @EnumSource(TagStatus.class)
    @DisplayName("태깅 대상의 버킷, 객체 키와 태그 상태를 S3에 전달한다.")
    void requestTagChangeWithTargetInformation(TagStatus tagStatus) {
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTagger tagger = new S3ObjectTagger(s3Client, s3Properties());
        S3TagTarget target = new S3TagTarget(OBJECT_KEY, tagStatus);
        ArgumentCaptor<PutObjectTaggingRequest> requestCaptor =
                ArgumentCaptor.forClass(PutObjectTaggingRequest.class);
        when(s3Client.putObjectTagging(any(PutObjectTaggingRequest.class)))
                .thenReturn(PutObjectTaggingResponse.builder().build());

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
        when(s3Client.putObjectTagging(any(PutObjectTaggingRequest.class)))
                .thenReturn(PutObjectTaggingResponse.builder().build());

        tagger.tag(targets);

        verify(s3Client, times(targets.size()))
                .putObjectTagging(any(PutObjectTaggingRequest.class));
    }

    @Test
    @DisplayName("태깅 대상이 비어 있으면 S3 태그 변경을 요청하지 않는다.")
    void doNotRequestTagChangeWhenTargetsAreEmpty() {
        S3Client s3Client = mock(S3Client.class);
        S3ObjectTagger tagger = new S3ObjectTagger(s3Client, s3Properties());

        LogCapture capture = LogCapture.start();
        try {
            tagger.tag(List.of());

            verifyNoInteractions(s3Client);
            assertThat(capture.appender().list).isEmpty();
        } finally {
            capture.stop();
        }
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
            MDC.put("requestId", "http-request-123");
            tagger.tag(targets);
            MDC.remove("requestId");

            ArgumentCaptor<PutObjectTaggingRequest> requestCaptor =
                    ArgumentCaptor.forClass(PutObjectTaggingRequest.class);
            verify(s3Client, times(2)).putObjectTagging(requestCaptor.capture());
            assertThat(requestCaptor.getAllValues())
                    .extracting(PutObjectTaggingRequest::key)
                    .containsExactly("images/2026/failed.png", "images/2026/next.png");

            ILoggingEvent event = logCapture.onlyEvent();
            assertThat(event.getLevel()).isEqualTo(Level.ERROR);
            assertThat(event.getMDCPropertyMap()).containsEntry("requestId", "http-request-123");
            assertThat(logFields(event))
                    .containsEntry("event", "s3_object_tagging_failed")
                    .containsEntry("bucket", "rilog-bucket")
                    .containsEntry("key", "images/2026/failed.png")
                    .containsEntry("tagStatus", "CONFIRMED")
                    .doesNotContainKeys("externalStatus", "awsErrorCode", "awsRequestId");
            assertDuration(event);
            assertThat(event.getFormattedMessage())
                    .contains("event=s3_object_tagging_failed")
                    .contains("bucket=rilog-bucket")
                    .contains("key=images/2026/failed.png")
                    .contains("tagStatus=CONFIRMED")
                    .doesNotContain("token=secret");
            assertThat(event.getThrowableProxy().getClassName())
                    .isEqualTo(SdkClientException.class.getName());
        } finally {
            MDC.remove("requestId");
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

    private record LogCapture(Logger logger, ListAppender<ILoggingEvent> appender, Level originalLevel) {

        private static LogCapture start() {
            Logger logger = (Logger) LoggerFactory.getLogger(S3ObjectTagger.class);
            Level originalLevel = logger.getLevel();
            logger.setLevel(Level.DEBUG);
            ListAppender<ILoggingEvent> appender = new ListAppender<>() {
                @Override
                protected void append(ILoggingEvent event) {
                    event.prepareForDeferredProcessing();
                    super.append(event);
                }
            };
            appender.start();
            logger.addAppender(appender);
            return new LogCapture(logger, appender, originalLevel);
        }

        private ILoggingEvent onlyEvent() {
            assertThat(appender.list).hasSize(1);
            return appender.list.getFirst();
        }

        private void stop() {
            logger.detachAppender(appender);
            appender.stop();
            logger.setLevel(originalLevel);
        }
    }

    private static Map<String, String> logFields(ILoggingEvent event) {
        if (event.getKeyValuePairs() == null) {
            return Map.of();
        }
        return event.getKeyValuePairs()
                .stream()
                .collect(toMap(
                        keyValuePair -> keyValuePair.key,
                        keyValuePair -> String.valueOf(keyValuePair.value)
                ));
    }

    private static void assertDuration(ILoggingEvent event) {
        assertThat(event.getKeyValuePairs()).anySatisfy(pair -> {
            assertThat(pair.key).isEqualTo("durationMs");
            assertThat(pair.value).isInstanceOf(Long.class);
            assertThat((Long) pair.value).isGreaterThanOrEqualTo(0L);
        });
    }
}
