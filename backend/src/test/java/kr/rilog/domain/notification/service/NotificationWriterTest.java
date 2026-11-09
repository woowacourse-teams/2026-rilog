package kr.rilog.domain.notification.service;

import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.entity.enums.NotificationType;
import kr.rilog.domain.notification.repository.NotificationRepository;
import kr.rilog.domain.notification.service.recipient.NotificationRecipientFindStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.notification.entity.enums.NotificationType.POST_INLINE_COMMENT;
import static kr.rilog.domain.notification.entity.enums.NotificationType.SELECTION_INLINE_COMMENT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.assertArg;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationWriterTest {

    private static final long SOURCE_ID = 1L;
    private static final long ACTOR_ID = 2L;
    private static final long RECIPIENT_ID = 3L;
    private static final LocalDateTime OCCURRED_AT = LocalDateTime.of(2026, 10, 10, 12, 0);

    private final NotificationRecipientFindStrategy recipients = mock(NotificationRecipientFindStrategy.class);
    private final NotificationRepository repository = mock(NotificationRepository.class);
    private final NotificationWriter writer = new NotificationWriter(recipients, repository);

    @ParameterizedTest
    @EnumSource(value = NotificationType.class, names = {"POST_INLINE_COMMENT", "SELECTION_INLINE_COMMENT"})
    @DisplayName("게시글 작성자 또는 선택 범위 참여자가 댓글 작성자 본인이면 알림에서 제외한다.")
    void writeExcludesActor(NotificationType type) {
        // given
        when(recipients.findRecipientIds(type, SOURCE_ID)).thenReturn(List.of(ACTOR_ID, RECIPIENT_ID));

        // when
        writer.write(List.of(type), SOURCE_ID, ACTOR_ID, OCCURRED_AT);

        // then
        verify(repository).saveAll(assertArg((Iterable<Notification> saved) ->
                assertThat(saved).extracting(Notification::getRecipientId).containsExactly(RECIPIENT_ID)));
    }

    @Test
    @DisplayName("게시글 작성자가 선택 범위에도 참여했다면 게시글 인라인 댓글 알림 한 건만 저장한다.")
    void writePersistsSinglePostInlineCommentNotificationForPostWriterParticipatingInSelection() {
        // given
        when(recipients.findRecipientIds(POST_INLINE_COMMENT, SOURCE_ID)).thenReturn(List.of(RECIPIENT_ID));
        when(recipients.findRecipientIds(SELECTION_INLINE_COMMENT, SOURCE_ID)).thenReturn(List.of(RECIPIENT_ID, RECIPIENT_ID));

        // when
        writer.write(List.of(POST_INLINE_COMMENT, SELECTION_INLINE_COMMENT), SOURCE_ID, ACTOR_ID, OCCURRED_AT);

        // then
        verify(repository).saveAll(assertArg((Iterable<Notification> saved) ->
                assertThat(saved).singleElement().satisfies(notification -> {
                    assertThat(notification.getRecipientId()).isEqualTo(RECIPIENT_ID);
                    assertThat(notification.getType()).isEqualTo(POST_INLINE_COMMENT);
                })));
    }
}
