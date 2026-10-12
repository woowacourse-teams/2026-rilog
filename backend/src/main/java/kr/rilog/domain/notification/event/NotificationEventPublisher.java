package kr.rilog.domain.notification.event;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class NotificationEventPublisher {

    private final ApplicationEventPublisher eventPublisher;

    public void commentAnchorCreated(Long commentAnchorId, Long writerId, LocalDateTime occurredAt) {
        eventPublisher.publishEvent(
                new NotificationEvent.CommentAnchorCreated(commentAnchorId, writerId, occurredAt)
        );
    }

}
