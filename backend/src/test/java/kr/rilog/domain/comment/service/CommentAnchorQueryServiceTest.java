package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.enums.AnchorStatus;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorListResult;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorSidebarResult;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static kr.rilog.domain.blog.entity.enums.BlogMemberStatus.ACTIVE;
import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.support.fixure.PostContentFixture.PARAGRAPH_BLOCK_ID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentAnchorQueryServiceTest {

    private static final Long POST_ID = 1L;
    private static final Long BLOG_ID = 2L;
    private static final LocalDateTime JOINED_AT = LocalDateTime.of(2026, 9, 21, 12, 0);
    private static final String OTHER_BLOCK_ID = "p-2";

    @Mock
    private CommentAnchorRepository commentAnchorRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    private CommentAnchorQueryService commentAnchorQueryService;
    private User postWriter;
    private User commenter;
    private Blog blog;
    private Post post;

    @BeforeEach
    void setUp() {
        commentAnchorQueryService = new CommentAnchorQueryService(commentAnchorRepository, postRepository, blogMemberRepository);
        postWriter = User.builder().id(3L).build();
        commenter = User.builder().id(4L).build();
        blog = Blog.builder().id(BLOG_ID).build();
        post = Post.builder().id(POST_ID).user(postWriter).rilog(blog)
                .status(PUBLISHED).visibility(PostVisibility.PUBLIC).build();
        when(postRepository.findDetailByIdAndStatus(POST_ID, PUBLISHED)).thenReturn(Optional.of(post));
    }

    @Test
    @DisplayName("인라인 댓글을 블록과 선택 범위별로 묶고 선택의 상태를 응답에 포함한다.")
    void readCommentAnchorsGroupsByBlockAndSelection() {
        // given
        givenAnchorsInSelectionOrder();

        // when
        CommentAnchorListResult result = commentAnchorQueryService.readCommentAnchors(POST_ID, commenter.getId());

        // then
        assertThat(result.blocks()).extracting(CommentAnchorListResult.BlockResult::blockId)
                .containsExactly(PARAGRAPH_BLOCK_ID, OTHER_BLOCK_ID);
        var firstBlockGroups = result.blocks().getFirst().anchorGroups();
        assertThat(firstBlockGroups).extracting(CommentAnchorListResult.AnchorGroupResult::selectionId,
                        CommentAnchorListResult.AnchorGroupResult::state)
                .containsExactly(tuple(10L, AnchorStatus.ACTIVE), tuple(12L, AnchorStatus.ORPHANED));
        assertThat(firstBlockGroups.getFirst().commentAnchors())
                .extracting(CommentAnchorListResult.CommentAnchorResult::commentAnchorId)
                .containsExactly(20L, 21L);
        var comment = firstBlockGroups.getFirst().commentAnchors().getFirst();
        assertThat(comment.author().postAuthor()).isFalse();
        assertThat(comment.canEdit()).isTrue();
        assertThat(comment.canDelete()).isTrue();
    }

    @Test
    @DisplayName("사이드바는 블록별로 다시 묶지 않고 선택과 댓글을 조회 순서대로 반환한다.")
    void readSidebarCommentAnchorsPreservesSelectionAndAnchorOrder() {
        // given
        givenAnchorsInSelectionOrder();

        // when
        CommentAnchorSidebarResult result = commentAnchorQueryService.readSidebarCommentAnchors(POST_ID, commenter.getId());

        // then
        assertThat(result.anchorGroups())
                .extracting(CommentAnchorSidebarResult.SidebarAnchorGroupResult::selectionId,
                        CommentAnchorSidebarResult.SidebarAnchorGroupResult::blockId)
                .containsExactly(tuple(10L, PARAGRAPH_BLOCK_ID), tuple(11L, OTHER_BLOCK_ID), tuple(12L, PARAGRAPH_BLOCK_ID));
        assertThat(result.anchorGroups().getFirst().commentAnchors())
                .extracting(CommentAnchorListResult.CommentAnchorResult::commentAnchorId)
                .containsExactly(20L, 21L);
    }

    @Test
    @DisplayName("게시글 작성자는 다른 사용자의 인라인 댓글을 삭제할 수 있다.")
    void readCommentAnchorsAllowsPostWriterToDelete() {
        // given
        givenSingleAnchor();
        when(blogMemberRepository.findAllWithUserByBlogIdAndStatus(BLOG_ID, ACTIVE)).thenReturn(List.of());

        // when
        CommentAnchorListResult result = commentAnchorQueryService.readCommentAnchors(POST_ID, postWriter.getId());

        // then
        var comment = firstCommentAnchorOf(result);
        assertThat(comment.canEdit()).isFalse();
        assertThat(comment.canDelete()).isTrue();
    }

    @ParameterizedTest
    @CsvSource({"ADMIN, true", "MEMBER, false"})
    @DisplayName("다른 사용자의 인라인 댓글은 블로그 ADMIN만 삭제할 수 있다.")
    void readCommentAnchorsReflectsBlogMemberPermissions(BlogPermission permission, boolean canDelete) {
        // given
        givenSingleAnchor();
        User requester = User.builder().id(5L).build();
        BlogMember member = BlogMember.invite(blog, requester, "멤버", permission, JOINED_AT);
        when(blogMemberRepository.findAllWithUserByBlogIdAndStatus(BLOG_ID, ACTIVE)).thenReturn(List.of(member));

        // when
        CommentAnchorListResult result = commentAnchorQueryService.readCommentAnchors(POST_ID, requester.getId());

        // then
        var comment = firstCommentAnchorOf(result);
        assertThat(comment.canEdit()).isFalse();
        assertThat(comment.canDelete()).isEqualTo(canDelete);
    }

    private void givenAnchorsInSelectionOrder() {
        CommentAnchorSelection first = selection(10L, PARAGRAPH_BLOCK_ID, 0);
        CommentAnchorSelection second = selection(11L, OTHER_BLOCK_ID, 0);
        CommentAnchorSelection third = selection(12L, PARAGRAPH_BLOCK_ID, 2);
        third.orphan(JOINED_AT);
        when(commentAnchorRepository.findAllByPostId(POST_ID)).thenReturn(List.of(
                anchor(20L, first, commenter), anchor(21L, first, postWriter),
                anchor(22L, second, commenter), anchor(23L, third, commenter)
        ));
        when(blogMemberRepository.findAllWithUserByBlogIdAndStatus(BLOG_ID, ACTIVE)).thenReturn(List.of());
    }

    private void givenSingleAnchor() {
        var selection = selection(10L, PARAGRAPH_BLOCK_ID, 0);
        when(commentAnchorRepository.findAllByPostId(POST_ID))
                .thenReturn(List.of(anchor(20L, selection, commenter)));
    }

    private CommentAnchorSelection selection(Long id, String blockId, int start) {
        return CommentAnchorSelection.builder()
                .id(id)
                .post(post)
                .selection(Selection.of(blockId, start, start + 2, "본문"))
                .status(AnchorStatus.ACTIVE)
                .build();
    }

    private CommentAnchor anchor(Long id, CommentAnchorSelection selection, User writer) {
        return CommentAnchor.builder()
                .id(id)
                .writer(writer)
                .commentAnchorSelection(selection)
                .content("댓글 내용")
                .build();
    }

    private CommentAnchorListResult.CommentAnchorResult firstCommentAnchorOf(CommentAnchorListResult result) {
        return result.blocks().getFirst().anchorGroups().getFirst().commentAnchors().getFirst();
    }
}
