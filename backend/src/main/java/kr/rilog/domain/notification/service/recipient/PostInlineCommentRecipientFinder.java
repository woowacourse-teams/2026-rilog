package kr.rilog.domain.notification.service.recipient;

import kr.rilog.domain.notification.entity.enums.NotificationType;
import kr.rilog.domain.notification.repository.InlineCommentNotificationQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class PostInlineCommentRecipientFinder implements NotificationRecipientFinder {

    private final InlineCommentNotificationQueryRepository repository;

    @Override
    public NotificationType supportType() {
        return NotificationType.POST_INLINE_COMMENT;
    }

    @Override
    public List<Long> findRecipientIds(Long sourceId) {
        return repository.findPostWriterId(sourceId)
                .map(List::of)
                .orElseGet(List::of);
    }

}
