package kr.rilog.domain.post.entity;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.post.entity.enums.PostStatus.DRAFT;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PRIVATE;
import static kr.rilog.domain.post.exception.PostErrorInformation.NOT_POST_AUTHOR;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.support.fixure.BlogFixture.createRilog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static kr.rilog.support.fixure.BlogFixture.otherUserRilog;
import static kr.rilog.support.fixure.BlogFixture.targetColog;
import static kr.rilog.support.fixure.PostFixture.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class PostTest {

    private static final Long OTHER_USER_ID = 2L;

    @Test
    @DisplayName("초안을 생성하면 입력한 내용과 초안 전용 상태를 가진다.")
    void createDraftHasCommandContentAndDraftState() {
        // given
        User writer = createUser(1L);
        Blog rilog = createRilog(writer);
        DraftSaveCommand command = initialDraftSaveCommand();

        // when
        Post draft = Post.draft(command, writer, rilog);

        // then
        assertSoftly(softly -> {
            softly.assertThat(draft.getTitle()).isEqualTo(command.title());
            softly.assertThat(draft.getContent()).isEqualTo(command.content());
            softly.assertThat(draft.getStatus()).isEqualTo(DRAFT);
            softly.assertThat(draft.getVisibility()).isEqualTo(PRIVATE);
            softly.assertThat(draft.getCategory()).isNull();
            softly.assertThat(draft.getThumbnailImageUrl()).isNull();
        });
    }

    @Test
    @DisplayName("초안을 생성하면 작성자와 작성자의 개인 블로그에 소속된다.")
    void createDraftBelongsToWriterAndRilog() {
        // given
        User writer = createUser(1L);
        Blog rilog = createRilog(writer);

        // when
        Post draft = Post.draft(initialDraftSaveCommand(), writer, rilog);

        // then
        assertSoftly(softly -> {
            softly.assertThat(draft.getUser()).isSameAs(writer);
            softly.assertThat(draft.getRilog()).isSameAs(rilog);
            softly.assertThat(draft.getColog()).isNull();
        });
    }

    @Test
    @DisplayName("공개 게시글은 인증하지 않은 사용자도 읽을 수 있다.")
    void nonAuthenticatedUserCanReadPublicPost() {
        // given
        Post post = publicPublishedRilogPost();

        // when & then
        assertThatCode(() -> post.validateReadableBy(null))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("비공개 게시글은 작성자가 읽을 수 있다.")
    void writerCanReadPrivatePost() {
        // given
        Post post = privatePublishedRilogPost();

        // when & then
        assertThatCode(() -> post.validateReadableBy(post.getUser().getId()))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("비공개 게시글은 인증하지 않은 사용자가 읽을 수 없다.")
    void nonAuthenticatedUserCannotReadPrivatePost() {
        // given
        Post post = privatePublishedRilogPost();

        // when & then
        assertThatThrownBy(() -> post.validateReadableBy(null))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("비공개 게시글은 작성자가 아닌 사용자가 읽을 수 없다.")
    void nonWriterCannotReadPrivatePost() {
        // given
        Post post = privatePublishedRilogPost();

        // when & then
        assertThatThrownBy(() -> post.validateReadableBy(OTHER_USER_ID))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("Colog가 연결된 게시글은 Colog 소속이다.")
    void postWithCologIsCologAffiliated() {
        // given
        Post post = publicPublishedCologPost();

        // when & then
        assertThat(post.isCologAffiliated()).isTrue();
    }

    @Test
    @DisplayName("Colog가 연결되지 않은 게시글은 Colog 소속이 아니다.")
    void postWithoutCologIsNotCologAffiliated() {
        // given
        Post post = publicPublishedRilogPost();

        // when & then
        assertThat(post.isCologAffiliated()).isFalse();
    }

    @Test
    @DisplayName("게시글을 수정하면 게시글 상세 정보가 변경된다.")
    void updateChangesPostDetail() {
        // given
        Post post = publicPublishedRilogPost();
        PostDetail newDetail = updatedPostDetail();

        // when
        post.update(newDetail, post.getRilog());

        // then
        PostDetail updatedDetail = new PostDetail(
                post.getTitle(),
                post.getContent(),
                post.getCategory(),
                post.getVisibility(),
                post.getThumbnailImageUrl()
        );
        assertThat(updatedDetail).isEqualTo(newDetail);
    }

    @Test
    @DisplayName("게시글을 팀 블로그로 수정하면 해당 팀 블로그에 소속된다.")
    void updateToCologChangesAffiliation() {
        // given
        Post post = publicPublishedRilogPost();
        Blog targetColog = targetColog();

        // when
        post.update(updatedPostDetail(), targetColog);

        // then
        assertThat(post.getColog()).isSameAs(targetColog);
    }

    @Test
    @DisplayName("팀 블로그 게시글을 개인 블로그로 수정하면 팀 블로그 소속이 해제된다.")
    void updateToOwnRilogRemovesCologAffiliation() {
        // given
        Post post = publicPublishedCologPost();

        // when
        post.update(updatedPostDetail(), post.getRilog());

        // then
        assertThat(post.getColog()).isNull();
    }

    @Test
    @DisplayName("게시글을 작성자의 개인 블로그가 아닌 개인 블로그로 수정할 수 없다.")
    void updateToAnotherRilogFails() {
        // given
        Post post = publicPublishedRilogPost();
        Blog anotherRilog = otherUserRilog();

        // when & then
        assertThatThrownBy(() -> post.update(updatedPostDetail(), anotherRilog))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("게시글 작성자는 작성 권한 검증을 통과한다.")
    void writerPassesWrittenByValidation() {
        // given
        Post post = publicPublishedRilogPost();

        // when & then
        assertThatCode(() -> post.validateWrittenBy(post.getUser().getId()))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("게시글 작성자가 아닌 사용자는 작성 권한 검증을 통과할 수 없다.")
    void nonWriterFailsWrittenByValidation() {
        // given
        Post post = publicPublishedRilogPost();

        // when & then
        assertThatThrownBy(() -> post.validateWrittenBy(OTHER_USER_ID))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
    }

    @Test
    @DisplayName("인증하지 않은 사용자는 게시글 작성 권한 검증을 통과할 수 없다.")
    void nonAuthenticatedUserFailsWrittenByValidation() {
        // given
        Post post = publicPublishedRilogPost();

        // when & then
        assertThatThrownBy(() -> post.validateWrittenBy(null))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
    }

    @Test
    @DisplayName("팀 블로그 게시글은 소속 팀 블로그의 slug를 반환한다.")
    void cologPostReturnsCologSlug() {
        // given
        Post post = publicPublishedCologPost();

        // when
        String ownSlug = post.getOwnSlug();

        // then
        assertThat(ownSlug).isEqualTo(post.getColog().getSlug());
    }

    @Test
    @DisplayName("개인 블로그 게시글은 소속 개인 블로그의 slug를 반환한다.")
    void rilogPostReturnsRilogSlug() {
        // given
        Post post = publicPublishedRilogPost();

        // when
        String ownSlug = post.getOwnSlug();

        // then
        assertThat(ownSlug).isEqualTo(post.getRilog().getSlug());
    }

}
