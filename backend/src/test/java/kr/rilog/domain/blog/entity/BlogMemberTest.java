package kr.rilog.domain.blog.entity;

import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static kr.rilog.support.BlogFixture.*;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.ADMIN_PERMISSION_INVALID;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_INVITATION_PERMISSION_INVALID;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_INVITE_FORBIDDEN;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlogMemberTest {

    private static final Long OWNER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;

    @Test
    @DisplayName("팀 생성자는 OWNER 권한의 활성 멤버로 생성된다")
    void createOwnerCreatesActiveOwnerMember() {
        // given
        User owner = createUser(OWNER_ID);
        User otherUser = createUser(OTHER_USER_ID);
        Blog colog = createColog(otherUser);

        // when
        BlogMember member = BlogMember.createOwner(colog, owner, pastDate());

        // then
        assertThat(member.getPermission()).isEqualTo(BlogPermission.OWNER);
    }

    @Test
    @DisplayName("초대된 사용자는 지정한 권한과 역할을 가진 ACTIVE 멤버로 생성된다")
    void inviteCreatesActiveMember() {
        // given
        User invitedUser = createUser(OTHER_USER_ID);
        Blog colog = createColog(invitedUser);

        // when
        BlogMember member = BlogMember.invite(
                colog,
                invitedUser,
                "Backend",
                BlogPermission.MEMBER,
                pastDate()
        );

        // then
        assertThat(member.getStatus()).isEqualTo(BlogMemberStatus.ACTIVE);
    }

    @Test
    @DisplayName("활성 OWNER와 ADMIN 멤버는 사용자를 초대할 수 있다")
    void validateCanInviteAllowsActiveOwnerAndAdmin() {
        // given
        BlogMember owner = createMember(BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);

        // when & then
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

        // when & then
        assertThatThrownBy(() -> member.validateCanInvite(BlogPermission.MEMBER))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_MEMBER_INVITE_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("활성 상태가 아닌 팀 멤버는 사용자를 초대할 수 없다")
    void validateCanInviteRejectsInactiveMember() {
        // given
        BlogMember member = createMember(BlogPermission.OWNER, BlogMemberStatus.LEFT);

        // when & then
        assertThatThrownBy(() -> member.validateCanInvite(BlogPermission.MEMBER))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_MEMBER_INVITE_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("초대받는 사용자에게 OWNER 권한을 부여할 수 없다")
    void validateCanInviteRejectsOwnerPermissionForInvitee() {
        // given
        BlogMember owner = createMember(BlogPermission.OWNER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(() -> owner.validateCanInvite(BlogPermission.OWNER))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_MEMBER_INVITATION_PERMISSION_INVALID.getMessage());
    }

    @Test
    @DisplayName("활성 ADMIN 멤버는 ADMIN 권한 검증을 통과한다.")
    void validateHasAdminPermissionAllowsActiveAdmin() {
        // given
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatCode(admin::validateHasAdminPermission)
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("ADMIN 권한이 아닌 멤버는 ADMIN 권한 검증에 실패한다.")
    void validateHasAdminPermissionRejectsNonAdmin() {
        // given
        BlogMember member = createMember(BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(member::validateHasAdminPermission)
                .isInstanceOf(BlogException.class)
                .hasMessage(ADMIN_PERMISSION_INVALID.getMessage());
    }

    @Test
    @DisplayName("활성 상태가 아닌 ADMIN 멤버는 ADMIN 권한 검증에 실패한다.")
    void validateHasAdminPermissionRejectsInactiveAdmin() {
        // given
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.LEFT);

        // when & then
        assertThatThrownBy(admin::validateHasAdminPermission)
                .isInstanceOf(BlogException.class)
                .hasMessage(ADMIN_PERMISSION_INVALID.getMessage());
    }

    private BlogMember createMember(BlogPermission permission, BlogMemberStatus status) {
        return BlogMember.builder()
                .permission(permission)
                .status(status)
                .build();
    }

}
