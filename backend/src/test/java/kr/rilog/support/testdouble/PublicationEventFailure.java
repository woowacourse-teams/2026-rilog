package kr.rilog.support.testdouble;

import kr.rilog.domain.upload.event.TagAssetsEvent;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.springframework.context.event.EventListener;

import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;

/**
 * 지정한 TagAssetsEvent를 받으면 예외를 던져 발행 트랜잭션의 실패 경로를 재현한다.
 */
public class PublicationEventFailure {

    private volatile Class<? extends TagAssetsEvent> failureType;

    public void failOn(Class<? extends TagAssetsEvent> failureType) {
        this.failureType = failureType;
    }

    public void reset() {
        failureType = null;
    }

    @EventListener
    public void receive(TagAssetsEvent event) {
        Class<? extends TagAssetsEvent> type = failureType;
        if (type != null && type.isInstance(event)) {
            throw new RilogInfrastructureException(INTERNAL_SERVER_ERROR);
        }
    }

}
