package kr.rilog.domain.notification.service;

import kr.rilog.domain.notification.exception.NotificationException;
import kr.rilog.domain.notification.repository.NotificationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static kr.rilog.domain.notification.exception.NotificationErrorInformation.NOTIFICATION_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    @DisplayName("존재하지 않는 알림을 읽음 처리하면 알림을 찾을 수 없다는 예외가 발생한다.")
    void markAsReadThrowsWhenNotificationDoesNotExist() {
        Long notificationId = 1L;
        Long recipientId = 2L;
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAsRead(notificationId, recipientId))
                .isInstanceOf(NotificationException.class)
                .hasMessage(NOTIFICATION_NOT_FOUND.getMessage());
    }
}
