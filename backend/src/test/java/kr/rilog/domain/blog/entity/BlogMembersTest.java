package kr.rilog.domain.blog.entity;

import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BlogMembersTest {

    @Test
    @DisplayName("활성 블로그 구성원 목록은 사용자별 활성 구성원 여부를 판단한다.")
    void determineActiveMember() {
        // given
        BlogMember activeMember = createMember(1L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);
        BlogMember leftMember = createMember(2L, BlogPermission.MEMBER, BlogMemberStatus.LEFT);
        BlogMembers blogMembers = BlogMembers.from(List.of(activeMember, leftMember));

        // when - then
        assertThat(blogMembers.isActiveMember(1L)).isTrue();
        assertThat(blogMembers.isActiveMember(2L)).isFalse();
    }

    @Test
    @DisplayName("활성 OWNER와 ADMIN은 블로그 콘텐츠 삭제 권한을 가진다.")
    void determineDeletePermission() {
        // given
        BlogMember owner = createMember(1L, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember admin = createMember(2L, BlogPermission.ADMIN, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(3L, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);
        BlogMembers blogMembers = BlogMembers.from(List.of(owner, admin, member));

        // when - then
        assertThat(blogMembers.hasDeletePermission(1L)).isTrue();
        assertThat(blogMembers.hasDeletePermission(2L)).isTrue();
        assertThat(blogMembers.hasDeletePermission(3L)).isFalse();
    }

    private BlogMember createMember(
            Long userId,
            BlogPermission permission,
            BlogMemberStatus status
    ) {
        User user = User.builder()
                .id(userId)
                .build();
        return BlogMember.builder()
                .user(user)
                .permission(permission)
                .status(status)
                .build();
    }

}
