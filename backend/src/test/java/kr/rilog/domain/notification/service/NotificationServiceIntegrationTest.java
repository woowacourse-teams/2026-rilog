package kr.rilog.domain.notification.service;

import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.exception.NotificationException;
import kr.rilog.domain.notification.repository.NotificationRepository;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static kr.rilog.domain.notification.entity.enums.NotificationType.POST_INLINE_COMMENT;
import static kr.rilog.domain.notification.exception.NotificationErrorInformation.NOTIFICATION_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class NotificationServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime CREATED_AT = LocalDateTime.of(2026, 10, 10, 12, 0);
    private static final LocalDateTime ALREADY_READ_AT = CREATED_AT.plusMinutes(1);
    private static final Long RECIPIENT_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;
    private static final Long SOURCE_ID = 10L;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    @DisplayName("읽지 않은 알림을 읽음 처리하면 읽은 상태가 된다.")
    void markAsReadMarksUnreadNotification() {
        // given
        Notification notification = saveUnreadNotification(RECIPIENT_ID);

        // when
        notificationService.markAsRead(notification.getId(), RECIPIENT_ID);

        // then
        Notification found = findNotification(notification);
        assertSoftly(softly -> {
            softly.assertThat(found.isRead()).isTrue();
            softly.assertThat(found.getReadAt()).isNotNull();
        });
    }

    @Test
    @DisplayName("이미 읽은 알림을 다시 읽음 처리해도 처음 읽은 시각을 유지한다.")
    void markAsReadKeepsReadAtOfAlreadyReadNotification() {
        // given
        Notification notification = saveReadNotification(RECIPIENT_ID, ALREADY_READ_AT);

        // when
        notificationService.markAsRead(notification.getId(), RECIPIENT_ID);

        // then
        assertThat(findNotification(notification).getReadAt()).isEqualTo(ALREADY_READ_AT);
    }

    @Test
    @DisplayName("알림 하나를 읽음 처리해도 같은 수신자의 다른 알림은 읽지 않은 상태로 남는다.")
    void markAsReadDoesNotMarkOtherNotificationsOfRecipient() {
        // given
        Notification target = saveUnreadNotification(RECIPIENT_ID);
        Notification other = saveUnreadNotification(RECIPIENT_ID);

        // when
        notificationService.markAsRead(target.getId(), RECIPIENT_ID);

        // then
        assertThat(findNotification(other).isRead()).isFalse();
    }

    @Test
    @DisplayName("다른 사용자의 알림을 읽음 처리하면 알림을 찾을 수 없다는 예외가 발생하고 읽지 않은 상태로 남는다.")
    void markAsReadThrowsWhenNotificationBelongsToOtherUser() {
        // given
        Notification notification = saveUnreadNotification(RECIPIENT_ID);

        // when & then
        assertThatThrownBy(() -> notificationService.markAsRead(notification.getId(), OTHER_USER_ID))
                .isInstanceOf(NotificationException.class)
                .extracting("errorInformation")
                .isEqualTo(NOTIFICATION_NOT_FOUND);
        assertThat(findNotification(notification).isRead()).isFalse();
    }

    @Test
    @DisplayName("존재하지 않는 알림을 읽음 처리하면 알림을 찾을 수 없다는 예외가 발생한다.")
    void markAsReadThrowsWhenNotificationDoesNotExist() {
        // when & then
        assertThatThrownBy(() -> notificationService.markAsRead(Long.MAX_VALUE, RECIPIENT_ID))
                .isInstanceOf(NotificationException.class)
                .extracting("errorInformation")
                .isEqualTo(NOTIFICATION_NOT_FOUND);
    }

    @Test
    @DisplayName("전체 읽음 처리하면 수신자의 읽지 않은 알림이 모두 읽은 상태가 된다.")
    void markAllAsReadMarksAllUnreadNotificationsOfRecipient() {
        // given
        saveUnreadNotification(RECIPIENT_ID);
        saveUnreadNotification(RECIPIENT_ID);

        // when
        notificationService.markAllAsRead(RECIPIENT_ID);

        // then
        assertThat(notificationRepository.countByRecipientIdAndReadAtIsNull(RECIPIENT_ID)).isZero();
    }

    @Test
    @DisplayName("전체 읽음 처리해도 다른 사용자의 알림은 읽지 않은 상태로 남는다.")
    void markAllAsReadDoesNotMarkNotificationsOfOtherUser() {
        // given
        saveUnreadNotification(RECIPIENT_ID);
        Notification otherUserNotification = saveUnreadNotification(OTHER_USER_ID);

        // when
        notificationService.markAllAsRead(RECIPIENT_ID);

        // then
        assertThat(findNotification(otherUserNotification).isRead()).isFalse();
    }

    private Notification saveUnreadNotification(Long recipientId) {
        return notificationRepository.saveAndFlush(
                Notification.create(recipientId, POST_INLINE_COMMENT, SOURCE_ID, CREATED_AT)
        );
    }

    private Notification saveReadNotification(Long recipientId, LocalDateTime readAt) {
        Notification notification = Notification.create(recipientId, POST_INLINE_COMMENT, SOURCE_ID, CREATED_AT);
        notification.markAsRead(readAt);
        return notificationRepository.saveAndFlush(notification);
    }

    private Notification findNotification(Notification notification) {
        return notificationRepository.findById(notification.getId()).orElseThrow();
    }

}
