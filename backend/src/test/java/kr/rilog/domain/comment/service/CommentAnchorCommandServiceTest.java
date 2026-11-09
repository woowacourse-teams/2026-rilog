package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorAddCommand;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorCreateCommand;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorUpdateCommand;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorCreateResult;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorDeleteResult;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorUpdateResult;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static kr.rilog.domain.blog.entity.enums.BlogMemberStatus.ACTIVE;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_DELETE_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_NOT_FOUND;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_SELECTION_NOT_FOUND;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;
import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.TEXT_BLOCK_NOT_FOUND;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static kr.rilog.support.fixure.PostContentFixture.PARAGRAPH_BLOCK_ID;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentAnchorCommandServiceTest {

    private static final Long POST_ID = 1L;
    private static final Long WRITER_ID = 2L;
    private static final Long UNKNOWN_USER_ID = 3L;
    private static final Long ANCHOR_ID = 4L;
    private static final Long SELECTION_ID = 5L;
    private static final Long RILOG_ID = 6L;
    private static final Long COLOG_ID = 7L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 21, 12, 0);
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

    private CommentAnchorCommandService commentAnchorCommandService;
    private User writer;
    private Post post;

    @BeforeEach
    void setUp() {
        commentAnchorCommandService = new CommentAnchorCommandService(
                commentAnchorRepository, commentAnchorSelectionRepository, postRepository,
                userRepository, blogMemberRepository, notificationEventPublisher, Clock.fixed(NOW.toInstant(ZoneOffset.UTC), ZoneOffset.UTC)
        );
        writer = User.builder().id(WRITER_ID).build();
        post = Post.builder()
                .id(POST_ID)
                .user(writer)
                .rilog(Blog.builder().id(RILOG_ID).build())
                .status(PUBLISHED)
                .visibility(PostVisibility.PUBLIC)
                .content(content(paragraph("가나나다다라마")))
                .build();
    }

    @Test
    @DisplayName("존재하지 않는 사용자는 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsUnknownUser() {
        // given
        givenPublishedPost(post);
        when(userRepository.findById(UNKNOWN_USER_ID)).thenReturn(Optional.empty());
        var command = new CommentAnchorCreateCommand(PARAGRAPH_BLOCK_ID, 2, 4, "나다", CONTENT);

        // when
        Throwable thrown = catchThrowable(() -> commentAnchorCommandService.createCommentAnchor(POST_ID, UNKNOWN_USER_ID, command));

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
        givenPublishedPost(post);
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        var command = new CommentAnchorCreateCommand("not-exists", 2, 4, "나다", CONTENT);

        // when
        Throwable thrown = catchThrowable(() -> commentAnchorCommandService.createCommentAnchor(POST_ID, WRITER_ID, command));

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
        givenPublishedPost(post);
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        var command = new CommentAnchorCreateCommand(PARAGRAPH_BLOCK_ID, 2, 4, "가나", CONTENT);

        // when
        Throwable thrown = catchThrowable(() -> commentAnchorCommandService.createCommentAnchor(POST_ID, WRITER_ID, command));

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
        givenPublishedPost(post);
        Long selectionId = 10L;
        var command = new CommentAnchorAddCommand(CONTENT);
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(commentAnchorSelectionRepository.findByIdAndPostIdAndDeletedAtIsNull(selectionId, POST_ID))
                .thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(
                () -> commentAnchorCommandService.addCommentAnchor(POST_ID, WRITER_ID, selectionId, command)
        );

        // then
        assertThat(thrown)
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_SELECTION_NOT_FOUND.getMessage());
        verify(postRepository, never()).incrementCommentCount(anyLong());
        verifyNoInteractions(commentAnchorRepository, notificationEventPublisher);
    }

    @Test
    @DisplayName("같은 범위의 활성 선택이 없으면 새로운 ACTIVE 선택을 저장한다.")
    void createCommentAnchorCreatesNewActiveSelection() {
        // given
        givenPublishedPost(post);
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(postRepository.incrementCommentCount(POST_ID)).thenReturn(1);
        var command = new CommentAnchorCreateCommand(PARAGRAPH_BLOCK_ID, 2, 4, "나다", CONTENT);
        when(commentAnchorSelectionRepository.findAllActiveBySelection(POST_ID, PARAGRAPH_BLOCK_ID, 2, 4, "나다"))
                .thenReturn(List.of());
        when(commentAnchorSelectionRepository.save(any(CommentAnchorSelection.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(commentAnchorRepository.save(any(CommentAnchor.class)))
                .thenReturn(anchorBy(writer));

        // when
        CommentAnchorCreateResult result = commentAnchorCommandService.createCommentAnchor(POST_ID, WRITER_ID, command);

        // then
        ArgumentCaptor<CommentAnchorSelection> selectionCaptor = ArgumentCaptor.forClass(CommentAnchorSelection.class);
        verify(commentAnchorSelectionRepository).save(selectionCaptor.capture());
        CommentAnchorSelection savedSelection = selectionCaptor.getValue();
        assertThat(savedSelection.isActive()).isTrue();
        assertThat(savedSelection.getPost()).isSameAs(post);
        assertThat(savedSelection.getSelection()).isEqualTo(Selection.of(PARAGRAPH_BLOCK_ID, 2, 4, "나다"));

        ArgumentCaptor<CommentAnchor> anchorCaptor = ArgumentCaptor.forClass(CommentAnchor.class);
        verify(commentAnchorRepository).save(anchorCaptor.capture());
        assertThat(anchorCaptor.getValue().getCommentAnchorSelection()).isSameAs(savedSelection);
        assertThat(result.commentAnchorId()).isEqualTo(ANCHOR_ID);
    }

    @Test
    @DisplayName("발행된 게시글을 조회할 수 없으면 인라인 댓글을 작성하지 않는다.")
    void createCommentAnchorRejectsMissingPublishedPost() {
        // given
        when(postRepository.findDetailByIdAndStatus(POST_ID, PUBLISHED)).thenReturn(Optional.empty());
        var command = new CommentAnchorCreateCommand(PARAGRAPH_BLOCK_ID, 2, 4, "나다", CONTENT);

        // when
        Throwable thrown = catchThrowable(() -> commentAnchorCommandService.createCommentAnchor(POST_ID, WRITER_ID, command));

        // then
        assertThat(thrown).isInstanceOf(PostException.class).hasMessage(POST_NOT_FOUND.getMessage());
        assertNoCommentWrites();
        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("수정한 인라인 댓글을 응답에 반영한다.")
    void updateCommentAnchorReturnsUpdatedContent() {
        // given
        givenPublishedPost(post);
        CommentAnchor anchor = anchorBy(writer);
        when(commentAnchorRepository.findByIdAndPostId(ANCHOR_ID, POST_ID)).thenReturn(Optional.of(anchor));
        var command = new CommentAnchorUpdateCommand("수정 내용");

        // when
        CommentAnchorUpdateResult result = commentAnchorCommandService.updateCommentAnchor(
                POST_ID, ANCHOR_ID, WRITER_ID, command
        );

        // then
        assertThat(result.content()).isEqualTo(command.content());
    }

    @Test
    @DisplayName("발행된 게시글을 조회할 수 없으면 인라인 댓글을 수정하지 않는다.")
    void updateCommentAnchorRejectsMissingPublishedPost() {
        // given
        when(postRepository.findDetailByIdAndStatus(POST_ID, PUBLISHED)).thenReturn(Optional.empty());
        var command = new CommentAnchorUpdateCommand("수정 내용");

        // when
        Throwable thrown = catchThrowable(
                () -> commentAnchorCommandService.updateCommentAnchor(POST_ID, ANCHOR_ID, WRITER_ID, command)
        );

        // then
        assertThat(thrown).isInstanceOf(PostException.class).hasMessage(POST_NOT_FOUND.getMessage());
        verifyNoInteractions(commentAnchorRepository);
    }

    @Test
    @DisplayName("게시글에서 활성 댓글을 조회할 수 없으면 수정하지 않는다.")
    void updateCommentAnchorRejectsMissingAnchor() {
        // given
        givenPublishedPost(post);
        when(commentAnchorRepository.findByIdAndPostId(ANCHOR_ID, POST_ID)).thenReturn(Optional.empty());
        var command = new CommentAnchorUpdateCommand("수정 내용");

        // when
        Throwable thrown = catchThrowable(
                () -> commentAnchorCommandService.updateCommentAnchor(POST_ID, ANCHOR_ID, WRITER_ID, command)
        );

        // then
        assertThat(thrown).isInstanceOf(CommentException.class).hasMessage(COMMENT_ANCHOR_NOT_FOUND.getMessage());
        verify(commentAnchorRepository).findByIdAndPostId(ANCHOR_ID, POST_ID);
        verifyNoMoreInteractions(commentAnchorRepository);
    }

    @Test
    @DisplayName("발행된 게시글을 조회할 수 없으면 인라인 댓글을 삭제하거나 카운터를 차감하지 않는다.")
    void deleteCommentAnchorRejectsMissingPublishedPost() {
        // given
        when(postRepository.findDetailByIdAndStatus(POST_ID, PUBLISHED)).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> commentAnchorCommandService.deleteCommentAnchor(POST_ID, ANCHOR_ID, WRITER_ID));

        // then
        assertThat(thrown).isInstanceOf(PostException.class).hasMessage(POST_NOT_FOUND.getMessage());
        verifyNoInteractions(commentAnchorRepository);
        verify(postRepository, never()).decrementCommentCount(anyLong());
    }

    @Test
    @DisplayName("게시글에서 활성 댓글을 조회할 수 없으면 삭제하거나 카운터를 차감하지 않는다.")
    void deleteCommentAnchorRejectsMissingAnchor() {
        // given
        givenPublishedPost(post);
        when(commentAnchorRepository.findByIdAndPostId(ANCHOR_ID, POST_ID)).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> commentAnchorCommandService.deleteCommentAnchor(POST_ID, ANCHOR_ID, WRITER_ID));

        // then
        assertThat(thrown).isInstanceOf(CommentException.class).hasMessage(COMMENT_ANCHOR_NOT_FOUND.getMessage());
        verifyNoCommentDeletion();
    }

    @Test
    @DisplayName("Rilog 게시글 작성자는 다른 사람의 인라인 댓글을 삭제하고 카운터를 차감할 수 있다.")
    void deleteCommentAnchorAllowsRilogPostWriter() {
        // given
        givenPublishedPost(post);
        User commenter = User.builder().id(UNKNOWN_USER_ID).build();
        CommentAnchor anchor = anchorBy(commenter);
        when(commentAnchorRepository.findByIdAndPostId(ANCHOR_ID, POST_ID)).thenReturn(Optional.of(anchor));
        when(blogMemberRepository.findAllWithUserByBlogIdAndStatus(RILOG_ID, ACTIVE)).thenReturn(List.of());
        when(commentAnchorRepository.softDeleteIfActive(ANCHOR_ID, NOW)).thenReturn(1);
        when(postRepository.decrementCommentCount(POST_ID)).thenReturn(1);

        // when
        CommentAnchorDeleteResult result = commentAnchorCommandService.deleteCommentAnchor(POST_ID, ANCHOR_ID, WRITER_ID);

        // then
        assertThat(result).isEqualTo(new CommentAnchorDeleteResult(ANCHOR_ID, SELECTION_ID));
        verify(commentAnchorRepository).softDeleteIfActive(ANCHOR_ID, NOW);
        verify(postRepository).decrementCommentCount(POST_ID);
    }

    @Test
    @DisplayName("일반 Colog 멤버는 다른 사람의 인라인 댓글을 삭제할 수 없다.")
    void deleteCommentAnchorRejectsCologMember() {
        // given
        Blog colog = Blog.builder().id(COLOG_ID).build();
        Post cologPost = Post.builder().id(POST_ID).user(writer).colog(colog).build();
        givenPublishedPost(cologPost);
        User commenter = User.builder().id(8L).build();
        User requester = User.builder().id(UNKNOWN_USER_ID).build();
        when(commentAnchorRepository.findByIdAndPostId(ANCHOR_ID, POST_ID)).thenReturn(Optional.of(anchorBy(commenter)));
        BlogMember member = BlogMember.invite(colog, requester, "멤버", BlogPermission.MEMBER, NOW);
        when(blogMemberRepository.findAllWithUserByBlogIdAndStatus(COLOG_ID, ACTIVE)).thenReturn(List.of(member));

        // when
        Throwable thrown = catchThrowable(
                () -> commentAnchorCommandService.deleteCommentAnchor(POST_ID, ANCHOR_ID, requester.getId())
        );

        // then
        assertThat(thrown).isInstanceOf(CommentException.class).hasMessage(COMMENT_ANCHOR_DELETE_FORBIDDEN.getMessage());
        verifyNoCommentDeletion();
    }

    @Test
    @DisplayName("외부인은 다른 사람의 인라인 댓글을 삭제할 수 없다.")
    void deleteCommentAnchorRejectsUnrelatedUser() {
        // given
        givenPublishedPost(post);
        User commenter = User.builder().id(8L).build();
        when(commentAnchorRepository.findByIdAndPostId(ANCHOR_ID, POST_ID)).thenReturn(Optional.of(anchorBy(commenter)));
        when(blogMemberRepository.findAllWithUserByBlogIdAndStatus(RILOG_ID, ACTIVE)).thenReturn(List.of());

        // when
        Throwable thrown = catchThrowable(
                () -> commentAnchorCommandService.deleteCommentAnchor(POST_ID, ANCHOR_ID, UNKNOWN_USER_ID)
        );

        // then
        assertThat(thrown).isInstanceOf(CommentException.class).hasMessage(COMMENT_ANCHOR_DELETE_FORBIDDEN.getMessage());
        verifyNoCommentDeletion();
    }

    private void givenPublishedPost(Post publishedPost) {
        when(postRepository.findDetailByIdAndStatus(POST_ID, PUBLISHED)).thenReturn(Optional.of(publishedPost));
    }

    private CommentAnchor anchorBy(User commenter) {
        return CommentAnchor.builder()
                .id(ANCHOR_ID)
                .writer(commenter)
                .commentAnchorSelection(CommentAnchorSelection.builder().id(SELECTION_ID).build())
                .createdAt(NOW)
                .build();
    }

    private void verifyNoCommentDeletion() {
        verify(commentAnchorRepository).findByIdAndPostId(ANCHOR_ID, POST_ID);
        verifyNoMoreInteractions(commentAnchorRepository);
        verify(postRepository, never()).decrementCommentCount(anyLong());
    }

    private void assertNoCommentWrites() {
        verify(postRepository, never()).incrementCommentCount(anyLong());
        verifyNoInteractions(commentAnchorRepository, commentAnchorSelectionRepository, notificationEventPublisher);
    }

}
