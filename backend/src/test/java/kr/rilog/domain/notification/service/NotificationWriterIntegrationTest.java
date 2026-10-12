package kr.rilog.domain.notification.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.entity.enums.NotificationSourceType;
import kr.rilog.domain.notification.entity.enums.NotificationType;
import kr.rilog.domain.notification.repository.NotificationRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.TextBlock;
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
    @DisplayName("다른 사용자가 인라인 댓글을 작성하면 게시글 작성자에게 게시글 인라인 댓글 알림을 저장한다.")
    void writeNotifiesPostWriterWithPostInlineCommentType() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User commenter = saveCompletedUser(2L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(postWriter))
                .extracting(Notification::getType)
                .containsExactly(POST_INLINE_COMMENT);
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

    @Test
    @DisplayName("인라인 댓글 알림은 작성된 인라인 댓글을 출처로 저장한다.")
    void writePersistsCommentAnchorAsSource() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User commenter = saveCompletedUser(2L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        Notification saved = findNotificationsOf(postWriter).getFirst();
        assertThat(saved.getSourceType()).isEqualTo(NotificationSourceType.INLINE_COMMENT);
        assertThat(saved.getSourceId()).isEqualTo(anchor.getId());
    }

    @Test
    @DisplayName("알림의 생성 시각은 전달받은 발생 시각으로 저장한다.")
    void writePersistsOccurredAtAsCreatedAt() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User commenter = saveCompletedUser(2L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(postWriter).getFirst().getCreatedAt()).isEqualTo(OCCURRED_AT);
    }

    @Test
    @DisplayName("인라인 댓글을 작성한 본인에게는 알림을 저장하지 않는다.")
    void writeExcludesActor() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User commenter = saveCompletedUser(2L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        saveAnchor(selection, commenter);
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(commenter)).isEmpty();
    }

    @Test
    @DisplayName("게시글 작성자가 자신의 게시글에 인라인 댓글을 작성하면 게시글 작성자에게 알림을 저장하지 않는다.")
    void writeExcludesPostWriterCommentingOnOwnPost() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        CommentAnchor anchor = saveAnchor(selection, postWriter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), postWriter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(postWriter)).isEmpty();
    }

    @Test
    @DisplayName("게시글 작성자가 같은 선택 범위에 댓글을 작성했더라도 게시글 인라인 댓글 알림 한 건만 저장한다.")
    void writePersistsSinglePostInlineCommentNotificationForPostWriterParticipatingInSelection() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User commenter = saveCompletedUser(2L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        saveAnchor(selection, postWriter);
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(postWriter))
                .extracting(Notification::getType)
                .containsExactly(POST_INLINE_COMMENT);
    }

    @Test
    @DisplayName("같은 선택 범위에 댓글을 여러 개 작성한 사용자에게도 알림을 한 건만 저장한다.")
    void writePersistsSingleNotificationForParticipantWithMultipleComments() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User participant = saveCompletedUser(2L, "participant");
        User commenter = saveCompletedUser(3L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        saveAnchor(selection, participant);
        saveAnchor(selection, participant);
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(participant)).hasSize(1);
    }

    @Test
    @DisplayName("다른 선택 범위에 댓글을 작성한 사용자에게는 알림을 저장하지 않는다.")
    void writeExcludesWriterOfOtherSelection() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User otherSelectionWriter = saveCompletedUser(2L, "other_writer");
        User commenter = saveCompletedUser(3L, "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection selection = saveSelection(post);
        saveAnchor(saveOtherSelection(post), otherSelectionWriter);
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(otherSelectionWriter)).isEmpty();
    }

    @Test
    @DisplayName("같은 선택 범위에서 삭제된 댓글의 작성자에게는 알림을 저장하지 않는다.")
    void writeExcludesWriterOfDeletedComment() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User deletedCommentWriter = saveCompletedUser(2L, "deleted_writer");
        User commenter = saveCompletedUser(3L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        CommentAnchor deletedAnchor = saveAnchor(selection, deletedCommentWriter);
        deletedAnchor.delete();
        commentAnchorRepository.saveAndFlush(deletedAnchor);
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(deletedCommentWriter)).isEmpty();
    }

    @Test
    @DisplayName("같은 선택 범위에 댓글을 작성한 뒤 탈퇴한 사용자에게는 알림을 저장하지 않는다.")
    void writeExcludesWithdrawnSelectionParticipant() {
        // given
        User postWriter = saveCompletedUser(1L, "post_writer");
        User withdrawnParticipant = saveCompletedUser(2L, "withdrawn_user");
        User commenter = saveCompletedUser(3L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(postWriter));
        saveAnchor(selection, withdrawnParticipant);
        withdraw(withdrawnParticipant);
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(withdrawnParticipant)).isEmpty();
    }

    @Test
    @DisplayName("탈퇴한 게시글 작성자에게는 알림을 저장하지 않는다.")
    void writeExcludesWithdrawnPostWriter() {
        // given
        User withdrawnPostWriter = saveCompletedUser(1L, "withdrawn_writer");
        User commenter = saveCompletedUser(2L, "commenter");
        CommentAnchorSelection selection = saveSelection(savePublicPost(withdrawnPostWriter));
        withdraw(withdrawnPostWriter);
        CommentAnchor anchor = saveAnchor(selection, commenter);

        // when
        notificationWriter.write(INLINE_COMMENT_TYPES, anchor.getId(), commenter.getId(), OCCURRED_AT);

        // then
        assertThat(findNotificationsOf(withdrawnPostWriter)).isEmpty();
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

    private void withdraw(User user) {
        user.delete();
        userRepository.saveAndFlush(user);
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

    private CommentAnchorSelection saveOtherSelection(Post post) {
        Selection otherSelection = Selection.select(
                new TextBlock("block-a", "paragraph", "가나나다다라마"),
                0,
                2,
                "가나"
        );
        return commentAnchorSelectionRepository.saveAndFlush(CommentAnchorSelection.create(post, otherSelection));
    }

    private CommentAnchor saveAnchor(CommentAnchorSelection selection, User writer) {
        return commentAnchorRepository.saveAndFlush(CommentAnchor.create(selection, writer, CONTENT));
    }

}
