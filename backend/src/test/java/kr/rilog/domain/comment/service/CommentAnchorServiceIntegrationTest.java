package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorAddCommand;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorCreateCommand;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorUpdateCommand;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorCreateResult;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorListResult;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorSidebarResult;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorUpdateResult;
import kr.rilog.domain.notification.event.NotificationEvent;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;

import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_DELETE_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_NOT_FOUND;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_AUTHOR_FORBIDDEN;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.support.fixure.PostContentFixture.PARAGRAPH_BLOCK_ID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@RecordApplicationEvents
class CommentAnchorServiceIntegrationTest extends ServiceSupport {

    private static final String PARAGRAPH_TEXT = "가나나다다라마";
    private static final int SELECTED_START = 2;
    private static final int SELECTED_END = 4;
    private static final String SELECTED_TEXT = "나다";
    private static final String CONTENT = "좋은 설명이에요.";
    private static final String UPDATED_CONTENT = "수정한 설명이에요.";

    @Autowired
    private CommentAnchorCommandService commentAnchorCommandService;

    @Autowired
    private CommentAnchorQueryService commentAnchorQueryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentAnchorRepository commentAnchorRepository;

    @Autowired
    private CommentAnchorSelectionRepository commentAnchorSelectionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("인라인 댓글을 작성하면 작성된 댓글과 작성자를 담은 알림 이벤트를 발행한다.")
    void createCommentAnchorPublishesNotificationEvent(ApplicationEvents applicationEvents) {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);

        // when
        CommentAnchorCreateResult result = commentAnchorCommandService.createCommentAnchor(post.getId(), commenter.getId(), selectedCommand());

