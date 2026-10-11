package kr.rilog.domain.notification.event;

import kr.rilog.domain.notification.service.NotificationWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

import static kr.rilog.domain.notification.entity.enums.NotificationType.POST_INLINE_COMMENT;
import static kr.rilog.domain.notification.entity.enums.NotificationType.SELECTION_INLINE_COMMENT;
import static kr.rilog.global.config.AsyncConfig.NOTIFICATION_EXECUTOR;

@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationWriter notificationWriter;

    @Async(NOTIFICATION_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(NotificationEvent.CommentAnchorCreated event) {
        // 한 수신자가 두 타입에 모두 해당하면 앞선 타입 1건만 생성됨. (2026.10.10 기준 게시글 작성자 알림을 우선으로 함.)
        notificationWriter.write(
                List.of(POST_INLINE_COMMENT, SELECTION_INLINE_COMMENT),
                event.commentAnchorId(),
                event.writerId(),
                event.occurredAt()
        );
    }

}
