package kr.rilog.domain.blog.entity;

import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

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
                .slug("rilog-team")
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
}
