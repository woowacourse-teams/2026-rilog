package kr.rilog.domain.notification.service.content.reader;

import kr.rilog.domain.notification.entity.enums.NotificationSourceType;
import kr.rilog.domain.notification.repository.InlineCommentNotificationQueryRepository;
import kr.rilog.domain.notification.service.content.InlineCommentNotificationContent;
import kr.rilog.domain.notification.service.content.NotificationContent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class InlineCommentNotificationContentReader implements NotificationContentReader {

    private final InlineCommentNotificationQueryRepository repository;

    @Override
    public NotificationSourceType supportType() {
        return NotificationSourceType.INLINE_COMMENT;
    }

    @Override
    public Map<Long, NotificationContent> readAll(List<Long> sourceIds, Long userId) {
        if (sourceIds.isEmpty()) {
            return Map.of();
        }

        return repository.findAllBySourceIds(sourceIds, userId)
                .stream()
                .map(InlineCommentNotificationContent::from)
                .collect(Collectors.toMap(
                        InlineCommentNotificationContent::commentAnchorId,
                        Function.identity()
                ));
    }

}
