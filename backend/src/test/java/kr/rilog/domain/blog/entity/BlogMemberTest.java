package kr.rilog.domain.blog.entity;

import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.user.entity.User;
import kr.rilog.support.fixure.BlogMemberFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.*;
import static kr.rilog.support.fixure.BlogFixture.*;

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
    @DisplayName("두 블로그 멤버가 모두 ACTIVE이면 대상 멤버의 블로그로 이동할 수 있다. (Rilog -> Colog)")
    void transferReturnsTargetMembersBlogWhenBothMembersAreActiveFromRilog() {
        // given
        User writer = createUser(OWNER_ID);
        Blog sourceBlog = createRilog(writer);
        Blog targetBlog = targetColog();
        BlogMember sourceMember = createMember(sourceBlog, writer, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember targetMember = createMember(targetBlog, writer, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when
        Blog transferredBlog = sourceMember.transfer(targetMember);

        // then
        assertThat(transferredBlog).isSameAs(targetBlog);
    }

    @Test
    @DisplayName("두 블로그 멤버가 모두 ACTIVE이면 대상 멤버의 블로그로 이동할 수 있다. (Colog -> Rilog)")
    void transferReturnsTargetMembersBlogWhenBothMembersAreActiveFromColog() {
        // given
        User writer = createUser(OWNER_ID);
        Blog sourceBlog = createColog(writer);
        Blog targetBlog = otherUserRilog();
        BlogMember sourceMember = createMember(sourceBlog, writer, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);
        BlogMember targetMember = createMember(targetBlog, writer, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);

        // when
        Blog transferredBlog = sourceMember.transfer(targetMember);

        // then
        assertThat(transferredBlog).isSameAs(targetBlog);
    }

    @Test
    @DisplayName("현재 블로그 멤버가 ACTIVE가 아니면 블로그를 이동할 수 없다.")
    void transferRejectsInactiveSourceMember() {
        // given
        User writer = createUser(OWNER_ID);
        Blog sourceBlog = createRilog(writer);
        Blog targetBlog = targetColog();
        BlogMember sourceMember = createMember(sourceBlog, writer, BlogPermission.OWNER, BlogMemberStatus.LEFT);
        BlogMember targetMember = createMember(targetBlog, writer, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(() -> sourceMember.transfer(targetMember))
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());
    }

    @Test
    @DisplayName("대상 블로그 멤버가 ACTIVE가 아니면 블로그를 이동할 수 없다.")
    void transferRejectsInactiveTargetMember() {
        // given
        User writer = createUser(OWNER_ID);
        Blog sourceBlog = createRilog(writer);
        Blog targetBlog = targetColog();
        BlogMember sourceMember = createMember(sourceBlog, writer, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember targetMember = createMember(targetBlog, writer, BlogPermission.MEMBER, BlogMemberStatus.LEFT);

        // when & then
        assertThatThrownBy(() -> sourceMember.transfer(targetMember))
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());
    }

    @Test
    @DisplayName("활성 OWNER와 ADMIN은 사용자를 초대할 수 있다.")
    void inviteMemberAllowsActiveOwnerAndAdmin() {
        // given
        BlogMember ownerMember = createMember(BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember adminMember = createMember(BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatCode(() -> ownerMember.validateAdminPermission())
                .doesNotThrowAnyException();
        assertThatCode(() -> adminMember.validateAdminPermission())
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("MEMBER는 사용자를 초대할 수 없다.")
    void inviteMemberRejectsMemberPermission() {
        // given
        BlogMember member = createMember(BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(() -> member.validateAdminPermission())
                .isInstanceOf(BlogException.class)
                .hasMessage(ADMIN_PERMISSION_REQUIRED.getMessage());
    }

    @Test
    @DisplayName("활성 상태가 아닌 팀 멤버는 사용자를 초대할 수 없다.")
    void inviteMemberRejectsInactiveOwner() {
        // given
        BlogMember member = createMember(BlogPermission.OWNER, BlogMemberStatus.LEFT);

        // when & then
        assertThatThrownBy(() -> member.validateAdminPermission())
                .isInstanceOf(BlogException.class)
                .hasMessage(ADMIN_PERMISSION_REQUIRED.getMessage());
    }

    @Test
    @DisplayName("개인 블로그 OWNER는 블로그를 관리할 수 있다.")
    void manageBlogAllowsRilogOwner() {
        // given
        User owner = createUser(OWNER_ID);
        Blog rilog = createRilog(owner);
        BlogMember ownerMember = BlogMember.createOwner(rilog, owner, pastDate());

        // when & then
        assertThatCode(ownerMember::validateAdminPermission)
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("활성 ADMIN은 챕터를 관리할 수 있다.")
    void manageChapterAllowsActiveAdmin() {
        // given
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatCode(admin::validateAdminPermission)
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("MEMBER는 챕터를 관리할 수 없다.")
    void manageChapterRejectsMember() {
        // given
        BlogMember member = createMember(BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(member::validateAdminPermission)
                .isInstanceOf(BlogException.class)
                .hasMessage(ADMIN_PERMISSION_REQUIRED.getMessage());
    }

    @Test
    @DisplayName("활성 상태가 아닌 ADMIN은 챕터를 관리할 수 없다.")
    void manageChapterRejectsInactiveAdmin() {
        // given
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.LEFT);

        // when & then
        assertThatThrownBy(admin::validateAdminPermission)
                .isInstanceOf(BlogException.class)
                .hasMessage(ADMIN_PERMISSION_REQUIRED.getMessage());
    }

    @Test
    @DisplayName("ACTIVE 상태의 ADMIN과 MEMBER는 팀에서 탈퇴할 수 있다.")
    void validateCanLeaveAllowsActiveAdminAndMember() {
        // given
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatCode(admin::validateCanLeave)
                .doesNotThrowAnyException();
        assertThatCode(member::validateCanLeave)
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("OWNER는 팀에서 바로 탈퇴할 수 없다.")
    void validateCanLeaveRejectsOwner() {
        // given
        BlogMember owner = createMember(BlogPermission.OWNER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(owner::validateCanLeave)
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_OWNER_LEAVE_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("ACTIVE가 아닌 멤버는 팀에서 탈퇴할 수 없다.")
    void validateCanLeaveRejectsInactiveMember() {
        // given
        BlogMember member = createMember(BlogPermission.MEMBER, BlogMemberStatus.LEFT);

        // when & then
        assertThatThrownBy(member::validateCanLeave)
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());
    }

    @Test
    @DisplayName("ACTIVE 상태의 OWNER는 팀 블로그를 삭제할 수 있다.")
    void validateCanDeleteCologAllowsActiveOwner() {
        // given
        BlogMember owner = createMember(BlogPermission.OWNER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatCode(owner::validateCanDeleteColog)
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("OWNER가 아닌 ACTIVE 멤버는 팀 블로그를 삭제할 수 없다.")
    void validateCanDeleteCologRejectsNonOwner() {
        // given
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(admin::validateCanDeleteColog)
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_DELETE_FORBIDDEN.getMessage());
        assertThatThrownBy(member::validateCanDeleteColog)
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_DELETE_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("ACTIVE가 아닌 OWNER는 팀 블로그를 삭제할 수 없다.")
    void validateCanDeleteCologRejectsInactiveOwner() {
        // given
        BlogMember owner = createMember(BlogPermission.OWNER, BlogMemberStatus.LEFT);

        // when & then
        assertThatThrownBy(owner::validateCanDeleteColog)
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());
    }

    @Test
    @DisplayName("개인 블로그 OWNER는 팀 블로그 삭제 권한 검증에 실패한다.")
    void validateCanDeleteCologRejectsRilogOwner() {
        // given
        User owner = createUser(OWNER_ID);
        Blog rilog = createRilog(owner);
        BlogMember ownerMember = BlogMember.createOwner(rilog, owner, pastDate());

        // when & then
        assertThatThrownBy(ownerMember::validateCanDeleteColog)
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_DELETE_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("본인 탈퇴를 하면 상태가 LEFT로 변경된다.")
    void leaveBySelfChangesStatusToLeft() {
        // given
        BlogMember member = createMember(BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when
        member.leaveBySelf();

        // then
        assertThat(member.getStatus()).isEqualTo(BlogMemberStatus.LEFT);
    }

    @Test
    @DisplayName("본인 탈퇴를 하면 delete() 가 반영된다.")
    void leaveBySelfChangesToDelete() {
        // given
        BlogMember member = createMember(BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when
        member.leaveBySelf();

        // then
        assertThat(member.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("OWNER는 ADMIN을 내보낼 수 있다.")
    void removeAdminByOwner() {
        // given
        BlogMember owner = createMember(1L, 1L, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember admin = createMember(2L, 2L, BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);

        // when
        assertThatCode(() -> owner.remove(admin))
                .doesNotThrowAnyException();

        // then
        assertThat(owner.getStatus()).isEqualTo(BlogMemberStatus.ACTIVE);
        assertThat(admin.getStatus()).isEqualTo(BlogMemberStatus.LEFT);
    }

    @Test
    @DisplayName("OWNER는 MEMBER를 내보낼 수 있다.")
    void removeMemberByOwner() {
        // given
        BlogMember owner = createMember(1L, 1L, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(3L, 3L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when
        assertThatCode(() -> owner.remove(member))
                .doesNotThrowAnyException();

        // then
        assertThat(owner.getStatus()).isEqualTo(BlogMemberStatus.ACTIVE);
        assertThat(member.getStatus()).isEqualTo(BlogMemberStatus.LEFT);
    }

    @Test
    @DisplayName("ADMIN은 MEMBER만 내보낼 수 있다.")
    void removeMember() {
        // given
        BlogMember admin = createMember(1L, 1L, BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(2L, 2L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when
        assertThatCode(() -> admin.remove(member))
                .doesNotThrowAnyException();

        // then
        assertThat(admin.getStatus()).isEqualTo(BlogMemberStatus.ACTIVE);
        assertThat(member.getStatus()).isEqualTo(BlogMemberStatus.LEFT);
    }

    @Test
    @DisplayName("ADMIN은 OWNER와 ADMIN을 내보낼 수 없다.")
    void removeRejectsAdminRemovingOwnerOrAdmin() {
        // given
        BlogMember admin = createMember(1L, 1L, BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);
        BlogMember owner = createMember(2L, 2L, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember otherAdmin = createMember(3L, 3L, BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(() -> admin.remove(owner))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_MEMBER_REMOVE_FORBIDDEN.getMessage());
        assertThatThrownBy(() -> admin.remove(otherAdmin))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_MEMBER_REMOVE_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("MEMBER는 다른 멤버를 내보낼 수 없다.")
    void removeRejectsMemberRemovingMember() {
        // given
        BlogMember requester = createMember(1L, 1L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);
        BlogMember target = createMember(2L, 2L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(() -> requester.remove(target))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_MEMBER_REMOVE_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("자기 자신은 강제 내보내기 API로 내보낼 수 없다.")
    void remove() {
        // given
        BlogMember member = createMember(1L, 1L, BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(() -> member.remove(member))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_SELF_REMOVE_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("활성 OWNER와 ADMIN 멤버는 게시글을 삭제할 수 있다.")
    void activeOwnerAndAdminHasDeletePermission() {
        // given
        BlogMember owner = createMember(BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);

        // when & then
        assertThat(owner.hasDeletePermission()).isTrue();
        assertThat(admin.hasDeletePermission()).isTrue();
    }

    @Test
    @DisplayName("MEMBER 권한의 팀 멤버는 게시글을 삭제할 수 없다.")
    void memberCannotDeletePost() {
        // given
        BlogMember member = createMember(BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThat(member.hasDeletePermission()).isFalse();
    }

    @Test
    @DisplayName("활성 상태가 아닌 OWNER와 ADMIN 멤버는 게시글을 삭제할 수 없다.")
    void inactiveOwnerAndAdminCannotDeletePost() {
        // given
        BlogMember owner = createMember(BlogPermission.OWNER, BlogMemberStatus.LEFT);
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.LEFT);

        // when & then
        assertThat(owner.hasDeletePermission()).isFalse();
        assertThat(admin.hasDeletePermission()).isFalse();
    }

    @Test
    @DisplayName("삭제된 OWNER와 ADMIN 멤버는 게시글을 삭제할 수 없다.")
    void deletedOwnerAndAdminCannotDeletePost() {
        // given
        BlogMember owner = createMember(BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember admin = createMember(BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);
        owner.delete();
        admin.delete();

        // when & then
        assertThat(owner.hasDeletePermission()).isFalse();
        assertThat(admin.hasDeletePermission()).isFalse();
    }

    @Test
    @DisplayName("OWNER는 MEMBER를 ADMIN으로 변경할 수 있다.")
    void changeAuthorityOfAllowsOwnerToPromoteMemberToAdmin() {
        // given
        BlogMember owner = createMember(1L, 1L, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(2L, 2L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when
        owner.changeAuthorityOf(member, BlogPermission.ADMIN, null);

        // then
        assertThat(owner.getPermission()).isEqualTo(BlogPermission.OWNER);
        assertThat(member.getPermission()).isEqualTo(BlogPermission.ADMIN);
    }

    @Test
    @DisplayName("OWNER는 ADMIN을 MEMBER로 변경할 수 있다.")
    void changeAuthorityOfAllowsOwnerToDemoteAdminToMember() {
        // given
        BlogMember owner = createMember(1L, 1L, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember admin = createMember(2L, 2L, BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);

        // when
        owner.changeAuthorityOf(admin, BlogPermission.MEMBER, null);

        // then
        assertThat(admin.getPermission()).isEqualTo(BlogPermission.MEMBER);
    }

    @Test
    @DisplayName("OWNER를 부여하면 기존 OWNER는 ADMIN이 되고 대상 멤버는 OWNER가 된다.")
    void changeAuthorityOfTransfersOwnerPermission() {
        // given
        BlogMember owner = createMember(1L, 1L, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(2L, 2L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when
        owner.changeAuthorityOf(member, BlogPermission.OWNER, null);

        // then
        assertThat(owner.getPermission()).isEqualTo(BlogPermission.ADMIN);
        assertThat(member.getPermission()).isEqualTo(BlogPermission.OWNER);
    }

    @Test
    @DisplayName("ADMIN은 MEMBER의 팀 내 역할명을 수정할 수 있다.")
    void updateAllowsAdminToChangeAuthorityOfMemberBlogRole() {
        // given
        BlogMember admin = createMember(1L, 1L, BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(2L, 2L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when
        admin.changeAuthorityOf(member, null, "Frontend");

        // then
        assertThat(member.getBlogRole()).isEqualTo("Frontend");
    }

    @Test
    @DisplayName("ADMIN이 MEMBER의 기존 권한을 함께 보내도 팀 내 역할명을 수정할 수 있다.")
    void updateAllowsAdminToChangeAuthorityOfMemberBlogRoleWithSamePermission() {
        // given
        BlogMember admin = createMember(1L, 1L, BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(2L, 2L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when
        admin.changeAuthorityOf(member, BlogPermission.MEMBER, "Frontend");

        // then
        assertThat(member.getPermission()).isEqualTo(BlogPermission.MEMBER);
        assertThat(member.getBlogRole()).isEqualTo("Frontend");
    }

    @Test
    @DisplayName("ADMIN은 MEMBER의 권한을 변경할 수 없다.")
    void changeAuthorityOfRejectsAdminChangingPermission() {
        // given
        BlogMember admin = createMember(1L, 1L, BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(2L, 2L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(() -> admin.changeAuthorityOf(member, BlogPermission.ADMIN, null))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_MEMBER_UPDATE_FORBIDDEN.getMessage());
        assertThat(member.getPermission()).isEqualTo(BlogPermission.MEMBER);
    }

    @Test
    @DisplayName("자기 자신의 권한은 멤버 정보 수정 API로 변경할 수 없다.")
    void changeAuthorityOfRejectsSelfPermissionChange() {
        // given
        BlogMember owner = createMember(1L, 1L, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(() -> owner.changeAuthorityOf(owner, BlogPermission.ADMIN, null))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_SELF_PERMISSION_UPDATE_FORBIDDEN.getMessage());
        assertThat(owner.getPermission()).isEqualTo(BlogPermission.OWNER);
    }

    @Test
    @DisplayName("MEMBER는 팀 멤버 정보를 수정할 수 없다.")
    void changeAuthorityOfRejectsMemberUpdatingBlogRole() {
        // given
        BlogMember requester = createMember(1L, 1L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);
        BlogMember target = createMember(2L, 2L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(() -> requester.changeAuthorityOf(target, null, "Frontend"))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_MEMBER_UPDATE_FORBIDDEN.getMessage());
        assertThat(target.getBlogRole()).isNull();
    }

    private BlogMember createMember(BlogPermission permission, BlogMemberStatus status) {
        User owner = createUser(OWNER_ID);
        Blog colog = createColog(owner);
        return BlogMember.builder()
                .blog(colog)
                .user(owner)
                .permission(permission)
                .status(status)
                .build();
    }

    private BlogMember createMember(Long id, Long userId, BlogPermission permission, BlogMemberStatus status) {
        User owner = createUser(OWNER_ID);
        Blog colog = createColog(owner);
        User user = createUser(userId);
        return BlogMember.builder()
                .id(id)
                .blog(colog)
                .user(user)
                .permission(permission)
                .status(status)
                .build();
    }

    private BlogMember createMember(Blog blog, User user, BlogPermission permission, BlogMemberStatus status) {
        return BlogMember.builder()
                .blog(blog)
                .user(user)
                .permission(permission)
                .status(status)
                .build();
    }

    @Test
    @DisplayName("ACTIVE가 아니면 탈퇴한 회원입니다.")
    void validateActiveMember() {
        // given
        BlogMember blogMember = BlogMemberFixture.leftMember();

        // when & then
        assertThatThrownBy(blogMember::validateActiveMember)
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());
    }

}
