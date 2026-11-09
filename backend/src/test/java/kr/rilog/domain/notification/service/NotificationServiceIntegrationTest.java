package kr.rilog.domain.notification.service;

import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.exception.NotificationException;
import kr.rilog.domain.notification.repository.NotificationRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.UserFixture;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static kr.rilog.domain.notification.entity.enums.NotificationType.POST_INLINE_COMMENT;
import static kr.rilog.domain.notification.exception.NotificationErrorInformation.NOTIFICATION_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class NotificationServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime CREATED_AT = LocalDateTime.of(2026, 10, 10, 12, 0);
    private Long recipientId;
    private Long otherUserId;
    private static final Long SOURCE_ID = 10L;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void saveRecipients() {
        recipientId = userRepository.saveAndFlush(UserFixture.user(1001L, "notification-recipient")).getId();
        otherUserId = userRepository.saveAndFlush(UserFixture.user(1002L, "notification-other")).getId();
    }

    @Test
    @DisplayName("읽음 처리는 대상 알림만 변경하고 이미 읽은 알림의 시각은 유지한다.")
    void markAsReadMarksOnlyTargetAndPreservesExistingReadAt() {
        // given
        Notification target = saveUnreadNotification(recipientId);
        Notification other = saveUnreadNotification(recipientId);
        LocalDateTime firstReadAt = CREATED_AT.plusMinutes(1);
        Notification alreadyRead = Notification.create(recipientId, POST_INLINE_COMMENT, SOURCE_ID, CREATED_AT);
        alreadyRead.markAsRead(firstReadAt);
        notificationRepository.saveAndFlush(alreadyRead);

        // when
        notificationService.markAsRead(target.getId(), recipientId);
        notificationService.markAsRead(alreadyRead.getId(), recipientId);

        // then
        Notification found = findNotification(target);
        Notification otherFound = findNotification(other);
        Notification alreadyReadFound = findNotification(alreadyRead);
        assertSoftly(softly -> {
            softly.assertThat(found.getReadAt()).isNotNull();
            softly.assertThat(otherFound.getReadAt()).isNull();
            softly.assertThat(alreadyReadFound.getReadAt()).isEqualTo(firstReadAt);
        });
    }

    @Test
    @DisplayName("다른 사용자의 알림을 읽음 처리하면 알림을 찾을 수 없다는 예외가 발생하고 읽지 않은 상태로 남는다.")
    void markAsReadThrowsWhenNotificationBelongsToOtherUser() {
        // given
        Notification notification = saveUnreadNotification(recipientId);

        // when
        Throwable thrown = catchThrowable(() -> notificationService.markAsRead(notification.getId(), otherUserId));

        // then
        assertThat(thrown)
                .isInstanceOf(NotificationException.class)
                .hasMessage(NOTIFICATION_NOT_FOUND.getMessage());
        assertThat(findNotification(notification).getReadAt()).isNull();
    }

    private Notification saveUnreadNotification(Long recipientId) {
        return notificationRepository.saveAndFlush(
                Notification.create(recipientId, POST_INLINE_COMMENT, SOURCE_ID, CREATED_AT)
        );
    }

    private Notification findNotification(Notification notification) {
        return notificationRepository.findById(notification.getId()).orElseThrow();
    }

}
