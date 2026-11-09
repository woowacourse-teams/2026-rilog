package kr.rilog.domain.notification.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.entity.enums.NotificationSourceType;
import kr.rilog.domain.notification.entity.enums.NotificationType;
import kr.rilog.domain.notification.repository.NotificationRepository;
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

import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.notification.entity.enums.NotificationType.POST_INLINE_COMMENT;
import static kr.rilog.domain.notification.entity.enums.NotificationType.SELECTION_INLINE_COMMENT;
import static org.assertj.core.api.Assertions.assertThat;

class NotificationWriterIntegrationTest extends ServiceSupport {

    private static final List<NotificationType> INLINE_COMMENT_TYPES = List.of(
            POST_INLINE_COMMENT,
            SELECTION_INLINE_COMMENT
    );
    private static final LocalDateTime OCCURRED_AT = LocalDateTime.of(2026, 10, 10, 12, 0);
    private static final String CONTENT = "좋은 설명이에요.";

    @Autowired
    private NotificationWriter notificationWriter;

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

    @Test
    @DisplayName("게시글 작성자에게 인라인 댓글 알림을 저장하고 댓글 출처와 발생 시각을 기록한다.")
    void writePersistsPostWriterNotificationWithSourceAndOccurredAt() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User commenter = saveCompletedUser(2L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(postWriter))
                .singleElement()
                .satisfies(saved -> {
                    assertThat(saved.getType()).isEqualTo(POST_INLINE_COMMENT);
                    assertThat(saved.getSourceType()).isEqualTo(NotificationSourceType.INLINE_COMMENT);
                    assertThat(saved.getSourceId()).isEqualTo(anchor.getId());
                    assertThat(saved.getCreatedAt()).isEqualTo(OCCURRED_AT);
                });
    }

    @Test
    @DisplayName("같은 선택 범위에 먼저 댓글을 작성한 사용자에게 선택 범위 인라인 댓글 알림을 저장한다.")
    void writeNotifiesSelectionParticipantWithSelectionInlineCommentType() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User participant = saveCompletedUser(2L, "participant");
        User commenter = saveCompletedUser(3L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        saveAnchor(selection, participant);
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(participant))
                .extracting(Notification::getType)
                .containsExactly(SELECTION_INLINE_COMMENT);
    }

    private List<Notification> findNotificationsOf(User recipient) {
        return notificationRepository.findAll().stream()
                .filter(notification -> notification.getRecipientId().equals(recipient.getId()))
                .toList();
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

    private Post savePublicPost(User writer) {
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        return postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, writer));
    }

    private CommentAnchorSelection saveSelection(Post post) {
        return commentAnchorSelectionRepository.saveAndFlush(
                CommentAnchorFixture.activeAnchor(post, post.getUser()).getCommentAnchorSelection()
        );
    }

    private CommentAnchor saveAnchor(CommentAnchorSelection selection, User writer) {
        return commentAnchorRepository.saveAndFlush(CommentAnchor.create(selection, writer, CONTENT));
    }

}
