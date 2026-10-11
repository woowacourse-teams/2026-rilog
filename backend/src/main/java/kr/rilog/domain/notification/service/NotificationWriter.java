package kr.rilog.domain.notification.service;

import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.entity.enums.NotificationType;
import kr.rilog.domain.notification.repository.NotificationRepository;
import kr.rilog.domain.notification.service.recipient.NotificationRecipientFindStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationWriter {

    private final NotificationRecipientFindStrategy recipientFindStrategy;
    private final NotificationRepository notificationRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void write(List<NotificationType> types, Long sourceId, Long actorId, LocalDateTime occurredAt) {
        Map<Long, Notification> notificationsByRecipientId = new LinkedHashMap<>();
        for (NotificationType type : types) {
            for (Long recipientId : recipientFindStrategy.findRecipientIds(type, sourceId)) {
                if (recipientId.equals(actorId)) {
                    continue;
                }
                notificationsByRecipientId.putIfAbsent(
                        recipientId,
                        Notification.create(recipientId, type, sourceId, occurredAt)
                );
            }
        }

        notificationRepository.saveAll(notificationsByRecipientId.values());
    }

}
