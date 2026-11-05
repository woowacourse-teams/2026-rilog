package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorAddCommand;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorCreateCommand;
import kr.rilog.domain.notification.event.NotificationEventPublisher;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.util.Optional;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_SELECTION_NOT_FOUND;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;
import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.exception.PostErrorInformation.TEXT_BLOCK_NOT_FOUND;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static kr.rilog.support.fixure.PostContentFixture.PARAGRAPH_BLOCK_ID;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentAnchorServiceTest {

    private static final Long POST_ID = 1L;
    private static final Long WRITER_ID = 2L;
    private static final Long UNKNOWN_USER_ID = 3L;
    private static final String CONTENT = "좋은 설명이에요.";

    @Mock
    private CommentAnchorRepository commentAnchorRepository;

    @Mock
    private CommentAnchorSelectionRepository commentAnchorSelectionRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    @Mock
    private NotificationEventPublisher notificationEventPublisher;

    private CommentAnchorService commentAnchorService;
    private User writer;

    @BeforeEach
    void setUp() {
        commentAnchorService = new CommentAnchorService(
                commentAnchorRepository, commentAnchorSelectionRepository, postRepository,
                userRepository, blogMemberRepository, notificationEventPublisher, Clock.systemUTC()
        );
        writer = User.builder().id(WRITER_ID).build();
        Post post = Post.builder()
                .id(POST_ID)
                .user(writer)
                .status(PUBLISHED)
                .visibility(PostVisibility.PUBLIC)
                .content(content(paragraph("가나나다다라마")))
                .build();
        when(postRepository.findDetailByIdAndStatus(POST_ID, PUBLISHED)).thenReturn(Optional.of(post));
    }

    @Test
    @DisplayName("존재하지 않는 사용자는 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsUnknownUser() {
        // given
        when(userRepository.findById(UNKNOWN_USER_ID)).thenReturn(Optional.empty());
        var command = new CommentAnchorCreateCommand(PARAGRAPH_BLOCK_ID, 2, 4, "나다", CONTENT);

        // when
        Throwable thrown = catchThrowable(() -> commentAnchorService.createCommentAnchor(POST_ID, UNKNOWN_USER_ID, command));

        // then
        assertThat(thrown)
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
        assertNoCommentWrites();
    }

    @Test
    @DisplayName("본문에 없는 블록 ID이면 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsUnknownBlockId() {
        // given
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        var command = new CommentAnchorCreateCommand("not-exists", 2, 4, "나다", CONTENT);

        // when
        Throwable thrown = catchThrowable(() -> commentAnchorService.createCommentAnchor(POST_ID, WRITER_ID, command));

        // then
        assertThat(thrown)
                .isInstanceOf(PostException.class)
                .hasMessage(TEXT_BLOCK_NOT_FOUND.getMessage());
        assertNoCommentWrites();
    }

    @Test
    @DisplayName("선택 문자열이 블록의 해당 범위와 다르면 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsSelectedTextDifferentFromServerText() {
        // given
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        var command = new CommentAnchorCreateCommand(PARAGRAPH_BLOCK_ID, 2, 4, "가나", CONTENT);

        // when
        Throwable thrown = catchThrowable(() -> commentAnchorService.createCommentAnchor(POST_ID, WRITER_ID, command));

        // then
        assertThat(thrown)
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
        assertNoCommentWrites();
    }

    @Test
    @DisplayName("존재하지 않는 선택 범위에는 인라인 댓글을 추가할 수 없다.")
    void addCommentAnchorRejectsUnknownSelection() {
        // given
        Long selectionId = 10L;
        var command = new CommentAnchorAddCommand(CONTENT);
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(commentAnchorSelectionRepository.findByIdAndPostIdAndDeletedAtIsNull(selectionId, POST_ID))
                .thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(
                () -> commentAnchorService.addCommentAnchor(POST_ID, WRITER_ID, selectionId, command)
        );

        // then
        assertThat(thrown)
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_SELECTION_NOT_FOUND.getMessage());
        verify(postRepository, never()).incrementCommentCount(anyLong());
        verifyNoInteractions(commentAnchorRepository, notificationEventPublisher);
    }

    private void assertNoCommentWrites() {
        verify(postRepository, never()).incrementCommentCount(anyLong());
        verifyNoInteractions(commentAnchorRepository, commentAnchorSelectionRepository, notificationEventPublisher);
    }

}
