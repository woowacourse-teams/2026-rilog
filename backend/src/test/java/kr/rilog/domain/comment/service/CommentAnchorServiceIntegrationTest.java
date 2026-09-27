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
import kr.rilog.domain.comment.service.dto.result.CommentAnchorUpdateResult;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_NOT_FOUND;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_SELECTION_NOT_FOUND;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_AUTHOR_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_CONTENT;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.domain.post.exception.PostErrorInformation.TEXT_BLOCK_NOT_FOUND;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static kr.rilog.support.fixure.PostContentFixture.PARAGRAPH_BLOCK_ID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommentAnchorServiceIntegrationTest extends ServiceSupport {

    private static final String PARAGRAPH_TEXT = "가나나다다라마";
    private static final int SELECTED_START = 2;
    private static final int SELECTED_END = 4;
    private static final String SELECTED_TEXT = "나다";
    private static final String CONTENT = "좋은 설명이에요.";
    private static final String UPDATED_CONTENT = "수정한 설명이에요.";

    @Autowired
    private CommentAnchorService commentAnchorService;

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

    @Test
    @DisplayName("공개 게시글에 작성자가 아닌 로그인 사용자가 인라인 댓글을 작성하면 선택 위치와 본문을 저장한다.")
    void createCommentAnchorPersistsSelectionAndContent() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);

        // when
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand());
        CommentAnchor saved = commentAnchorRepository.findById(result.commentAnchorId()).orElseThrow();

        // then
        CommentAnchorSelection savedSelection = commentAnchorSelectionRepository.findById(
                saved.getCommentAnchorSelection().getId()
        ).orElseThrow();
        Selection expectedSelection = Selection.of(
                PARAGRAPH_BLOCK_ID,
                SELECTED_START,
                SELECTED_END,
                SELECTED_TEXT
        );
        assertThat(savedSelection.getSelection()).isEqualTo(expectedSelection);
        assertThat(saved.getContent()).isEqualTo(CONTENT);
    }

    @Test
    @DisplayName("인라인 댓글을 작성하면 요청한 게시글과 요청자가 작성자로 저장된다.")
    void createCommentAnchorAssociatesPostAndWriter() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);

        // when
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand());
        CommentAnchor saved = commentAnchorRepository.findById(result.commentAnchorId()).orElseThrow();

        // then
        CommentAnchorSelection savedSelection = commentAnchorSelectionRepository.findById(
                saved.getCommentAnchorSelection().getId()
        ).orElseThrow();
        assertThat(savedSelection.getPost().getId()).isEqualTo(post.getId());
        assertThat(saved.getWriter().getId()).isEqualTo(commenter.getId());
    }

    @Test
    @DisplayName("인라인 댓글을 작성하면 ACTIVE 상태로 저장된다.")
    void createCommentAnchorPersistsActiveStatus() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);

        // when
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand());
        CommentAnchor saved = commentAnchorRepository.findById(result.commentAnchorId()).orElseThrow();
        CommentAnchorSelection savedSelection = commentAnchorSelectionRepository.findById(
                saved.getCommentAnchorSelection().getId()
        ).orElseThrow();

        // then
        assertThat(savedSelection.getStatus()).isEqualTo(AnchorStatus.ACTIVE);
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
        CommentAnchorCreateResult firstResult = commentAnchorService.createCommentAnchor(
                post.getId(), firstCommenter.getId(), selectedCommand());
        CommentAnchorCreateResult secondResult = commentAnchorService.createCommentAnchor(
                post.getId(), secondCommenter.getId(), selectedCommand());

        // then
        Long firstSelectionId = getSelectionId(firstResult);
        Long secondSelectionId = getSelectionId(secondResult);
        assertThat(secondSelectionId).isEqualTo(firstSelectionId);
        assertThat(commentAnchorSelectionRepository.count()).isOne();
    }

    @Test
    @DisplayName("댓글이 없는 ACTIVE selection도 같은 selection의 인라인 댓글 작성 시 재사용한다.")
    void createCommentAnchorReusesActiveSelectionWithoutComments() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection existingSelection = saveActiveSelection(post);

        // when
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand());

        // then
        assertThat(getSelectionId(result)).isEqualTo(existingSelection.getId());
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
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand());

        // then
        assertThat(getSelectionId(result)).isEqualTo(firstSelection.getId());
    }

    @Test
    @DisplayName("같은 selection이 ORPHANED 상태이면 새로운 ACTIVE selection을 저장한다.")
    void createCommentAnchorDoesNotReuseOrphanedSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection orphanedSelection = CommentAnchorSelection.create(post, selection());
        orphanedSelection.orphan(LocalDateTime.of(2026, 9, 21, 12, 0));
        commentAnchorSelectionRepository.saveAndFlush(orphanedSelection);

        // when
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand());

        // then
        CommentAnchorSelection activeSelection = commentAnchorSelectionRepository.findById(
                getSelectionId(result)
        ).orElseThrow();
        assertThat(activeSelection.getId()).isNotEqualTo(orphanedSelection.getId());
        assertThat(activeSelection.getStatus()).isEqualTo(AnchorStatus.ACTIVE);
    }

    @Test
    @DisplayName("비공개 게시글의 작성자는 자기 게시글에 인라인 댓글을 작성할 수 있다.")
    void createCommentAnchorAllowsPostWriterOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Post post = savePrivatePost(postWriter);

        // when
        CommentAnchorCreateResult result = commentAnchorService.createCommentAnchor(
                post.getId(), postWriter.getId(), selectedCommand());

        // then
        assertThat(commentAnchorRepository.findById(result.commentAnchorId())).isPresent();
    }

    @Test
    @DisplayName("비공개 게시글에는 작성자가 아닌 사용자가 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsOtherUserOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePrivatePost(postWriter);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(
                post.getId(), commenter.getId(), selectedCommand()))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("발행되지 않은 게시글에는 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsDraftPost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Blog rilog = saveRilog(postWriter);
        Post draft = postRepository.saveAndFlush(PostFixture.publicDraftRilogPost(rilog, postWriter));

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(
                draft.getId(), postWriter.getId(), selectedCommand()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("삭제된 게시글에는 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsDeletedPost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Blog rilog = saveRilog(postWriter);
        Post deleted = postRepository.saveAndFlush(PostFixture.deletedPublicPublishedRilogPost(rilog, postWriter));

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(
                deleted.getId(), postWriter.getId(), selectedCommand()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("존재하지 않는 사용자는 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsUnknownUser() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Post post = savePublicPost(postWriter);
        Long unknownUserId = Long.MAX_VALUE;

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(
                post.getId(), unknownUserId, selectedCommand()))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("본문에 없는 블록 id이면 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsUnknownBlockId() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Post post = savePublicPost(postWriter);
        var command = new CommentAnchorCreateCommand(
                "not-exists", SELECTED_START, SELECTED_END, SELECTED_TEXT, CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(post.getId(), postWriter.getId(), command))
                .isInstanceOf(PostException.class)
                .hasMessage(TEXT_BLOCK_NOT_FOUND.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("선택 문자열이 서버가 직렬화한 블록 텍스트의 해당 범위와 다르면 인라인 댓글을 작성할 수 없다.")
    void createCommentAnchorRejectsSelectedTextDifferentFromServerText() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Post post = savePublicPost(postWriter);
        var command = new CommentAnchorCreateCommand(
                PARAGRAPH_BLOCK_ID, SELECTED_START, SELECTED_END, "가나", CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(post.getId(), postWriter.getId(), command))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
        assertThat(commentAnchorSelectionRepository.count()).isZero();
    }

    @Test
    @DisplayName("댓글 본문이 올바르지 않으면 새 selection도 저장하지 않는다.")
    void createCommentAnchorRollsBackSelectionWhenContentIsInvalid() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Post post = savePublicPost(postWriter);
        CommentAnchorCreateCommand command = new CommentAnchorCreateCommand(
                PARAGRAPH_BLOCK_ID, SELECTED_START, SELECTED_END, SELECTED_TEXT, " "
        );

        // when - then
        assertThatThrownBy(() -> commentAnchorService.createCommentAnchor(
                post.getId(), postWriter.getId(), command
        ))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
        assertThat(commentAnchorSelectionRepository.count()).isZero();
    }

    @Test
    @DisplayName("기존 ACTIVE selection에 인라인 댓글을 추가하면 해당 selection과 댓글 내용을 저장한다.")
    void addCommentAnchorPersistsOnExistingActiveSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection selection = saveActiveSelection(post);
        var command = new CommentAnchorAddCommand(CONTENT);

        // when
        CommentAnchorCreateResult result = commentAnchorService.addCommentAnchor(
                post.getId(), commenter.getId(), selection.getId(), command
        );
        CommentAnchor saved = commentAnchorRepository.findById(result.commentAnchorId()).orElseThrow();

        // then
        assertThat(saved.getCommentAnchorSelection().getId()).isEqualTo(selection.getId());
        assertThat(saved.getContent()).isEqualTo(CONTENT);
    }

    @Test
    @DisplayName("기존 ACTIVE selection에 인라인 댓글을 추가하면 요청자를 작성자로 저장한다.")
    void addCommentAnchorAssociatesRequesterAsWriter() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection selection = saveActiveSelection(post);
        var command = new CommentAnchorAddCommand(CONTENT);

        // when
        CommentAnchorCreateResult result = commentAnchorService.addCommentAnchor(
                post.getId(), commenter.getId(), selection.getId(), command
        );
        CommentAnchor saved = commentAnchorRepository.findById(result.commentAnchorId()).orElseThrow();

        // then
        assertThat(saved.getWriter().getId()).isEqualTo(commenter.getId());
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
        assertThatThrownBy(() -> commentAnchorService.addCommentAnchor(
                post.getId(), commenter.getId(), selection.getId(), command
        ))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("요청한 게시글에 속하지 않은 selection에는 인라인 댓글을 추가할 수 없다.")
    void addCommentAnchorRejectsSelectionFromAnotherPost() {
        // given
        User firstWriter = saveCompletedUser(100L, "첫글작성자", "first_writer");
        User secondWriter = saveCompletedUser(101L, "둘글작성자", "second_writer");
        User commenter = saveCompletedUser(102L, "댓글작성자", "commenter");
        Post requestedPost = savePublicPost(firstWriter);
        Post otherPost = savePublicPost(secondWriter);
        CommentAnchorSelection otherSelection = saveActiveSelection(otherPost);
        var command = new CommentAnchorAddCommand(CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.addCommentAnchor(
                requestedPost.getId(), commenter.getId(), otherSelection.getId(), command
        ))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_SELECTION_NOT_FOUND.getMessage());
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
        CommentAnchorCreateResult result = commentAnchorService.addCommentAnchor(
                post.getId(), commenter.getId(), orphanedSelection.getId(), command
        );
        CommentAnchor saved = commentAnchorRepository.findById(result.commentAnchorId()).orElseThrow();

        // then
        assertThat(saved.getCommentAnchorSelection().getId()).isEqualTo(orphanedSelection.getId());
    }

    @Test
    @DisplayName("존재하지 않는 selection에는 인라인 댓글을 추가할 수 없다.")
    void addCommentAnchorRejectsUnknownSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        var command = new CommentAnchorAddCommand(CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.addCommentAnchor(
                post.getId(), commenter.getId(), Long.MAX_VALUE, command
        ))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_SELECTION_NOT_FOUND.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("삭제된 selection에는 인라인 댓글을 추가할 수 없다.")
    void addCommentAnchorRejectsDeletedSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection deletedSelection = saveActiveSelection(post);
        deletedSelection.delete();
        commentAnchorSelectionRepository.saveAndFlush(deletedSelection);
        var command = new CommentAnchorAddCommand(CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.addCommentAnchor(
                post.getId(), commenter.getId(), deletedSelection.getId(), command
        ))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_SELECTION_NOT_FOUND.getMessage());
        assertThat(commentAnchorRepository.count()).isZero();
    }

    @Test
    @DisplayName("게시글의 인라인 댓글을 블록과 선택 영역별로 그룹화해 조회한다.")
    void readCommentAnchorsGroupsByBlockAndSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection activeSelection = saveSelection(
                post,
                Selection.of(PARAGRAPH_BLOCK_ID, 0, 2, "가나")
        );
        saveAnchor(activeSelection, commenter, "첫 번째 댓글");
        saveAnchor(activeSelection, postWriter, "두 번째 댓글");
        CommentAnchorSelection orphanedSelection = saveSelection(
                post,
                Selection.of(PARAGRAPH_BLOCK_ID, SELECTED_START, SELECTED_END, SELECTED_TEXT)
        );
        orphanedSelection.orphan(LocalDateTime.of(2026, 9, 21, 12, 0));
        commentAnchorSelectionRepository.saveAndFlush(orphanedSelection);
        saveAnchor(orphanedSelection, commenter, "고아 댓글");

        // when
        CommentAnchorListResult result = commentAnchorService.readCommentAnchors(post.getId(), commenter.getId());

        // then
        assertThat(result.blocks()).hasSize(1);
        CommentAnchorListResult.BlockResult block = result.blocks().getFirst();
        assertThat(block.blockId()).isEqualTo(PARAGRAPH_BLOCK_ID);
        assertThat(block.anchorGroups()).hasSize(2);
        assertThat(block.anchorGroups().getFirst().commentAnchors()).hasSize(2);
        assertThat(block.anchorGroups().get(1).state()).isEqualTo(AnchorStatus.ORPHANED);
    }

    @Test
    @DisplayName("인라인 댓글 목록은 작성자와 블로그 멤버 여부 및 요청자의 수정 삭제 권한을 제공한다.")
    void readCommentAnchorsIncludesAuthorBadgesAndPermissions() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        saveBlogOwner(post, postWriter);
        saveActiveBlogMember(post, commenter, BlogPermission.MEMBER);
        CommentAnchorSelection anchorSelection = saveActiveSelection(post);
        saveAnchor(anchorSelection, commenter, CONTENT);

        // when
        CommentAnchorListResult result = commentAnchorService.readCommentAnchors(post.getId(), commenter.getId());

        // then
        CommentAnchorListResult.CommentAnchorResult commentAnchor = firstCommentAnchorOf(result);
        assertThat(commentAnchor.author().postAuthor()).isFalse();
        assertThat(commentAnchor.author().blogMember()).isTrue();
        assertThat(commentAnchor.canEdit()).isTrue();
        assertThat(commentAnchor.canDelete()).isTrue();
    }

    @Test
    @DisplayName("게시글 작성자는 다른 사용자의 인라인 댓글을 삭제할 수 있다.")
    void readCommentAnchorsAllowsPostWriterToDelete() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection anchorSelection = saveActiveSelection(post);
        saveAnchor(anchorSelection, commenter, CONTENT);

        // when
        CommentAnchorListResult result = commentAnchorService.readCommentAnchors(post.getId(), postWriter.getId());

        // then
        CommentAnchorListResult.CommentAnchorResult commentAnchor = firstCommentAnchorOf(result);
        assertThat(commentAnchor.canEdit()).isFalse();
        assertThat(commentAnchor.canDelete()).isTrue();
    }

    @Test
    @DisplayName("블로그 ADMIN은 다른 사용자의 인라인 댓글을 삭제할 수 있다.")
    void readCommentAnchorsAllowsBlogAdminToDelete() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        User admin = saveCompletedUser(102L, "관리자", "admin");
        Post post = savePublicPost(postWriter);
        saveActiveBlogMember(post, admin, BlogPermission.ADMIN);
        CommentAnchorSelection anchorSelection = saveActiveSelection(post);
        saveAnchor(anchorSelection, commenter, CONTENT);

        // when
        CommentAnchorListResult result = commentAnchorService.readCommentAnchors(post.getId(), admin.getId());

        // then
        CommentAnchorListResult.CommentAnchorResult commentAnchor = firstCommentAnchorOf(result);
        assertThat(commentAnchor.canEdit()).isFalse();
        assertThat(commentAnchor.canDelete()).isTrue();
    }

    @Test
    @DisplayName("일반 블로그 MEMBER는 다른 사용자의 인라인 댓글을 삭제할 수 없다.")
    void readCommentAnchorsRejectsBlogMemberDeletePermission() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        User member = saveCompletedUser(102L, "구성원", "member");
        Post post = savePublicPost(postWriter);
        saveActiveBlogMember(post, member, BlogPermission.MEMBER);
        CommentAnchorSelection anchorSelection = saveActiveSelection(post);
        saveAnchor(anchorSelection, commenter, CONTENT);

        // when
        CommentAnchorListResult result = commentAnchorService.readCommentAnchors(post.getId(), member.getId());

        // then
        CommentAnchorListResult.CommentAnchorResult commentAnchor = firstCommentAnchorOf(result);
        assertThat(commentAnchor.canEdit()).isFalse();
        assertThat(commentAnchor.canDelete()).isFalse();
    }

    @Test
    @DisplayName("삭제된 인라인 댓글은 게시글의 인라인 댓글 목록에서 제외한다.")
    void readCommentAnchorsExcludesDeletedAnchors() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection anchorSelection = saveActiveSelection(post);
        CommentAnchor visible = saveAnchor(anchorSelection, commenter, "보이는 댓글");
        CommentAnchor deleted = saveAnchor(anchorSelection, commenter, "삭제된 댓글");
        deleted.delete();
        commentAnchorRepository.saveAndFlush(deleted);

        // when
        CommentAnchorListResult result = commentAnchorService.readCommentAnchors(post.getId(), null);

        // then
        List<CommentAnchorListResult.CommentAnchorResult> commentAnchors = result.blocks().getFirst()
                .anchorGroups().getFirst()
                .commentAnchors();
        assertThat(commentAnchors).hasSize(1);
        assertThat(commentAnchors.getFirst().commentAnchorId()).isEqualTo(visible.getId());
    }

    @Test
    @DisplayName("비공개 게시글의 인라인 댓글은 작성자가 아니면 조회할 수 없다.")
    void readCommentAnchorsRejectsOtherUserOnPrivatePost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User requester = saveCompletedUser(101L, "조회자", "requester");
        Post post = savePrivatePost(postWriter);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.readCommentAnchors(post.getId(), requester.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("작성자가 인라인 댓글을 수정하면 변경한 본문을 저장한다.")
    void updateCommentAnchorPersistsContent() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when
        CommentAnchorUpdateResult result = commentAnchorService.updateCommentAnchor(
                post.getId(), anchor.getId(), commenter.getId(), new CommentAnchorUpdateCommand(UPDATED_CONTENT)
        );
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();

        // then
        assertThat(result.content()).isEqualTo(UPDATED_CONTENT);
        assertThat(saved.getContent()).isEqualTo(UPDATED_CONTENT);
    }

    @Test
    @DisplayName("작성자가 인라인 댓글 본문을 변경하면 수정된 댓글이 된다.")
    void updateCommentAnchorMarksEdited() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchor anchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);

        // when
        CommentAnchorUpdateResult result = commentAnchorService.updateCommentAnchor(
                post.getId(), anchor.getId(), commenter.getId(), new CommentAnchorUpdateCommand(UPDATED_CONTENT)
        );
        CommentAnchor saved = commentAnchorRepository.findById(anchor.getId()).orElseThrow();

        // then
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
        CommentAnchorUpdateResult result = commentAnchorService.updateCommentAnchor(
                post.getId(), anchor.getId(), commenter.getId(), new CommentAnchorUpdateCommand(CONTENT)
        );
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
        commentAnchorService.updateCommentAnchor(
                post.getId(), anchor.getId(), commenter.getId(), new CommentAnchorUpdateCommand(UPDATED_CONTENT)
        );
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
        assertThatThrownBy(() -> commentAnchorService.updateCommentAnchor(
                post.getId(), anchor.getId(), postWriter.getId(), command
        ))
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
        assertThatThrownBy(() -> commentAnchorService.updateCommentAnchor(
                post.getId(), anchor.getId(), commenter.getId(), command
        ))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
        assertThat(commentAnchorRepository.findById(anchor.getId()).orElseThrow().getContent()).isEqualTo(CONTENT);
    }

    @Test
    @DisplayName("요청한 게시글에 속하지 않은 인라인 댓글은 수정할 수 없다.")
    void updateCommentAnchorRejectsAnchorFromAnotherPost() {
        // given
        User firstWriter = saveCompletedUser(100L, "첫글작성자", "first_writer");
        User secondWriter = saveCompletedUser(101L, "둘글작성자", "second_writer");
        User commenter = saveCompletedUser(102L, "댓글작성자", "commenter");
        Post requestedPost = savePublicPost(firstWriter);
        Post otherPost = savePublicPost(secondWriter);
        CommentAnchor otherAnchor = saveAnchor(saveActiveSelection(otherPost), commenter, CONTENT);
        var command = new CommentAnchorUpdateCommand(UPDATED_CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.updateCommentAnchor(
                requestedPost.getId(), otherAnchor.getId(), commenter.getId(), command
        ))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("삭제된 인라인 댓글은 수정할 수 없다.")
    void updateCommentAnchorRejectsDeletedAnchor() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchor deletedAnchor = saveAnchor(saveActiveSelection(post), commenter, CONTENT);
        deletedAnchor.delete();
        commentAnchorRepository.saveAndFlush(deletedAnchor);
        var command = new CommentAnchorUpdateCommand(UPDATED_CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.updateCommentAnchor(
                post.getId(), deletedAnchor.getId(), commenter.getId(), command
        ))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("삭제된 selection의 인라인 댓글은 수정할 수 없다.")
    void updateCommentAnchorRejectsAnchorOfDeletedSelection() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        User commenter = saveCompletedUser(101L, "댓글작성자", "commenter");
        Post post = savePublicPost(postWriter);
        CommentAnchorSelection deletedSelection = saveActiveSelection(post);
        CommentAnchor anchor = saveAnchor(deletedSelection, commenter, CONTENT);
        deletedSelection.delete();
        commentAnchorSelectionRepository.saveAndFlush(deletedSelection);
        var command = new CommentAnchorUpdateCommand(UPDATED_CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.updateCommentAnchor(
                post.getId(), anchor.getId(), commenter.getId(), command
        ))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("삭제된 게시글의 인라인 댓글은 수정할 수 없다.")
    void updateCommentAnchorRejectsDeletedPost() {
        // given
        User postWriter = saveCompletedUser(100L, "글작성자", "post_writer");
        Blog rilog = saveRilog(postWriter);
        Post deleted = postRepository.saveAndFlush(PostFixture.deletedPublicPublishedRilogPost(rilog, postWriter));
        CommentAnchor anchor = saveAnchor(saveActiveSelection(deleted), postWriter, CONTENT);
        var command = new CommentAnchorUpdateCommand(UPDATED_CONTENT);

        // when - then
        assertThatThrownBy(() -> commentAnchorService.updateCommentAnchor(
                deleted.getId(), anchor.getId(), postWriter.getId(), command
        ))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
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
        commentAnchorService.updateCommentAnchor(
                post.getId(), edited.getId(), commenter.getId(), new CommentAnchorUpdateCommand(UPDATED_CONTENT)
        );

        // when
        CommentAnchorListResult result = commentAnchorService.readCommentAnchors(post.getId(), null);

        // then
        List<CommentAnchorListResult.CommentAnchorResult> commentAnchors = result.blocks().getFirst()
                .anchorGroups().getFirst()
                .commentAnchors();
        assertThat(findCommentAnchor(commentAnchors, edited).edited()).isTrue();
        assertThat(findCommentAnchor(commentAnchors, unedited).edited()).isFalse();
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

    private CommentAnchorSelection saveSelection(Post post, Selection selection) {
        return commentAnchorSelectionRepository.saveAndFlush(CommentAnchorSelection.create(post, selection));
    }

    private CommentAnchor saveAnchor(CommentAnchorSelection selection, User writer, String content) {
        return commentAnchorRepository.saveAndFlush(CommentAnchor.create(selection, writer, content));
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

    private BlogMember saveBlogOwner(Post post, User owner) {
        return blogMemberRepository.saveAndFlush(BlogMember.createOwner(
                post.getRilog(),
                owner,
                LocalDateTime.of(2026, 9, 17, 10, 0)
        ));
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
