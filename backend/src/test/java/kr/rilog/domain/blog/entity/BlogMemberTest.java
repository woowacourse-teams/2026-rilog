package kr.rilog.domain.blog.entity;

import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.vo.Slug;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_INVITE_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_PERMISSION_INVALID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlogMemberTest {

    @Test
    @DisplayName("팀 생성자는 OWNER 권한의 활성 멤버로 생성된다")
    void createOwnerCreatesActiveOwnerMember() {
        // given
        User owner = User.builder()
                .id(1L)
                .githubId(1L)
                .build();
        Blog colog = Blog.builder()
                .id(2L)
                .owner(owner)
                .name("리로그 팀")
                .slug(Slug.from("rilog-team"))
                .blogType(BlogType.COLOG)
                .build();
        LocalDateTime joinedAt = LocalDateTime.of(2026, 8, 13, 12, 0);

        // when
        BlogMember member = BlogMember.createOwner(colog, owner, joinedAt);

        // then
        assertThat(member)
                .extracting(
                        BlogMember::getBlog,
                        BlogMember::getUser,
                        BlogMember::getPermission,
                        BlogMember::getStatus,
                        BlogMember::getJoinedAt
                )
                .containsExactly(
                        colog,
                        owner,
                        BlogPermission.OWNER,
                        BlogMemberStatus.ACTIVE,
                        joinedAt
                );
    }

    @Test
    @DisplayName("초대된 사용자는 지정한 권한과 역할을 가진 활성 멤버로 생성된다")
    void inviteCreatesActiveMember() {
        // given
        User owner = User.builder()
                .id(1L)
                .githubId(1L)
                .build();
        User invitee = User.builder()
                .id(2L)
                .githubId(2L)
                .build();
        Blog colog = Blog.builder()
                .id(2L)
                .owner(owner)
                .name("리로그 팀")
                .slug(Slug.from("rilog-team"))
                .blogType(BlogType.COLOG)
                .build();
        LocalDateTime joinedAt = LocalDateTime.of(2026, 8, 13, 12, 0);

        // when
        BlogMember member = BlogMember.invite(
                colog,
                invitee,
                "Backend",
                BlogPermission.MEMBER,
                joinedAt
        );

        // then
        assertThat(member)
                .extracting(
                        BlogMember::getBlog,
                        BlogMember::getUser,
                        BlogMember::getBlogRole,
                        BlogMember::getPermission,
                        BlogMember::getStatus,
                        BlogMember::getJoinedAt
                )
                .containsExactly(
                        colog,
                        invitee,
                        "Backend",
                        BlogPermission.MEMBER,
                        BlogMemberStatus.ACTIVE,
                        joinedAt
                );
    }

    @Test
    @DisplayName("활성 OWNER와 ADMIN 멤버는 사용자를 초대할 수 있다")
    void validateCanInviteAllowsActiveOwnerAndAdmin() {
        // given
        BlogMember owner = createMember(BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);

        // when - then
        assertThatCode(() -> owner.validateCanInvite(BlogPermission.ADMIN))
                .doesNotThrowAnyException();
        assertThatCode(() -> admin.validateCanInvite(BlogPermission.MEMBER))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("MEMBER 권한의 팀 멤버는 사용자를 초대할 수 없다")
    void validateCanInviteRejectsMemberPermission() {
        // given
        BlogMember member = createMember(BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when - then
        assertThatThrownBy(() -> member.validateCanInvite(BlogPermission.MEMBER))
                .isInstanceOf(BlogException.class)
                .extracting("errorInformation")
                .isEqualTo(BLOG_MEMBER_INVITE_FORBIDDEN);
    }

    @Test
    @DisplayName("활성 상태가 아닌 팀 멤버는 사용자를 초대할 수 없다")
    void validateCanInviteRejectsInactiveMember() {
        // given
        BlogMember member = createMember(BlogPermission.OWNER, BlogMemberStatus.LEFT);

        // when - then
        assertThatThrownBy(() -> member.validateCanInvite(BlogPermission.MEMBER))
                .isInstanceOf(BlogException.class)
                .extracting("errorInformation")
                .isEqualTo(BLOG_MEMBER_INVITE_FORBIDDEN);
    }

    @Test
    @DisplayName("초대받는 사용자에게 OWNER 권한을 부여할 수 없다")
    void validateCanInviteRejectsOwnerPermissionForInvitee() {
        // given
        BlogMember owner = createMember(BlogPermission.OWNER, BlogMemberStatus.ACTIVE);

        // when - then
        assertThatThrownBy(() -> owner.validateCanInvite(BlogPermission.OWNER))
                .isInstanceOf(BlogException.class)
                .extracting("errorInformation")
                .isEqualTo(BLOG_MEMBER_PERMISSION_INVALID);
    }

    private BlogMember createMember(BlogPermission permission, BlogMemberStatus status) {
        return BlogMember.builder()
                .permission(permission)
                .status(status)
                .build();
    }
}
