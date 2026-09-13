package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.event.TagAssetsEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class TagAssetsPublisherTest {

    private ApplicationEventPublisher eventPublisher;
    private TagAssetsPublisher lifecycle;

    @BeforeEach
    void setUp() {
        eventPublisher = mock(ApplicationEventPublisher.class);
        lifecycle = new TagAssetsPublisher(eventPublisher);
    }

    @Test
    @DisplayName("자산 연결 이벤트를 발행한다.")
    void publishAttachEvent() {
        TagAssets assets = TagAssets.of("https://s3.example.com/added.png");

        lifecycle.attach(assets);

        verify(eventPublisher).publishEvent(new TagAssetsEvent.Attach(assets));
    }

    @Test
    @DisplayName("자산 동기화 이벤트를 발행한다.")
    void publishSynchronizeEvent() {
        TagAssets previous = TagAssets.of("https://s3.example.com/previous.png");
        TagAssets current = TagAssets.of("https://s3.example.com/current.png");

        lifecycle.synchronize(previous, current);

        verify(eventPublisher).publishEvent(new TagAssetsEvent.Synchronize(previous, current));
    }

    @Test
    @DisplayName("자산 분리 이벤트를 발행한다.")
    void publishDetachEvent() {
        TagAssets assets = TagAssets.of("https://s3.example.com/removed.png");

        lifecycle.detach(assets);

        verify(eventPublisher).publishEvent(new TagAssetsEvent.Detach(assets));
    }
}
