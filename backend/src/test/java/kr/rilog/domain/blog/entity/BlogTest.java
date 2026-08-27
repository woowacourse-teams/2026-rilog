package kr.rilog.domain.blog.entity;

import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.COLOG_DELETE_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.support.fixure.BlogFixture.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlogTest {

    private static final Long OWNER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;

    @Test
    @DisplayName("개인 블로그를 생성하면 사용자 프로필 정보와 RILOG 타입이 설정된다")
    void createRilogCreatesPersonalBlogFromOwnerProfile() {
        // given
        User owner = createUser(OWNER_ID);

        // when
        Blog rilog = Blog.createRilog(owner);

        // then
        assertThat(rilog.getBlogType()).isEqualTo(BlogType.RILOG);
    }

    @Test
    @DisplayName("팀 블로그를 생성하면 COLOG 타입으로 소유자가 설정된다")
    void createCologCreatesTeamBlog() {
        // given
        User owner = createUser(OWNER_ID);

        // when
        Blog colog = Blog.createColog(
                owner,
                "team_rilog",
                cologProfile()
        );

        // then
        assertThat(colog.getBlogType()).isEqualTo(BlogType.COLOG);
    }

    @Test
    @DisplayName("사용자가 블로그 소유자이면 소유자 검증을 통과한다")
    void validateIsOwnerPassesWhenUserIsOwner() {
        // given
        User owner = createUser(OWNER_ID);
        User user = createUser(OWNER_ID);

        // when
        Blog blog = createRilog(owner);

        // then
        assertThatCode(() -> blog.validateIsOwner(user)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("사용자가 블로그 소유자가 아니면 예외가 발생한다")
    void validateIsOwnerFailsWhenUserIsNotOwner() {
        // given
        User owner = createUser(OWNER_ID);
        User user = createUser(OTHER_USER_ID);

        // when
        Blog blog = createRilog(owner);

        // then
        assertThatThrownBy(() -> blog.validateIsOwner(user))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("요청자 ID가 블로그 소유자 ID와 같으면 소유자 검증을 통과한다")
    void validateIsOwnerPassesWhenRequesterIdIsOwnerId() {
        // given
        Blog blog = createRilog(createUser(OWNER_ID));

        // when - then
        assertThatCode(() -> blog.validateIsOwner(OWNER_ID))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("요청자 ID가 블로그 소유자 ID와 다르면 예외가 발생한다")
    void validateIsOwnerFailsWhenRequesterIdIsNotOwnerId() {
        // given
        Blog blog = createRilog(createUser(OWNER_ID));

        // when - then
        assertThatThrownBy(() -> blog.validateIsOwner(OTHER_USER_ID))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("블로그 프로필을 변경하면 새 프로필이 반영된다.")
    void changeProfileReplacesProfile() {
        // given
        Blog blog = createColog(createUser(OWNER_ID));
        Profile newProfile = Profile.createColog(
                "새 팀 이름",
                "새 팀 소개",
                "https://example.com/new-profile.png",
                "https://example.com/new-cover.png",
                "https://new-rilog.example.com",
                "https://github.com/new-rilog",
                "new-rilog@example.com"
        );

        // when
        blog.changeProfile(newProfile);

        // then
        assertThat(blog.getProfile())
                .usingRecursiveComparison()
                .isEqualTo(newProfile);
    }

    @Test
    @DisplayName("ACTIVE OWNER가 팀 블로그를 삭제하면 팀과 ACTIVE 멤버가 삭제 처리된다.")
    void deleteCologByLeavesActiveMembersAndDeletesColog() {
        // given
        User owner = createUser(OWNER_ID);
        User memberUser = createUser(OTHER_USER_ID);
        Blog colog = createColog(owner);
        BlogMember ownerMember = createMember(colog, owner, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);
        BlogMember member = createMember(colog, memberUser, BlogPermission.MEMBER, BlogMemberStatus.ACTIVE);

        // when
        colog.deleteCologBy(ownerMember, List.of(ownerMember, member));

        // then
        assertThat(colog.getDeletedAt()).isNotNull();
        assertThat(ownerMember.getStatus()).isEqualTo(BlogMemberStatus.LEFT);
        assertThat(member.getStatus()).isEqualTo(BlogMemberStatus.LEFT);
        assertThat(ownerMember.getDeletedAt()).isNotNull();
        assertThat(member.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("다른 팀 블로그의 OWNER는 팀 블로그를 삭제할 수 없다.")
    void deleteCologByRejectsOtherCologOwner() {
        // given
        User owner = createUser(OWNER_ID);
        Blog targetColog = createColog(owner);
        Blog otherColog = targetColog();
        BlogMember otherOwner = createMember(otherColog, owner, BlogPermission.OWNER, BlogMemberStatus.ACTIVE);

        // when & then
        assertThatThrownBy(() -> targetColog.deleteCologBy(otherOwner, List.of(otherOwner)))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_DELETE_FORBIDDEN.getMessage());
        assertThat(targetColog.getDeletedAt()).isNull();
        assertThat(otherOwner.getStatus()).isEqualTo(BlogMemberStatus.ACTIVE);
    }

    private BlogMember createMember(
            Blog blog,
            User user,
            BlogPermission permission,
            BlogMemberStatus status
    ) {
        return BlogMember.builder()
                .blog(blog)
                .user(user)
                .permission(permission)
                .status(status)
                .build();
    }

}
