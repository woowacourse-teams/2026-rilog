package kr.rilog.domain.notification.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.vo.Selection;
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
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.CommentAnchorFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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
    @DisplayName("ALL 필터로 알림 목록을 조회하면 읽은 알림과 읽지 않은 알림을 모두 반환한다.")
    void readNotificationsWithAllIncludesReadAndUnread() {
        // given
        InlineCommentScenario scenario = savePublicRilogScenario();
        Notification unreadNotification = saveNotification(
                scenario.recipient(),
                scenario.anchor(),
                BASE_TIME
        );
        Notification readNotification = saveNotification(
                scenario.recipient(),
                scenario.anchor(),
                BASE_TIME.plusMinutes(1)
        );
        markAsRead(readNotification, BASE_TIME.plusMinutes(2));

        // when
        NotificationListResult result = notificationQueryService.readNotifications(
                DEFAULT_SEARCH,
                scenario.recipient().getId()
        );

        // then
        assertThat(result.notifications())
                .extracting(NotificationItemResult::notificationId)
                .containsExactlyInAnyOrder(unreadNotification.getId(), readNotification.getId());
    }

    @Test
    @DisplayName("UNREAD 필터로 알림 목록을 조회하면 읽지 않은 알림만 반환한다.")
    void readNotificationsWithUnreadExcludesReadNotifications() {
        // given
        InlineCommentScenario scenario = savePublicRilogScenario();
        Notification unreadNotification = saveNotification(
                scenario.recipient(),
                scenario.anchor(),
                BASE_TIME
        );
        Notification readNotification = saveNotification(
                scenario.recipient(),
                scenario.anchor(),
                BASE_TIME.plusMinutes(1)
        );
        markAsRead(readNotification, BASE_TIME.plusMinutes(2));
        NotificationSearchCommand unreadSearch = new NotificationSearchCommand(
                NotificationFilter.UNREAD,
                0,
                20
        );

        // when
        NotificationListResult result = notificationQueryService.readNotifications(
                unreadSearch,
                scenario.recipient().getId()
        );

        // then
        assertThat(result.notifications())
                .extracting(NotificationItemResult::notificationId)
                .containsExactly(unreadNotification.getId());
    }

    @Test
    @DisplayName("읽지 않은 알림 수를 조회하면 본인의 읽지 않은 알림만 센다.")
    void countUnreadNotificationsCountsOnlyOwnUnreadNotifications() {
        // given
        InlineCommentScenario scenario = savePublicRilogScenario();
        saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME);
        saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME.plusMinutes(1));
        Notification readNotification = saveNotification(
                scenario.recipient(),
                scenario.anchor(),
                BASE_TIME.plusMinutes(2)
        );
        markAsRead(readNotification, BASE_TIME.plusMinutes(3));
        saveNotification(scenario.commentWriter(), scenario.anchor(), BASE_TIME);

        // when
        long unreadCount = notificationQueryService.countUnreadNotifications(scenario.recipient().getId());

        // then
        assertThat(unreadCount).isEqualTo(2);
    }

    @Test
    @DisplayName("알림 목록은 생성 시각과 ID를 기준으로 최신 알림부터 반환한다.")
    void readNotificationsOrdersByCreatedAtAndIdDescending() {
        // given
        InlineCommentScenario scenario = savePublicRilogScenario();
        Notification older = saveNotification(
                scenario.recipient(),
                scenario.anchor(),
                BASE_TIME.minusMinutes(1)
        );
        Notification firstAtSameTime = saveNotification(
                scenario.recipient(),
                scenario.anchor(),
                BASE_TIME
        );
        Notification secondAtSameTime = saveNotification(
                scenario.recipient(),
                scenario.anchor(),
                BASE_TIME
        );

        // when
        NotificationListResult result = notificationQueryService.readNotifications(
                DEFAULT_SEARCH,
                scenario.recipient().getId()
        );

        // then
        assertThat(result.notifications())
                .extracting(NotificationItemResult::notificationId)
                .containsExactly(
                        secondAtSameTime.getId(),
                        firstAtSameTime.getId(),
                        older.getId()
                );
    }

    @Test
    @DisplayName("같은 출처를 가리키는 알림이 여러 개이면 각 알림에 출처 콘텐츠를 연결한다.")
    void readNotificationsAssociatesContentWithEachNotificationSharingSource() {
        // given
        InlineCommentScenario scenario = savePublicRilogScenario();
        saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME);
        saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME.plusMinutes(1));
        InlineCommentNotificationContent expectedContent = expectedContent(scenario);

        // when
        NotificationListResult result = notificationQueryService.readNotifications(
                DEFAULT_SEARCH,
                scenario.recipient().getId()
        );

        // then
        assertThat(result.notifications())
                .hasSize(2)
                .allSatisfy(item -> assertThat(item.content()).isEqualTo(expectedContent));
    }

    @ParameterizedTest
    @EnumSource(DeletedSource.class)
    @DisplayName("삭제된 인라인 댓글 출처는 삭제 상태와 기존 콘텐츠를 반환한다.")
    void readNotificationsReturnsDeletedStatusAndContent(DeletedSource deletedSource) {
        // given
        InlineCommentScenario scenario = savePublicRilogScenario();
        saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME);
        deleteSource(scenario, deletedSource);

        // when
        NotificationItemResult item = notificationQueryService.readNotifications(
                DEFAULT_SEARCH,
                scenario.recipient().getId()
        ).notifications().getFirst();

        // then
        assertSoftly(softly -> {
            softly.assertThat(item.sourceStatus()).isEqualTo(deletedSource.expectedStatus());
            softly.assertThat(item.content()).isNotNull();
        });
    }

    @Test
    @DisplayName("삭제된 팀 블로그의 인라인 댓글 알림은 블로그 삭제 상태와 기존 콘텐츠를 반환한다.")
    void readNotificationsReturnsDeletedBlogStatusForColog() {
        // given
        InlineCommentScenario scenario = savePublicCologScenario();
        saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME);
        scenario.colog().delete();
        blogRepository.saveAndFlush(scenario.colog());

        // when
        NotificationItemResult item = notificationQueryService.readNotifications(
                DEFAULT_SEARCH,
                scenario.recipient().getId()
        ).notifications().getFirst();

        // then
        assertSoftly(softly -> {
            softly.assertThat(item.sourceStatus()).isEqualTo(NotificationSourceStatus.BLOG_DELETED);
            softly.assertThat(item.content()).isNotNull();
        });
    }

    @Test
    @DisplayName("미발행 게시글의 인라인 댓글 알림은 콘텐츠를 노출하지 않는다.")
    void readNotificationsHidesContentForUnpublishedPost() {
        // given
        InlineCommentScenario scenario = saveDraftRilogScenario();
        saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME);

        // when
        NotificationItemResult item = notificationQueryService.readNotifications(
                DEFAULT_SEARCH,
                scenario.recipient().getId()
        ).notifications().getFirst();

        // then
        assertSoftly(softly -> {
            softly.assertThat(item.sourceStatus()).isEqualTo(NotificationSourceStatus.POST_UNAVAILABLE);
            softly.assertThat(item.content()).isNull();
        });
    }

    @Test
    @DisplayName("다른 사용자의 비공개 게시글 알림은 콘텐츠를 노출하지 않는다.")
    void readNotificationsHidesContentForInaccessiblePrivatePost() {
        // given
        InlineCommentScenario scenario = savePrivateRilogScenario(false);
        saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME);

        // when
        NotificationItemResult item = notificationQueryService.readNotifications(
                DEFAULT_SEARCH,
                scenario.recipient().getId()
        ).notifications().getFirst();

        // then
        assertSoftly(softly -> {
            softly.assertThat(item.sourceStatus()).isEqualTo(NotificationSourceStatus.POST_INACCESSIBLE);
            softly.assertThat(item.content()).isNull();
        });
    }

    @Test
    @DisplayName("작성자가 자신의 비공개 게시글 알림을 조회하면 콘텐츠를 반환한다.")
    void readNotificationsReturnsContentForPrivatePostOwner() {
        // given
        InlineCommentScenario scenario = savePrivateRilogScenario(true);
        saveNotification(scenario.recipient(), scenario.anchor(), BASE_TIME);

        // when
        NotificationItemResult item = notificationQueryService.readNotifications(
                DEFAULT_SEARCH,
                scenario.recipient().getId()
        ).notifications().getFirst();

        // then
        assertSoftly(softly -> {
            softly.assertThat(item.sourceStatus()).isEqualTo(NotificationSourceStatus.AVAILABLE);
            softly.assertThat(item.content()).isEqualTo(expectedContent(scenario));
        });
    }

    @Test
    @DisplayName("존재하지 않는 인라인 댓글 출처의 알림은 콘텐츠를 노출하지 않는다.")
    void readNotificationsHidesContentForMissingSource() {
        // given
        User recipient = saveCompletedUser(1L, "missing_recipient");
        notificationRepository.saveAndFlush(Notification.create(
                recipient.getId(),
                POST_INLINE_COMMENT,
                Long.MAX_VALUE,
                BASE_TIME
        ));

        // when
        NotificationItemResult item = notificationQueryService.readNotifications(
                DEFAULT_SEARCH,
                recipient.getId()
        ).notifications().getFirst();

        // then
        assertSoftly(softly -> {
            softly.assertThat(item.sourceStatus()).isEqualTo(NotificationSourceStatus.SOURCE_NOT_FOUND);
            softly.assertThat(item.content()).isNull();
        });
    }

    private InlineCommentScenario savePublicRilogScenario() {
        User recipient = saveCompletedUser(1L, "recipient");
        User postWriter = saveCompletedUser(2L, "post_writer");
        User commentWriter = saveCompletedUser(3L, "comment_writer");
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(postWriter));
        Post post = postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, postWriter));
        return saveInlineCommentScenario(recipient, commentWriter, rilog, null, post);
    }

    private InlineCommentScenario savePublicCologScenario() {
        User recipient = saveCompletedUser(1L, "recipient");
        User postWriter = saveCompletedUser(2L, "post_writer");
        User commentWriter = saveCompletedUser(3L, "comment_writer");
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(postWriter));
        Blog colog = blogRepository.saveAndFlush(
                Blog.createColog(postWriter, "notification_colog", BlogFixture.cologProfile())
        );
        Post post = postRepository.saveAndFlush(
                PostFixture.publicPublishedColog(rilog, colog, postWriter)
        );
        return saveInlineCommentScenario(recipient, commentWriter, rilog, colog, post);
    }

    private InlineCommentScenario saveDraftRilogScenario() {
        User recipient = saveCompletedUser(1L, "recipient");
        User postWriter = saveCompletedUser(2L, "post_writer");
        User commentWriter = saveCompletedUser(3L, "comment_writer");
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(postWriter));
        Post post = postRepository.saveAndFlush(PostFixture.publicDraftRilogPost(rilog, postWriter));
        return saveInlineCommentScenario(recipient, commentWriter, rilog, null, post);
    }

    private InlineCommentScenario savePrivateRilogScenario(boolean recipientOwnsPost) {
        User recipient = saveCompletedUser(1L, "recipient");
        User postWriter = recipientOwnsPost
                ? recipient
                : saveCompletedUser(2L, "post_writer");
        User commentWriter = saveCompletedUser(3L, "comment_writer");
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(postWriter));
        Post post = postRepository.saveAndFlush(PostFixture.privatePublishedRilogPost(rilog, postWriter));
        return saveInlineCommentScenario(recipient, commentWriter, rilog, null, post);
    }

    private InlineCommentScenario saveInlineCommentScenario(
            User recipient,
            User commentWriter,
            Blog rilog,
            Blog colog,
            Post post
    ) {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, commentWriter);
        CommentAnchorSelection selection = commentAnchorSelectionRepository.saveAndFlush(
                anchor.getCommentAnchorSelection()
        );
        CommentAnchor savedAnchor = commentAnchorRepository.saveAndFlush(anchor);
        return new InlineCommentScenario(
                recipient,
                commentWriter,
                rilog,
                colog,
                post,
                selection,
                savedAnchor
        );
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

    private InlineCommentNotificationContent expectedContent(InlineCommentScenario scenario) {
        Selection selection = scenario.selection().getSelection();
        Blog owningBlog = scenario.colog() == null ? scenario.rilog() : scenario.colog();
        return new InlineCommentNotificationContent(
                NotificationSourceStatus.AVAILABLE,
                scenario.post().getId(),
                scenario.post().getTitle(),
                owningBlog.getId(),
                owningBlog.getSlug(),
                scenario.selection().getId(),
                selection.getBlockId(),
                selection.getRange().getStartOffset(),
                selection.getRange().getEndOffset(),
                selection.getSelectedText(),
                scenario.selection().getStatus(),
                scenario.anchor().getId(),
                scenario.anchor().getContent(),
                scenario.commentWriter().getId(),
                scenario.commentWriter().getNickname(),
                scenario.commentWriter().getSlug(),
                scenario.commentWriter().getProfileImageUrl()
        );
    }

    private void deleteSource(InlineCommentScenario scenario, DeletedSource deletedSource) {
        switch (deletedSource) {
            case POST -> {
                scenario.post().delete();
                postRepository.saveAndFlush(scenario.post());
            }
            case SELECTION -> {
                scenario.selection().delete();
                commentAnchorSelectionRepository.saveAndFlush(scenario.selection());
            }
            case COMMENT -> {
                scenario.anchor().delete();
                commentAnchorRepository.saveAndFlush(scenario.anchor());
            }
            case ACTOR -> {
                scenario.commentWriter().delete();
                userRepository.saveAndFlush(scenario.commentWriter());
            }
            case BLOG -> {
                scenario.rilog().delete();
                blogRepository.saveAndFlush(scenario.rilog());
            }
        }
    }

    private enum DeletedSource {
        POST(NotificationSourceStatus.POST_DELETED),
        SELECTION(NotificationSourceStatus.SELECTION_DELETED),
        COMMENT(NotificationSourceStatus.COMMENT_DELETED),
        ACTOR(NotificationSourceStatus.ACTOR_DELETED),
        BLOG(NotificationSourceStatus.BLOG_DELETED),
        ;

        private final NotificationSourceStatus expectedStatus;

        DeletedSource(NotificationSourceStatus expectedStatus) {
            this.expectedStatus = expectedStatus;
        }

        private NotificationSourceStatus expectedStatus() {
            return expectedStatus;
        }
    }

    private record InlineCommentScenario(
            User recipient,
            User commentWriter,
            Blog rilog,
            Blog colog,
            Post post,
            CommentAnchorSelection selection,
            CommentAnchor anchor
    ) {
    }
}
