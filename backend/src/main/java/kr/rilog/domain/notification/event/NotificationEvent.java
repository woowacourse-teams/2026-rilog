package kr.rilog.domain.notification.event;

import java.time.LocalDateTime;
import java.util.Objects;

public sealed interface NotificationEvent {

    record CommentAnchorCreated(Long commentAnchorId, Long writerId, LocalDateTime occurredAt) implements NotificationEvent {

        public CommentAnchorCreated {
            Objects.requireNonNull(commentAnchorId);
            Objects.requireNonNull(writerId);
            Objects.requireNonNull(occurredAt);
        }

    }
}
