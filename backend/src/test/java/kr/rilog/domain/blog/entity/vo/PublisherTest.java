package kr.rilog.domain.blog.entity.vo;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.ALREADY_BLOG_MEMBER_LEFT;
import static kr.rilog.domain.post.entity.enums.PostStatus.DRAFT;
import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.support.fixure.BlogFixture.createRilog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static kr.rilog.support.fixure.BlogFixture.targetColog;
import static kr.rilog.support.fixure.BlogMemberFixture.blogMember;
import static kr.rilog.support.fixure.BlogMemberFixture.leftMember;
import static kr.rilog.support.fixure.BlogMemberFixture.owner;
import static kr.rilog.support.fixure.PostFixture.draftRilogPostAt;
import static kr.rilog.support.fixure.PostFixture.publicDraftPublishCommand;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class PublisherTest {

    private static final LocalDateTime DRAFT_SAVED_AT = LocalDateTime.of(2026, 8, 27, 12, 0);

    @Test
    @DisplayName("개인 블로그와 대상 블로그의 활성 멤버십으로 초안을 발행하면 입력한 정보와 발행 상태가 반영된다.")
    void publishDraftWithActiveMembershipsChangesDetailAndStatus() {
        // given
        User writer = createUser(1L);
        Blog rilog = createRilog(writer);
        Blog colog = targetColog();
        Publisher publisher = Publisher.of(owner(rilog, writer), blogMember(colog, writer));
        Post draft = draftRilogPostAt(rilog, writer, "발행 전 제목", DRAFT_SAVED_AT);
        PostDetail detail = publicDraftPublishCommand(colog.getSlug()).toDetail();

        // when
        publisher.publishDraft(draft, detail);

        // then
        PostDetail publishedDetail = new PostDetail(
                draft.getTitle(),
                draft.getContent(),
                draft.getCategory(),
                draft.getVisibility(),
                draft.getThumbnailImageUrl()
        );
        assertSoftly(softly -> {
            softly.assertThat(publishedDetail).isEqualTo(detail);
            softly.assertThat(draft.getStatus()).isEqualTo(PUBLISHED);
        });
    }

    @Test
    @DisplayName("활성 멤버십으로 팀 블로그에 초안을 발행하면 각 멤버십의 블로그에 소속된다.")
    void publishDraftWithActiveMembershipsUsesMembershipBlogs() {
        // given
        User writer = createUser(1L);
        Blog rilog = createRilog(writer);
        Blog colog = targetColog();
        Publisher publisher = Publisher.of(owner(rilog, writer), blogMember(colog, writer));
        Post draft = draftRilogPostAt(rilog, writer, "발행 전 제목", DRAFT_SAVED_AT);

        // when
        publisher.publishDraft(draft, publicDraftPublishCommand(colog.getSlug()).toDetail());

        // then
        assertSoftly(softly -> {
            softly.assertThat(draft.getRilog()).isSameAs(rilog);
            softly.assertThat(draft.getColog()).isSameAs(colog);
        });
    }

    @Test
    @DisplayName("활성 멤버십으로 개인 블로그에 초안을 발행하면 개인블로그에 소속되며 팀블로그에는 소속정보가 없다.")
    void publishDraftWithActiveMembershipsUsesMembershipRilogs() {
        // given
        User writer = createUser(1L);
        Blog rilog = createRilog(writer);
        Publisher publisher = Publisher.of(owner(rilog, writer), blogMember(rilog, writer));
        Post draft = draftRilogPostAt(rilog, writer, "발행 전 제목", DRAFT_SAVED_AT);

        // when
        publisher.publishDraft(draft, publicDraftPublishCommand(rilog.getSlug()).toDetail());

        // then
        assertSoftly(softly -> {
            softly.assertThat(draft.getRilog()).isSameAs(rilog);
            softly.assertThat(draft.getColog()).isNull();
        });
    }

    @Test
    @DisplayName("개인 블로그 멤버십이 비활성이면 초안을 발행할 수 없고 초안 상태가 유지된다.")
    void publishDraftRejectsInactiveRilogMembership() {
        // given
        User writer = createUser(1L);
        Blog rilog = createRilog(writer);
        Blog colog = targetColog();
        BlogMember inactiveRilogMembership = leftMember(rilog, writer); // 서비스 탈퇴
        Publisher publisher = Publisher.of(inactiveRilogMembership, blogMember(colog, writer));
        Post draft = draftRilogPostAt(rilog, writer, "유지할 초안", DRAFT_SAVED_AT);

        // when & then
        assertThatThrownBy(() -> publisher.publishDraft(
                draft,
                publicDraftPublishCommand(colog.getSlug()).toDetail()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());

        assertThat(draft.getStatus()).isEqualTo(DRAFT);
    }

    @Test
    @DisplayName("대상 블로그 멤버십이 비활성(탈퇴)이면 초안을 발행할 수 없고 초안 상태가 유지된다.")
    void publishDraftRejectsInactiveTargetMembership() {
        // given
        User writer = createUser(1L);
        Blog rilog = createRilog(writer);
        Blog colog = targetColog();
        BlogMember leftMembership = leftMember(colog, writer);
        Publisher publisher = Publisher.of(owner(rilog, writer), leftMembership);
        Post draft = draftRilogPostAt(rilog, writer, "유지할 초안", DRAFT_SAVED_AT);

        // when & then
        assertThatThrownBy(() -> publisher.publishDraft(
                draft,
                publicDraftPublishCommand(colog.getSlug()).toDetail()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());

        assertThat(draft.getStatus()).isEqualTo(DRAFT);
    }

}
