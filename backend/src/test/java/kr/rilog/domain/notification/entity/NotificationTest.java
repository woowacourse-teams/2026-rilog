package kr.rilog.domain.notification.entity;

import kr.rilog.domain.notification.entity.enums.NotificationSourceType;
import kr.rilog.domain.notification.entity.enums.NotificationType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.LocalDateTime;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class NotificationTest {

    private static final LocalDateTime CREATED_AT = LocalDateTime.of(2026, 10, 10, 12, 0);

    @ParameterizedTest
    @MethodSource("notificationTypesAndSourceTypes")
    @DisplayName("알림을 생성하면 알림 타입에 대응하는 출처 타입을 가진다.")
    void createDerivesSourceTypeFromNotificationType(
            NotificationType type,
            NotificationSourceType expectedSourceType
    ) {
        Notification notification = Notification.create(1L, type, 2L, CREATED_AT);

        assertThat(notification.getSourceType()).isEqualTo(expectedSourceType);
    }

    @Test
    @DisplayName("알림을 생성하면 읽지 않은 상태로 시작한다.")
    void createStartsUnread() {
        Notification notification = Notification.create(
                1L,
                NotificationType.POST_INLINE_COMMENT,
                2L,
                CREATED_AT
        );

        assertSoftly(softly -> {
            softly.assertThat(notification.getReadAt()).isNull();
            softly.assertThat(notification.isRead()).isFalse();
        });
    }

    @Test
    @DisplayName("읽지 않은 알림을 읽음 처리하면 전달받은 시각으로 읽은 상태가 된다.")
    void markAsReadSetsReadAt() {
        Notification notification = Notification.create(
                1L,
                NotificationType.POST_INLINE_COMMENT,
                2L,
                CREATED_AT
        );
        LocalDateTime readAt = CREATED_AT.plusMinutes(1);

        notification.markAsRead(readAt);

        assertSoftly(softly -> {
            softly.assertThat(notification.isRead()).isTrue();
            softly.assertThat(notification.getReadAt()).isEqualTo(readAt);
        });
    }

    @Test
    @DisplayName("이미 읽은 알림을 다시 읽음 처리해도 처음 읽은 시각을 유지한다.")
    void markAsReadKeepsFirstReadAt() {
        Notification notification = Notification.create(
                1L,
                NotificationType.POST_INLINE_COMMENT,
                2L,
                CREATED_AT
        );
        LocalDateTime firstReadAt = CREATED_AT.plusMinutes(1);
        notification.markAsRead(firstReadAt);

        notification.markAsRead(firstReadAt.plusMinutes(1));

        assertThat(notification.getReadAt()).isEqualTo(firstReadAt);
    }

    @Test
    @DisplayName("알림의 수신자인지 판단한다.")
    void isRecipientChecksRecipientId() {
        Notification notification = Notification.create(
                1L,
                NotificationType.POST_INLINE_COMMENT,
                2L,
                CREATED_AT
        );

        assertSoftly(softly -> {
            softly.assertThat(notification.isRecipient(1L)).isTrue();
            softly.assertThat(notification.isRecipient(2L)).isFalse();
        });
    }

    private static Stream<Arguments> notificationTypesAndSourceTypes() {
        return Stream.of(
                Arguments.of(
                        NotificationType.POST_INLINE_COMMENT,
                        NotificationSourceType.INLINE_COMMENT
                ),
                Arguments.of(
                        NotificationType.SELECTION_INLINE_COMMENT,
                        NotificationSourceType.INLINE_COMMENT
                ),
                Arguments.of(
                        NotificationType.SUBSCRIBED_BLOG_POST_PUBLISHED,
                        NotificationSourceType.POST
                )
        );
    }
}
