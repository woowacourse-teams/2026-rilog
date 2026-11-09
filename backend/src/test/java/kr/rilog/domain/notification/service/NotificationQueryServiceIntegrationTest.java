package kr.rilog.domain.notification.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.repository.NotificationRepository;
import kr.rilog.domain.notification.service.content.InlineCommentNotificationContent;
import kr.rilog.domain.notification.service.content.NotificationSourceStatus;
import kr.rilog.domain.notification.service.dto.command.NotificationFilter;
import kr.rilog.domain.notification.service.dto.command.NotificationSearchCommand;
import kr.rilog.domain.notification.service.dto.result.NotificationListResult;
import kr.rilog.domain.notification.service.dto.result.NotificationListResult.NotificationItemResult;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.CommentAnchorFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.LocalDateTime;

import static kr.rilog.domain.notification.entity.enums.NotificationType.POST_INLINE_COMMENT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class NotificationQueryServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime BASE_TIME = LocalDateTime.of(2026, 10, 10, 12, 0);
    private static final NotificationSearchCommand DEFAULT_SEARCH = new NotificationSearchCommand(
            NotificationFilter.ALL,
            0,
            20
    );

    @Autowired
    private NotificationQueryService notificationQueryService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentAnchorSelectionRepository commentAnchorSelectionRepository;

    @Autowired
    private CommentAnchorRepository commentAnchorRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("ALL 필터는 같은 출처를 가리키는 읽은 알림과 읽지 않은 알림에 각각 콘텐츠를 연결한다.")
    void readNotificationsWithAllIncludesReadAndUnreadWithContent() {
        // given
        InlineCommentScenario scenario = savePublicRilogScenario();
        Notification firstUnread = saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME);
        Notification secondUnread = saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME.plusSeconds(30));
        Notification readNotification = saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME.plusMinutes(1));
        markAsRead(readNotification, BASE_TIME.plusMinutes(2));

        // when
        NotificationListResult result = notificationQueryService.readNotifications(DEFAULT_SEARCH, scenario.recipient().getId());

        // then
        assertThat(result.notifications())
                .extracting(NotificationItemResult::notificationId)
                .containsExactlyInAnyOrder(firstUnread.getId(), secondUnread.getId(), readNotification.getId());
        assertThat(result.notifications())
                .allSatisfy(item -> {
                    assertThat(item.sourceStatus()).isEqualTo(NotificationSourceStatus.AVAILABLE);
                    assertThat(item.content())
                            .isInstanceOfSatisfying(InlineCommentNotificationContent.class, content ->
                                    assertThat(content.commentAnchorId()).isEqualTo(scenario.anchor().getId()));
                });
    }

    @Test
    @DisplayName("UNREAD 목록은 요청자에게 온 읽지 않은 알림만 반환한다.")
    void readUnreadNotificationsReturnsOnlyUnreadNotificationsOfRecipient() {
        // given
        InlineCommentScenario scenario = savePublicRilogScenario();
        Notification unread = saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME);
        Notification read = saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME.plusSeconds(1));
        markAsRead(read, BASE_TIME.plusSeconds(2));
        saveNotification(scenario.commentWriter(), scenario.anchor(), BASE_TIME.plusSeconds(3));
        NotificationSearchCommand search = new NotificationSearchCommand(NotificationFilter.UNREAD, 0, 20);

        // when
        NotificationListResult result = notificationQueryService.readNotifications(search, scenario.recipient().getId());

        // then
        assertThat(result.notifications()).extracting(NotificationItemResult::notificationId).containsExactly(unread.getId());
    }

    @Test
    @DisplayName("미발행 게시글의 인라인 댓글 알림은 콘텐츠를 노출하지 않는다.")
    void readNotificationsHidesContentForUnpublishedPost() {
        // given
        InlineCommentScenario scenario = saveDraftRilogScenario();
        saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME);

        // when
        NotificationItemResult item = notificationQueryService.readNotifications(DEFAULT_SEARCH, scenario.recipient().getId())
                .notifications()
                .getFirst();

        // then
        assertSoftly(softly -> {
            softly.assertThat(item.sourceStatus()).isEqualTo(NotificationSourceStatus.POST_UNAVAILABLE);
            softly.assertThat(item.content()).isNull();
        });
    }

    private InlineCommentScenario savePublicRilogScenario() {
        User recipient = saveCompletedUser(1L, "recipient");
        User postWriter = saveCompletedUser(2L, "post_writer");
        User commentWriter = saveCompletedUser(3L, "comment_writer");
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(postWriter));
        Post post = postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, postWriter));
        return saveInlineCommentScenario(recipient, commentWriter, post);
    }

    private InlineCommentScenario saveDraftRilogScenario() {
        User recipient = saveCompletedUser(1L, "recipient");
        User postWriter = saveCompletedUser(2L, "post_writer");
        User commentWriter = saveCompletedUser(3L, "comment_writer");
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(postWriter));
        Post post = postRepository.saveAndFlush(PostFixture.publicDraftRilogPost(rilog, postWriter));
        return saveInlineCommentScenario(recipient, commentWriter, post);
    }

    private InlineCommentScenario saveInlineCommentScenario(
            User recipient,
            User commentWriter,
            Post post
    ) {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, commentWriter);
        commentAnchorSelectionRepository.saveAndFlush(anchor.getCommentAnchorSelection());
        CommentAnchor savedAnchor = commentAnchorRepository.saveAndFlush(anchor);
        return new InlineCommentScenario(recipient, commentWriter, savedAnchor);
    }

    private User saveCompletedUser(long githubId, String slug) {
        User user = UserFixture.user(githubId, "github_" + githubId);
        user.completeOnboarding(
                "사용자" + githubId,
                slug,
                "소개",
                "https://example.com/" + slug + ".png",
                "https://github.com/" + slug,
                slug + "@example.com"
        );
        return userRepository.saveAndFlush(user);
    }

    private Notification saveNotification(
            User recipient,
            CommentAnchor anchor,
            LocalDateTime createdAt
    ) {
        return notificationRepository.saveAndFlush(Notification.create(
                recipient.getId(),
                POST_INLINE_COMMENT,
                anchor.getId(),
                createdAt
        ));
    }

    private void markAsRead(Notification notification, LocalDateTime readAt) {
        jdbcTemplate.update(
                "update notification set read_at = ? where id = ?",
                Timestamp.valueOf(readAt),
                notification.getId()
        );
    }

    private record InlineCommentScenario(
            User recipient,
            User commentWriter,
            CommentAnchor anchor
    ) {
    }
}
