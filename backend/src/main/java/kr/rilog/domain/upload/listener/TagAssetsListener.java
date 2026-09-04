package kr.rilog.domain.upload.listener;

import kr.rilog.domain.upload.event.TagAssetsEvent;
import kr.rilog.domain.upload.service.S3TagAssetsLifecycle;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import static kr.rilog.global.config.AsyncConfig.S3_TAGGING_EXECUTOR;

@Slf4j
@Component
@RequiredArgsConstructor
public class TagAssetsListener {

    private final S3TagAssetsLifecycle lifecycle;

    @Async(S3_TAGGING_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(TagAssetsEvent.Attach event) {
        log.info("TAG ATTACH LISTENER 수행");
        lifecycle.attach(event.assets());
    }

    @Async(S3_TAGGING_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(TagAssetsEvent.Synchronize event) {
        log.info("TAG SYNCHRONIZE LISTENER 수행");
        log.info(event.toString());
        lifecycle.synchronize(event.previous(), event.current());
    }

    @Async(S3_TAGGING_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(TagAssetsEvent.Detach event) {
        log.info("TAG DETACH LISTENER 수행");
        lifecycle.detach(event.assets());
    }

}
