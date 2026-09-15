package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.event.TagAssetsEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TagAssetsPublisher {

    private final ApplicationEventPublisher eventPublisher;

    public void attach(TagAssets assets) {
        eventPublisher.publishEvent(new TagAssetsEvent.Attach(assets));
    }

    public void synchronize(Long requesterId, TagAssets previous, TagAssets current) {
        eventPublisher.publishEvent(new TagAssetsEvent.Synchronize(requesterId, previous, current));
    }

    public void detach(Long requesterId, TagAssets assets) {
        eventPublisher.publishEvent(new TagAssetsEvent.Detach(requesterId, assets));
    }

}
