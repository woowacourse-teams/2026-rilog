package kr.rilog.domain.upload.listener;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.event.TagAssetsEvent;
import kr.rilog.domain.upload.service.S3TagAssetsLifecycle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class TagAssetsListenerTest {

    private static final Long REQUESTER_ID = 7L;

    private S3TagAssetsLifecycle lifecycle;
    private TagAssetsListener listener;

    @BeforeEach
    void setUp() {
        lifecycle = mock(S3TagAssetsLifecycle.class);
        listener = new TagAssetsListener(lifecycle);
    }

    @Test
    @DisplayName("연결 이벤트의 자산을 S3 라이프사이클에 전달한다.")
    void attachAssets() {
        TagAssets assets = TagAssets.of("https://s3.example.com/added.png");

        listener.handle(new TagAssetsEvent.Attach(assets));

        verify(lifecycle).attach(assets);
    }

    @Test
    @DisplayName("동기화 이벤트의 이전 및 현재 자산을 S3 라이프사이클에 전달한다.")
    void synchronizeAssets() {
        TagAssets previous = TagAssets.of("https://s3.example.com/previous.png");
        TagAssets current = TagAssets.of("https://s3.example.com/current.png");

        listener.handle(new TagAssetsEvent.Synchronize(REQUESTER_ID, previous, current));

        verify(lifecycle).synchronize(REQUESTER_ID, previous, current);
    }

    @Test
    @DisplayName("분리 이벤트의 자산을 S3 라이프사이클에 전달한다.")
    void detachAssets() {
        TagAssets assets = TagAssets.of("https://s3.example.com/removed.png");

        listener.handle(new TagAssetsEvent.Detach(REQUESTER_ID, assets));

        verify(lifecycle).detach(REQUESTER_ID, assets);
    }

    @Test
    @DisplayName("리스너는 이벤트 전체 문자열을 INFO 로그로 남기지 않는다.")
    void doesNotLogWholeEvent() {
        TagAssets previous = TagAssets.of("https://s3.example.com/previous.png?token=secret");
        TagAssets current = TagAssets.of("https://s3.example.com/current.png");
        LogCapture logCapture = LogCapture.start();

        try {
            listener.handle(new TagAssetsEvent.Synchronize(REQUESTER_ID, previous, current));

            assertThat(logCapture.events()).isEmpty();
        } finally {
            logCapture.stop();
        }
    }

    private record LogCapture(Logger logger, ListAppender<ILoggingEvent> appender) {

        private static LogCapture start() {
            Logger logger = (Logger) LoggerFactory.getLogger(TagAssetsListener.class);
            ListAppender<ILoggingEvent> appender = new ListAppender<>();
            appender.start();
            logger.addAppender(appender);
            return new LogCapture(logger, appender);
        }

        private java.util.List<ILoggingEvent> events() {
            return appender.list;
        }

        private void stop() {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