        // then
        assertThat(applicationEvents.stream(NotificationEvent.CommentAnchorCreated.class))
                .singleElement()
                .satisfies(event -> {
                    assertThat(event.commentAnchorId()).isEqualTo(result.commentAnchorId());
                    assertThat(event.writerId()).isEqualTo(commenter.getId());
                });
    }

    @Test
    @DisplayName("같은 selection에 인라인 댓글을 연속으로 작성하면 ACTIVE selection을 재사용한다.")
    void createCommentAnchorReusesActiveSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User firstCommenter = saveCompletedUser(101L, "첫댓글작성자", "first_commenter");
        User secondCommenter = saveCompletedUser(102L, "둘댓글작성자", "second_commenter");
        Post post = savePublicPost(postWriter);

        // when
        CommentAnchorCreateResult firstResult = commentAnchorCommandService.createCommentAnchor(post.getId(), firstCommenter.getId(), selectedCommand());
        CommentAnchorCreateResult secondResult = commentAnchorCommandService.createCommentAnchor(post.getId(), secondCommenter.getId(), selectedCommand());

        // then
        Long firstSelectionId = getSelectionId(firstResult);
        Long secondSelectionId = getSelectionId(secondResult);
        assertThat(secondSelectionId).isEqualTo(firstSelectionId);
        assertThat(commentAnchorSelectionRepository.count()).isOne();
    }

    @Test
    @DisplayName("같은 ACTIVE selection이 중복되어 있으면 가장 먼저 생성된 selection을 재사용한다.")
    void createCommentAnchorUsesFirstDuplicatedActiveSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection firstSelection = saveActiveSelection(post);
        saveActiveSelection(post);

        // when
        CommentAnchorCreateResult result = commentAnchorCommandService.createCommentAnchor(post.getId(), commenter.getId(), selectedCommand());

        // then
        assertThat(getSelectionId(result)).isEqualTo(firstSelection.getId());
    }

    @Test
    @DisplayName("비공개 게시글에는 작성자가 아닌 사용자가 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsOtherUserOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePrivatePost(postWriter);

        // when - then
        assertThatThrownBy(() -> commentAnchorCommandService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand()))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("기존 ACTIVE selection에 인라인 댓글을 추가하면 추가된 댓글과 작성자를 담은 알림 이벤트를 발행한다.")
    void addCommentAnchorPublishesNotificationEvent(ApplicationEvents applicationEvents) {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection selection = saveActiveSelection(post);
        var command = new CommentAnchorAddCommand(CONTENT);

        // when
        CommentAnchorCreateResult result = commentAnchorCommandService.addCommentAnchor(
                post.getId(), commenter.getId(), selection.getId(), command
        );

        // then
        assertThat(applicationEvents.stream(NotificationEvent.CommentAnchorCreated.class))
                .singleElement()
                .satisfies(event -> {
                    assertThat(event.commentAnchorId()).isEqualTo(result.commentAnchorId());
                    assertThat(event.writerId()).isEqualTo(commenter.getId());
                });
    }

    @Test
    @DisplayName("비공개 게시글의 기존 selection에는 작성자가 아닌 사용자가 인라인 댓글을 추가할 수 없다.")
    void addCommentAnchorRejectsOtherUserOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePrivatePost(postWriter);
        CommentAnchorSelection selection = saveActiveSelection(post);
        var command = new CommentAnchorAddCommand(CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorCommandService.addCommentAnchor(
                post.getId(), commenter.getId(), selection.getId(), command
        ))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("ORPHANED selection에도 인라인 댓글을 추가할 수 있다.")
    void addCommentAnchorAllowsOrphanedSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection orphanedSelection = saveActiveSelection(post);
        orphanedSelection.orphan(LocalDateTime.of(2026, 9, 22, 12, 0));
        commentAnchorSelectionRepository.saveAndFlush(orphanedSelection);
        var command = new CommentAnchorAddCommand(CONTENT);

        // when
        CommentAnchorCreateResult result = commentAnchorCommandService.addCommentAnchor(post.getId(), commenter.getId(), orphanedSelection.getId(), command);
        CommentAnchor saved = commentAnchorRepository.findById(result.commentAnchorId()).orElseThrow();

        // then
        assertThat(saved.getCommentAnchorSelection().getId()).isEqualTo(orphanedSelection.getId());
    }

    @Test
    @DisplayName("인라인 댓글 목록은 저장된 활성 블로그 멤버십을 작성자의 멤버 배지에 반영한다.")
    void readCommentAnchorsIncludesActiveBlogMemberBadge() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        saveActiveBlogMember(post, commenter, BlogPermission.MEMBER);
        CommentAnchorSelection anchorSelection = saveActiveSelection(post);
        saveAnchor(anchorSelection, commenter, CONTENT);

        // when
        CommentAnchorListResult result = commentAnchorQueryService.readCommentAnchors(post.getId(), commenter.getId());

        // then
        CommentAnchorListResult.CommentAnchorResult commentAnchor = firstCommentAnchorOf(result);
        assertThat(commentAnchor.author().blogMember()).isTrue();
    }

    @Test
    @DisplayName("비공개 게시글의 인라인 댓글은 작성자가 아니면 조회할 수 없다.")
    void readCommentAnchorsRejectsOtherUserOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User requester = saveCompletedUser(101L, "조회자", "requester");
        Post post = savePrivatePost(postWriter);

        // when - then
        assertThatThrownBy(() -> commentAnchorQueryService.readCommentAnchors(post.getId(), requester.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("사이드바 인라인 댓글 목록은 ORPHANED selection을 포함하고 삭제된 인라인 댓글은 제외한다.")
    void readSidebarCommentAnchorsIncludesOrphanedSelectionAndExcludesDeletedAnchors() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection orphanedSelection = saveActiveSelection(post);
        orphanedSelection.orphan(LocalDateTime.of(2026, 9, 21, 12, 0));
        commentAnchorSelectionRepository.saveAndFlush(orphanedSelection);
        CommentAnchor visible = saveAnchor(orphanedSelection, commenter, "보이는 댓글");
        CommentAnchor deleted = saveAnchor(orphanedSelection, commenter, "삭제된 댓글");
        deleted.delete();
        commentAnchorRepository.saveAndFlush(deleted);

        // when
        CommentAnchorSidebarResult result = commentAnchorQueryService.readSidebarCommentAnchors(post.getId(), null);

        // then
        CommentAnchorSidebarResult.SidebarAnchorGroupResult group = result.anchorGroups().getFirst();
        assertThat(group.state()).isEqualTo(AnchorStatus.ORPHANED);
        assertThat(group.commentAnchors())
                .extracting(CommentAnchorListResult.CommentAnchorResult::commentAnchorId)
                .containsExactly(visible.getId());
    }

    @Test
    @DisplayName("사이드바 인라인 댓글 목록은 요청자의 수정 삭제 권한을 제공한다.")
    void readSidebarCommentAnchorsIncludesPermissions() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection anchorSelection = saveActiveSelection(post);
        saveAnchor(anchorSelection, commenter, CONTENT);

        // when
        CommentAnchorSidebarResult result = commentAnchorQueryService.readSidebarCommentAnchors(post.getId(), postWriter.getId());

        // then
        CommentAnchorListResult.CommentAnchorResult commentAnchor = result.anchorGroups().getFirst()
                .commentAnchors().getFirst();
        assertThat(commentAnchor.author().postAuthor()).isFalse();
        assertThat(commentAnchor.canEdit()).isFalse();
        assertThat(commentAnchor.canDelete()).isTrue();
    }

    @Test
    @DisplayName("비공개 게시글의 사이드바 인라인 댓글은 작성자가 아니면 조회할 수 없다.")
    void readSidebarCommentAnchorsRejectsOtherUserOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User requester = saveCompletedUser(101L, "조회자", "requester");
        Post post = savePrivatePost(postWriter);

        // when - then
        assertThatThrownBy(() -> commentAnchorQueryService.readSidebarCommentAnchors(post.getId(), requester.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("작성자가 인라인 댓글을 수정하면 변경한 본문을 저장하고 갱신된 수정 상태를 반환한다.")
    void updateCommentAnchorPersistsContent() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when
        CommentAnchorUpdateResult result = commentAnchorCommandService.updateCommentAnchor(post.getId(), anchor.getId(), commenter.getId(), new CommentAnchorUpdateCommand(UPDATED_CONTENT));
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();

        // then
        assertThat(saved.getContent()).isEqualTo(UPDATED_CONTENT);
        assertThat(result.edited()).isTrue();
        assertThat(saved.isEdited()).isTrue();
    }

    @Test
    @DisplayName("기존과 같은 본문으로 수정하면 수정된 댓글이 되지 않는다.")
    void updateCommentAnchorWithSameContentDoesNotMarkEdited() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when
        CommentAnchorUpdateResult result = commentAnchorCommandService.updateCommentAnchor(post.getId(), anchor.getId(), commenter.getId(), new CommentAnchorUpdateCommand(CONTENT));
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();

        // then
        assertThat(result.edited()).isFalse();
        assertThat(saved.isEdited()).isFalse();
    }

    @Test
    @DisplayName("ORPHANED selection의 인라인 댓글도 작성자는 본문을 수정할 수 있다.")
    void updateCommentAnchorAllowsOrphanedSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection orphanedSelection = saveActiveSelection(post);
        orphanedSelection.orphan(LocalDateTime.of(2026, 9, 22, 12, 0));
        commentAnchorSelectionRepository.saveAndFlush(orphanedSelection);
        CommentAnchor anchor = saveAnchor(orphanedSelection, commenter, CONTENT);

        // when
        commentAnchorCommandService.updateCommentAnchor(post.getId(), anchor.getId(), commenter.getId(), new CommentAnchorUpdateCommand(UPDATED_CONTENT));
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();

        // then
        assertThat(saved.getContent()).isEqualTo(UPDATED_CONTENT);
    }

    @Test
    @DisplayName("게시글 작성자라도 다른 사용자의 인라인 댓글은 수정할 수 없다.")
    void updateCommentAnchorRejectsPostWriterForOthersAnchor() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);
        var command = new CommentAnchorUpdateCommand(UPDATED_CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorCommandService.updateCommentAnchor(post.getId(), anchor.getId(), postWriter.getId(), command))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_AUTHOR_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.findById(anchor.getId()).orElseThrow().getContent()).isEqualTo(CONTENT);
    }

    @Test
    @DisplayName("비공개 게시글에서는 게시글 작성자가 아닌 사용자가 자신의 인라인 댓글을 수정할 수 없다.")
    void updateCommentAnchorRejectsOtherUserOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePrivatePost(postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);
        var command = new CommentAnchorUpdateCommand(UPDATED_CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorCommandService.updateCommentAnchor(post.getId(), anchor.getId(), commenter.getId(), command))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.findById(anchor.getId()).orElseThrow().getContent()).isEqualTo(CONTENT);
    }

    @Test
    @DisplayName("인라인 댓글 목록은 본문이 수정된 댓글만 수정된 댓글로 표시한다.")
    void readCommentAnchorsMarksOnlyEditedAnchors() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection anchorSelection = saveActiveSelection(post);
        CommentAnchor edited = saveAnchor(anchorSelection, commenter, "수정할 댓글");
        CommentAnchor unedited = saveAnchor(anchorSelection, commenter, "그대로인 댓글");
        commentAnchorCommandService.updateCommentAnchor(post.getId(), edited.getId(), commenter.getId(), new CommentAnchorUpdateCommand(UPDATED_CONTENT));

        // when
        CommentAnchorListResult result = commentAnchorQueryService.readCommentAnchors(post.getId(), null);

        // then
        List<CommentAnchorListResult.CommentAnchorResult> commentAnchors = result.blocks().getFirst()
                .anchorGroups().getFirst()
                .commentAnchors();
        assertThat(findCommentAnchor(commentAnchors, edited).edited()).isTrue();
        assertThat(findCommentAnchor(commentAnchors, unedited).edited()).isFalse();
    }

    @Test
    @DisplayName("작성자가 마지막 인라인 댓글을 삭제하면 댓글만 소프트 삭제된다.")
    void deleteCommentAnchorSoftDeletesByWriter() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection anchorSelection = saveActiveSelection(post);
        CommentAnchor anchor = saveAnchor(anchorSelection, commenter, CONTENT);

        // when
        commentAnchorCommandService.deleteCommentAnchor(post.getId(), anchor.getId(), commenter.getId());
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();
        CommentAnchorSelection savedSelection = commentAnchorSelectionRepository
                .findById(anchorSelection.getId()).orElseThrow();

        // then
        assertThat(saved.isDeleted()).isTrue();
        assertThat(savedSelection.getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("ORPHANED selection의 인라인 댓글도 작성자는 삭제할 수 있다.")
    void deleteCommentAnchorAllowsOrphanedSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection orphanedSelection = saveActiveSelection(post);
        orphanedSelection.orphan(LocalDateTime.of(2026, 9, 22, 12, 0));
        commentAnchorSelectionRepository.saveAndFlush(orphanedSelection);
        CommentAnchor anchor = saveAnchor(orphanedSelection, commenter, CONTENT);

        // when
        commentAnchorCommandService.deleteCommentAnchor(post.getId(), anchor.getId(), commenter.getId());
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();

        // then
        assertThat(saved.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("Colog OWNER는 다른 사용자의 인라인 댓글을 삭제할 수 있다.")
    void deleteCommentAnchorAllowsCologOwner() {
        // given
        User owner = saveCompletedUser(100L, "소유자", "colog_owner");
        User postWriter = saveCompletedUser(101L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(102L, "댓글작성자", "commenter");
        Blog colog = saveColog(owner, "team_colog");
        saveCologMember(colog, postWriter, BlogPermission.MEMBER);
        Post post = savePublicCologPost(colog, postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when
        commentAnchorCommandService.deleteCommentAnchor(post.getId(), anchor.getId(), owner.getId());
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();

        // then
        assertThat(saved.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("Colog ADMIN은 다른 사용자의 인라인 댓글을 삭제할 수 있다.")
    void deleteCommentAnchorAllowsCologAdmin() {
        // given
        User owner = saveCompletedUser(100L, "소유자", "colog_owner");
        User postWriter = saveCompletedUser(101L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(102L, "댓글작성자", "commenter");
        User admin = saveCompletedUser(103L, "관리자", "colog_admin");
        Blog colog = saveColog(owner, "team_colog");
        saveCologMember(colog, postWriter, BlogPermission.MEMBER);
        saveCologMember(colog, admin, BlogPermission.ADMIN);
        Post post = savePublicCologPost(colog, postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when
        commentAnchorCommandService.deleteCommentAnchor(post.getId(), anchor.getId(), admin.getId());
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();

        // then
        assertThat(saved.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("Colog MEMBER 권한의 게시글 작성자는 다른 사용자의 인라인 댓글을 삭제할 수 있다.")
    void deleteCommentAnchorAllowsCologMemberPostWriter() {
        // given
        User owner = saveCompletedUser(100L, "소유자", "colog_owner");
        User postWriter = saveCompletedUser(101L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(102L, "댓글작성자", "commenter");
        Blog colog = saveColog(owner, "team_colog");
        saveCologMember(colog, postWriter, BlogPermission.MEMBER);
        Post post = savePublicCologPost(colog, postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when
        commentAnchorCommandService.deleteCommentAnchor(post.getId(), anchor.getId(), postWriter.getId());
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();

        // then
        assertThat(saved.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("Colog를 탈퇴한 ADMIN은 다른 사용자의 인라인 댓글을 삭제할 수 없다.")
    void deleteCommentAnchorRejectsLeftCologAdmin() {
        // given
        User owner = saveCompletedUser(100L, "소유자", "colog_owner");
        User postWriter = saveCompletedUser(101L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(102L, "댓글작성자", "commenter");
        User leftAdmin = saveCompletedUser(103L, "탈퇴관리자", "left_admin");
        Blog colog = saveColog(owner, "team_colog");
        saveCologMember(colog, postWriter, BlogPermission.MEMBER);
        BlogMember leftAdminMember = saveCologMember(colog, leftAdmin, BlogPermission.ADMIN);
        leftAdminMember.leaveBySelf();
        blogMemberRepository.saveAndFlush(leftAdminMember);
        Post post = savePublicCologPost(colog, postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorCommandService.deleteCommentAnchor(post.getId(), anchor.getId(), leftAdmin.getId()))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_DELETE_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.findById(anchor.getId()).orElseThrow().isDeleted()).isFalse();
    }

    @Test
    @DisplayName("게시글이 속하지 않은 다른 Colog의 ADMIN은 인라인 댓글을 삭제할 수 없다.")
    void deleteCommentAnchorRejectsAdminOfAnotherColog() {
        // given
        User owner = saveCompletedUser(100L, "소유자", "colog_owner");
        User postWriter = saveCompletedUser(101L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(102L, "댓글작성자", "commenter");
        User otherOwner = saveCompletedUser(103L, "다른소유자", "other_owner");
        User otherAdmin = saveCompletedUser(104L, "다른관리자", "other_admin");
        Blog colog = saveColog(owner, "team_colog");
        Blog otherColog = saveColog(otherOwner, "other_colog");
        saveCologMember(colog, postWriter, BlogPermission.MEMBER);
        saveCologMember(otherColog, otherAdmin, BlogPermission.ADMIN);
        Post post = savePublicCologPost(colog, postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorCommandService.deleteCommentAnchor(post.getId(), anchor.getId(), otherAdmin.getId()))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_DELETE_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.findById(anchor.getId()).orElseThrow().isDeleted()).isFalse();
    }

    @Test
    @DisplayName("비공개 게시글의 작성자는 다른 사용자의 인라인 댓글을 삭제할 수 있다.")
    void deleteCommentAnchorAllowsPostWriterOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePrivatePost(postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when
        commentAnchorCommandService.deleteCommentAnchor(post.getId(), anchor.getId(), postWriter.getId());
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();

        // then
        assertThat(saved.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("비공개 게시글에서는 게시글 작성자가 아닌 사용자가 자신의 인라인 댓글을 삭제할 수 없다.")
    void deleteCommentAnchorRejectsCommenterOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePrivatePost(postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorCommandService.deleteCommentAnchor(post.getId(), anchor.getId(), commenter.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.findById(anchor.getId()).orElseThrow().isDeleted()).isFalse();
    }

    @Test
    @DisplayName("비공개 Colog 게시글에서는 Colog ADMIN도 인라인 댓글을 삭제할 수 없다.")
    void deleteCommentAnchorRejectsCologAdminOnPrivatePost() {
        // given
        User owner = saveCompletedUser(100L, "소유자", "colog_owner");
        User postWriter = saveCompletedUser(101L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(102L, "댓글작성자", "commenter");
        User admin = saveCompletedUser(103L, "관리자", "colog_admin");
        Blog colog = saveColog(owner, "team_colog");
        saveCologMember(colog, postWriter, BlogPermission.MEMBER);
        saveCologMember(colog, admin, BlogPermission.ADMIN);
        Post post = savePrivateCologPost(colog, postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorCommandService.deleteCommentAnchor(post.getId(), anchor.getId(), admin.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.findById(anchor.getId()).orElseThrow().isDeleted()).isFalse();
    }

    @Test
    @DisplayName("이미 삭제된 인라인 댓글은 삭제할 수 없다.")
    void deleteCommentAnchorRejectsDeletedAnchor() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchor deletedAnchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);
        deletedAnchor.delete();
        commentAnchorRepository.saveAndFlush(deletedAnchor);

        // when - then
        assertThatThrownBy(() -> commentAnchorCommandService.deleteCommentAnchor(post.getId(), deletedAnchor.getId(), commenter.getId()))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_NOT_FOUND.getMessage());
    }

    private CommentAnchorCreateCommand selectedCommand() {
        return new CommentAnchorCreateCommand(PARAGRAPH_BLOCK_ID, SELECTED_START, SELECTED_END, SELECTED_TEXT, CONTENT);
    }

    private Selection selection() {
        return Selection.of(PARAGRAPH_BLOCK_ID, SELECTED_START, SELECTED_END, SELECTED_TEXT);
    }

    private CommentAnchorSelection saveActiveSelection(Post post) {
        return commentAnchorSelectionRepository.saveAndFlush(CommentAnchorSelection.create(post, selection()));
    }

    private CommentAnchor saveAnchor(CommentAnchorSelection selection, User writer, String content) {
        CommentAnchor anchor = commentAnchorRepository.saveAndFlush(CommentAnchor.create(selection, writer, content));
        jdbcTemplate.update("UPDATE post SET comment_count = comment_count + 1 WHERE id = ?", selection.getPost().getId());
        return anchor;
    }

    private BlogMember saveActiveBlogMember(Post post, User user, BlogPermission permission) {
        return blogMemberRepository.saveAndFlush(BlogMember.invite(
                post.getRilog(),
                user,
                "테스트 역할",
                permission,
                LocalDateTime.of(2026, 9, 17, 10, 10)
        ));
    }

    private Blog saveColog(User owner, String slug) {
        Blog colog = blogRepository.saveAndFlush(BlogFixture.createPersistableColog(owner, slug));
        blogMemberRepository.saveAndFlush(BlogMember.createOwner(
                colog,
                owner,
                LocalDateTime.of(2026, 9, 17, 10, 0)
        ));
        return colog;
    }

    private BlogMember saveCologMember(Blog colog, User user, BlogPermission permission) {
        return blogMemberRepository.saveAndFlush(BlogMember.invite(
                colog,
                user,
                "테스트 역할",
                permission,
                LocalDateTime.of(2026, 9, 17, 10, 10)
        ));
    }

    private Post savePublicCologPost(Blog colog, User writer) {
        Blog rilog = saveRilog(writer);
        return postRepository.saveAndFlush(PostFixture.publicPublishedColog(rilog, colog, writer));
    }

    private Post savePrivateCologPost(Blog colog, User writer) {
        Blog rilog = saveRilog(writer);
        return postRepository.saveAndFlush(PostFixture.privatePublishedCologPost(rilog, colog, writer));
    }

    private CommentAnchorListResult.CommentAnchorResult firstCommentAnchorOf(CommentAnchorListResult result) {
        return result.blocks().getFirst()
                .anchorGroups().getFirst()
                .commentAnchors().getFirst();
    }

    private CommentAnchorListResult.CommentAnchorResult findCommentAnchor(
            List<CommentAnchorListResult.CommentAnchorResult> commentAnchors,
            CommentAnchor target
    ) {
        return commentAnchors.stream()
                .filter(commentAnchor -> commentAnchor.commentAnchorId().equals(target.getId()))
                .findFirst()
                .orElseThrow();
    }

    private Long getSelectionId(CommentAnchorCreateResult result) {
        return commentAnchorRepository.findById(result.commentAnchorId())
                .orElseThrow()
                .getCommentAnchorSelection()
                .getId();
    }

    private User saveCompletedUser(Long githubId, String nickname, String slug) {
        User user = User.createPendingGithubUser(githubId, slug, "https://example.com/" + slug + ".png");
        user.completeOnboarding(
                nickname,
                slug,
                nickname + " 소개입니다.",
                "https://example.com/" + slug + ".png",
                "https://github.com/" + slug,
                slug + "@example.com"
        );
        return userRepository.saveAndFlush(user);
    }

    private Blog saveRilog(User owner) {
        return blogRepository.saveAndFlush(Blog.createRilog(owner, "https://rilog.example.com/" + owner.getSlug()));
    }

    private Post savePublicPost(User writer) {
        Blog rilog = saveRilog(writer);
        return postRepository.saveAndFlush(
                PostFixture.publicPublishedRilogPostWithParagraph(rilog, writer, PARAGRAPH_TEXT));
    }

    private Post savePrivatePost(User writer) {
        Blog rilog = saveRilog(writer);
        return postRepository.saveAndFlush(
                PostFixture.privatePublishedRilogPostWithParagraph(rilog, writer, PARAGRAPH_TEXT));
    }

}
