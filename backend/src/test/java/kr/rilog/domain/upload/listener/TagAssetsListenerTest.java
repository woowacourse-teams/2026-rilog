package kr.rilog.domain.upload.listener;

import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.event.TagAssetsEvent;
import kr.rilog.domain.upload.service.S3TagAssetsLifecycle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class TagAssetsListenerTest {

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

        listener.handle(new TagAssetsEvent.Synchronize(previous, current));

        verify(lifecycle).synchronize(previous, current);
    }

    @Test
    @DisplayName("분리 이벤트의 자산을 S3 라이프사이클에 전달한다.")
    void detachAssets() {
        TagAssets assets = TagAssets.of("https://s3.example.com/removed.png");

        listener.handle(new TagAssetsEvent.Detach(assets));

        verify(lifecycle).detach(assets);
    }

}
