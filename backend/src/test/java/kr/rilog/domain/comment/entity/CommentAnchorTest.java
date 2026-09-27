package kr.rilog.domain.comment.entity;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.BlogMembers;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.user.entity.User;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.CommentAnchorFixture;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.blog.entity.enums.BlogPermission.ADMIN;
import static kr.rilog.domain.blog.entity.enums.BlogPermission.MEMBER;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_ANCHOR_DELETE_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_AUTHOR_FORBIDDEN;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_ANCHOR;
import static kr.rilog.domain.comment.exception.CommentErrorInformation.INVALID_COMMENT_CONTENT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommentAnchorTest {

    private static final Long WRITER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;
    private static final Long POST_WRITER_ID = 3L;
    private static final Long BLOG_OWNER_ID = 4L;
    private static final Long BLOG_ADMIN_ID = 5L;
    private static final Long BLOG_MEMBER_ID = 6L;
    private static final String CONTENT = "좋은 설명이에요.";
    private static final int MAX_CONTENT_LENGTH = 1_000;
    private static final Selection SELECTION = Selection.of("block-a", 2, 4, "나다");
    private static final LocalDateTime JOINED_AT = LocalDateTime.of(2026, 9, 17, 10, 0);

    private final Post post = PostFixture.publicPublishedRilogPost();
    private final User writer = BlogFixture.createUser(WRITER_ID);
    private final User postWriter = BlogFixture.createUser(POST_WRITER_ID);
    private final Blog colog = BlogFixture.createColog(BlogFixture.createUser(BLOG_OWNER_ID));
    private final Post cologPost = PostFixture.publicPublishedColog(
            BlogFixture.createRilog(postWriter),
            colog,
            postWriter
    );

    @Test
    @DisplayName("인라인 댓글은 저장된 선택 범위를 참조한다.")
    void createKeepsAnchorSelection() {
        CommentAnchorSelection anchorSelection = activeSelection();

        CommentAnchor anchor = CommentAnchor.create(anchorSelection, writer, CONTENT);

        assertThat(anchor.getCommentAnchorSelection()).isSameAs(anchorSelection);
    }

    @Test
    @DisplayName("저장된 선택 범위가 없으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsMissingSelection() {
        assertThatThrownBy(() -> CommentAnchor.create(null, writer, CONTENT))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_ANCHOR.getMessage());
    }

    @Test
    @DisplayName("본문이 없으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsNullContent() {
        assertThatThrownBy(() -> CommentAnchor.create(activeSelection(), writer, null))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
    }

    @Test
    @DisplayName("본문이 비어 있으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsBlankContent() {
        assertThatThrownBy(() -> CommentAnchor.create(activeSelection(), writer, "    "))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
    }

    @Test
    @DisplayName("본문이 최대 길이를 넘으면 인라인 댓글을 작성할 수 없다.")
    void createRejectsTooLongContent() {
        String tooLongContent = "가".repeat(MAX_CONTENT_LENGTH + 1);

        assertThatThrownBy(() -> CommentAnchor.create(activeSelection(), writer, tooLongContent))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
    }

    @Test
    @DisplayName("본문이 최대 길이면 인라인 댓글을 작성할 수 있다.")
    void createAllowsMaxLengthContent() {
        String maxLengthContent = "가".repeat(MAX_CONTENT_LENGTH);

        assertThatCode(() -> CommentAnchor.create(activeSelection(), writer, maxLengthContent))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("작성자는 인라인 댓글 본문을 수정할 수 있다.")
    void updateContentAllowsWriter() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        anchor.updateContent(WRITER_ID, "수정한 댓글입니다.");

        assertThat(anchor.getContent()).isEqualTo("수정한 댓글입니다.");
    }

    @Test
    @DisplayName("ORPHANED 선택 범위의 댓글도 작성자는 본문을 수정할 수 있다.")
    void updateContentAllowsWriterWhenSelectionIsOrphaned() {
        CommentAnchorSelection anchorSelection = activeSelection();
        anchorSelection.orphan(LocalDateTime.of(2026, 9, 20, 12, 0));
        CommentAnchor anchor = CommentAnchor.create(anchorSelection, writer, CONTENT);

        anchor.updateContent(WRITER_ID, "수정한 댓글입니다.");

        assertThat(anchor.getContent()).isEqualTo("수정한 댓글입니다.");
    }

    @Test
    @DisplayName("작성자가 아니면 인라인 댓글 본문을 수정할 수 없다.")
    void updateContentRejectsOtherUser() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        assertThatThrownBy(() -> anchor.updateContent(OTHER_USER_ID, "수정한 댓글입니다."))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_AUTHOR_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("수정할 본문이 비어 있으면 인라인 댓글 본문을 수정할 수 없다.")
    void updateContentRejectsBlankContent() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        assertThatThrownBy(() -> anchor.updateContent(WRITER_ID, "    "))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
    }

    @Test
    @DisplayName("수정할 본문이 최대 길이를 넘으면 인라인 댓글 본문을 수정할 수 없다.")
    void updateContentRejectsTooLongContent() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);
        String tooLongContent = "가".repeat(MAX_CONTENT_LENGTH + 1);

        assertThatThrownBy(() -> anchor.updateContent(WRITER_ID, tooLongContent))
                .isInstanceOf(CommentException.class)
                .hasMessage(INVALID_COMMENT_CONTENT.getMessage());
    }

    @Test
    @DisplayName("본문 수정에 실패하면 기존 본문을 유지한다.")
    void updateContentKeepsContentWhenRejected() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        assertThatThrownBy(() -> anchor.updateContent(OTHER_USER_ID, "수정한 댓글입니다."))
                .isInstanceOf(CommentException.class);

        assertThat(anchor.getContent()).isEqualTo(CONTENT);
    }

    @Test
    @DisplayName("작성 이후 변경된 인라인 댓글은 수정된 댓글이다.")
    void isEditedWhenUpdatedAfterCreation() {
        CommentAnchor anchor = CommentAnchorFixture.editedAnchor(post, writer);

        assertThat(anchor.isEdited()).isTrue();
    }

    @Test
    @DisplayName("작성 이후 변경되지 않은 인라인 댓글은 수정된 댓글이 아니다.")
    void isNotEditedWhenNotUpdatedAfterCreation() {
        CommentAnchor anchor = CommentAnchorFixture.uneditedAnchor(post, writer);

        assertThat(anchor.isEdited()).isFalse();
    }

    @Test
    @DisplayName("저장되기 전의 인라인 댓글은 수정된 댓글이 아니다.")
    void isNotEditedBeforeSaved() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        assertThat(anchor.isEdited()).isFalse();
    }

    @Test
    @DisplayName("삭제하면 삭제된 인라인 댓글이 된다.")
    void deleteMarksDeleted() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        anchor.delete();

        assertThat(anchor.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("댓글 작성자는 인라인 댓글을 삭제할 수 있다.")
    void canBeDeletedByWriter() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(cologPost, writer);

        assertThat(anchor.canBeDeletedBy(WRITER_ID, cologPost, cologMembers())).isTrue();
    }

    @Test
    @DisplayName("블로그 MEMBER 권한이어도 게시글 작성자는 다른 사용자의 인라인 댓글을 삭제할 수 있다.")
    void canBeDeletedByPostWriter() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(cologPost, writer);

        assertThat(anchor.canBeDeletedBy(POST_WRITER_ID, cologPost, cologMembers())).isTrue();
    }

    @Test
    @DisplayName("블로그 OWNER는 다른 사용자의 인라인 댓글을 삭제할 수 있다.")
    void canBeDeletedByBlogOwner() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(cologPost, writer);

        assertThat(anchor.canBeDeletedBy(BLOG_OWNER_ID, cologPost, cologMembers())).isTrue();
    }

    @Test
    @DisplayName("블로그 ADMIN은 다른 사용자의 인라인 댓글을 삭제할 수 있다.")
    void canBeDeletedByBlogAdmin() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(cologPost, writer);

        assertThat(anchor.canBeDeletedBy(BLOG_ADMIN_ID, cologPost, cologMembers())).isTrue();
    }

    @Test
    @DisplayName("게시글 작성자가 아닌 블로그 MEMBER는 다른 사용자의 인라인 댓글을 삭제할 수 없다.")
    void canNotBeDeletedByBlogMember() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(cologPost, writer);

        assertThat(anchor.canBeDeletedBy(BLOG_MEMBER_ID, cologPost, cologMembers())).isFalse();
    }

    @Test
    @DisplayName("댓글 작성자도 게시글 작성자도 블로그 관리자도 아닌 사용자는 인라인 댓글을 삭제할 수 없다.")
    void canNotBeDeletedByUnrelatedUser() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(cologPost, writer);

        assertThat(anchor.canBeDeletedBy(OTHER_USER_ID, cologPost, cologMembers())).isFalse();
    }

    @Test
    @DisplayName("삭제 권한이 있는 사용자가 삭제하면 삭제된 인라인 댓글이 된다.")
    void deleteByMarksDeletedWhenPermitted() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(cologPost, writer);

        anchor.deleteBy(BLOG_ADMIN_ID, cologPost, cologMembers());

        assertThat(anchor.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("삭제 권한이 없는 사용자는 인라인 댓글을 삭제할 수 없다.")
    void deleteByRejectsRequesterWithoutPermission() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(cologPost, writer);

        assertThatThrownBy(() -> anchor.deleteBy(BLOG_MEMBER_ID, cologPost, cologMembers()))
                .isInstanceOf(CommentException.class)
                .hasMessage(COMMENT_ANCHOR_DELETE_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("삭제에 실패하면 인라인 댓글은 삭제되지 않은 상태를 유지한다.")
    void deleteByKeepsNotDeletedWhenRejected() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(cologPost, writer);

        assertThatThrownBy(() -> anchor.deleteBy(BLOG_MEMBER_ID, cologPost, cologMembers()))
                .isInstanceOf(CommentException.class);

        assertThat(anchor.isDeleted()).isFalse();
    }

    @Test
    @DisplayName("작성자 본인의 id이면 작성자로 판단한다.")
    void isWrittenByWriter() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        assertThat(anchor.isWrittenBy(WRITER_ID)).isTrue();
    }

    @Test
    @DisplayName("다른 사용자의 id이면 작성자로 판단하지 않는다.")
    void isWrittenByRejectsOtherUser() {
        CommentAnchor anchor = CommentAnchorFixture.activeAnchor(post, writer);

        assertThat(anchor.isWrittenBy(OTHER_USER_ID)).isFalse();
    }

    private BlogMembers cologMembers() {
        return BlogMembers.from(List.of(
                BlogMember.createOwner(colog, BlogFixture.createUser(BLOG_OWNER_ID), JOINED_AT),
                BlogMember.invite(colog, BlogFixture.createUser(BLOG_ADMIN_ID), "관리자", ADMIN, JOINED_AT),
                BlogMember.invite(colog, BlogFixture.createUser(BLOG_MEMBER_ID), "구성원", MEMBER, JOINED_AT),
                BlogMember.invite(colog, postWriter, "작성자", MEMBER, JOINED_AT)
        ));
    }

    private CommentAnchorSelection activeSelection() {
        return CommentAnchorSelection.create(post, SELECTION);
    }

}
