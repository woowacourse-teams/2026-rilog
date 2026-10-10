package kr.rilog.domain.notification.service;

import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.repository.NotificationRepository;
import kr.rilog.domain.notification.service.content.NotificationContent;
import kr.rilog.domain.notification.service.content.reader.NotificationContentReadStrategy;
import kr.rilog.domain.notification.service.dto.command.NotificationSearchCommand;
import kr.rilog.domain.notification.service.dto.result.NotificationListResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class NotificationQueryService {

    private final NotificationRepository notificationRepository;
    private final NotificationContentReadStrategy contentReadStrategy;

    public NotificationListResult readNotifications(NotificationSearchCommand command, Long userId) {
        PageRequest pageable = PageRequest.of(command.page(), command.size());

        Slice<Notification> notifications = notificationRepository.findAllByRecipientId(
                userId,
                command.isUnreadFilter(),
                pageable
        );

        Map<Long, NotificationContent> contents = contentReadStrategy.readAll(
                notifications.getContent(),
                userId
        );

        // Result 내부에서 Slice와 Map을 notificationId를 기준으로 일치시킨다.
        return NotificationListResult.from(notifications, contents);
    }

    public long countUnreadNotifications(Long userId) {
        return notificationRepository.countByRecipientIdAndReadAtIsNull(userId);
    }

}
