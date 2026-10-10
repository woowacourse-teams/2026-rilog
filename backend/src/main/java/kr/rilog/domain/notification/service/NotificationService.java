package kr.rilog.domain.notification.service;

import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.exception.NotificationException;
import kr.rilog.domain.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static kr.rilog.domain.notification.exception.NotificationErrorInformation.NOTIFICATION_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public void readNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .filter(found -> found.isRecipient(userId))
                .orElseThrow(() -> new NotificationException(NOTIFICATION_NOT_FOUND));

        notification.markAsRead(LocalDateTime.now());
    }

    @Transactional
    public void readAllNotifications(Long userId) {
        notificationRepository.markAllAsReadByRecipientId(userId, LocalDateTime.now());
    }

}
