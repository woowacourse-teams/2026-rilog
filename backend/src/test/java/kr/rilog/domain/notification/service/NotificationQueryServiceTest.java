package kr.rilog.domain.notification.service;

import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.repository.InlineCommentNotificationQueryRepository;
import kr.rilog.domain.notification.repository.NotificationRepository;
import kr.rilog.domain.notification.repository.projection.InlineCommentNotificationRow;
import kr.rilog.domain.notification.service.content.InlineCommentNotificationContent;
import kr.rilog.domain.notification.service.content.NotificationSourceStatus;
import kr.rilog.domain.notification.service.content.reader.InlineCommentNotificationContentReader;
import kr.rilog.domain.notification.service.content.reader.NotificationContentReadStrategy;
import kr.rilog.domain.notification.service.dto.command.NotificationFilter;
import kr.rilog.domain.notification.service.dto.command.NotificationSearchCommand;
import kr.rilog.domain.notification.service.dto.result.NotificationListResult;
import kr.rilog.domain.notification.service.dto.result.NotificationListResult.NotificationItemResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;

import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.notification.entity.enums.NotificationType.POST_INLINE_COMMENT;
import static kr.rilog.domain.notification.service.content.NotificationSourceStatus.SOURCE_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NotificationQueryServiceTest {

    private static final long RECIPIENT_ID = 1L;
    private static final long SOURCE_ID = 2L;
    private static final LocalDateTime CREATED_AT = LocalDateTime.of(2026, 10, 10, 12, 0);
    private static final NotificationSearchCommand ALL = new NotificationSearchCommand(NotificationFilter.ALL, 0, 20);

    private final NotificationRepository repository = mock(NotificationRepository.class);
    private final InlineCommentNotificationQueryRepository sourceRepository = mock(InlineCommentNotificationQueryRepository.class);
    private final NotificationQueryService service = new NotificationQueryService(
            repository, new NotificationContentReadStrategy(List.of(new InlineCommentNotificationContentReader(sourceRepository)))
    );

    @Test
    @DisplayName("UNREAD 필터는 저장소에 읽지 않은 알림 조회를 요청한다.")
    void readNotificationsRequestsUnreadFilter() {
        // given
        NotificationSearchCommand search = new NotificationSearchCommand(NotificationFilter.UNREAD, 1, 10);
        PageRequest pageable = PageRequest.of(1, 10);
        Notification unread = Notification.create(RECIPIENT_ID, POST_INLINE_COMMENT, SOURCE_ID, CREATED_AT);
        when(repository.findAllByRecipientId(RECIPIENT_ID, true, pageable))
                .thenReturn(new SliceImpl<>(List.of(unread), pageable, false));

        // when
        NotificationListResult result = service.readNotifications(search, RECIPIENT_ID);

        // then
        assertThat(result.notifications()).singleElement().satisfies(item -> assertThat(item.read()).isFalse());
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.size()).isEqualTo(10);
    }

    @Test
    @DisplayName("요청한 수신자의 읽지 않은 알림 수를 반환한다.")
    void countUnreadNotificationsReturnsRecipientCount() {
        // given
        when(repository.countByRecipientIdAndReadAtIsNull(RECIPIENT_ID)).thenReturn(2L);

        // when
        long unreadCount = service.countUnreadNotifications(RECIPIENT_ID);

        // then
        assertThat(unreadCount).isEqualTo(2);
    }

    @Test
    @DisplayName("존재하지 않는 인라인 댓글 출처의 알림은 콘텐츠를 노출하지 않는다.")
    void readNotificationsHidesContentForMissingSource() {
        // given
        stubAllNotifications();
        when(sourceRepository.findAllBySourceIds(List.of(SOURCE_ID), RECIPIENT_ID)).thenReturn(List.of());

        // when
        NotificationItemResult item = service.readNotifications(ALL, RECIPIENT_ID).notifications().getFirst();

        // then
        assertThat(item.sourceStatus()).isEqualTo(SOURCE_NOT_FOUND);
        assertThat(item.content()).isNull();
    }

    @ParameterizedTest
    @EnumSource(value = NotificationSourceStatus.class,
            names = {"AVAILABLE", "POST_DELETED", "COMMENT_DELETED", "ACTOR_DELETED", "POST_INACCESSIBLE"})
    @DisplayName("조회된 출처 상태와 콘텐츠를 알림 응답에 연결한다.")
    void readNotificationsExposesContentForAllowedStatus(NotificationSourceStatus status) {
        // given
        stubAllNotifications();
        InlineCommentNotificationRow row = new InlineCommentNotificationRow(
                SOURCE_ID, status.name(), 3L, "게시글", 4L, "rilog", 5L,
                "block", 0, 2, "선택", AnchorStatus.ACTIVE, "댓글",
                6L, "작성자", "writer", "https://example.com/writer.png"
        );
        when(sourceRepository.findAllBySourceIds(List.of(SOURCE_ID), RECIPIENT_ID)).thenReturn(List.of(row));

        // when
        NotificationItemResult item = service.readNotifications(ALL, RECIPIENT_ID).notifications().getFirst();

        // then
        assertThat(item.sourceStatus()).isEqualTo(status);
        assertThat(item.content()).isEqualTo(new InlineCommentNotificationContent(
                status, 3L, "게시글", 4L, "rilog", 5L, "block", 0, 2, "선택",
                AnchorStatus.ACTIVE, SOURCE_ID, "댓글", 6L, "작성자", "writer", "https://example.com/writer.png"
        ));
    }

    private void stubAllNotifications() {
        PageRequest pageable = PageRequest.of(0, 20);
        Notification notification = Notification.create(RECIPIENT_ID, POST_INLINE_COMMENT, SOURCE_ID, CREATED_AT);
        when(repository.findAllByRecipientId(RECIPIENT_ID, false, pageable))
                .thenReturn(new SliceImpl<>(List.of(notification), pageable, false));
    }
}
