package kr.rilog.domain.notification.service.recipient;

import kr.rilog.domain.notification.entity.enums.NotificationType;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class NotificationRecipientFindStrategy {

    private final Map<NotificationType, NotificationRecipientFinder> finders;

    public NotificationRecipientFindStrategy(List<NotificationRecipientFinder> finders) {
        this.finders = finders.stream()
                .collect(Collectors.toUnmodifiableMap(
                        NotificationRecipientFinder::supportType,
                        Function.identity()
                ));
    }

    public List<Long> findRecipientIds(NotificationType type, Long sourceId) {
        return getFinder(type).findRecipientIds(sourceId);
    }

    private NotificationRecipientFinder getFinder(NotificationType type) {
        NotificationRecipientFinder finder = finders.get(type);
        if (finder == null) {
            throw new IllegalStateException("NotificationRecipientFinder is not registered. type=" + type);
        }

        return finder;
    }
}
