package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.BlogProfileUpdateCommand;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Email;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class BlogCommandServiceIntegrationTest extends ServiceSupport {

    @Autowired
    private BlogCommandService blogCommandService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Test
    @DisplayName("ADMIN이 COLOG 프로필을 변경하면 변경된 프로필이 저장된다.")
    void changeBlogProfilePersistsChangedCologProfile() {
        // given
        User owner = userRepository.save(User.createPendingGithubUser(100L, "owner", "https://example.com/owner.png"));
        User admin = userRepository.save(User.createPendingGithubUser(200L, "admin", "https://example.com/admin.png"));
        Blog colog = blogRepository.save(createColog(owner, "team_a", "리로그 팀"));
        blogMemberRepository.saveAndFlush(
                BlogMember.invite(
                        colog,
                        admin,
                        "Backend",
                        BlogPermission.ADMIN,
                        LocalDateTime.now()
                )
        );
        BlogProfileUpdateCommand command = new BlogProfileUpdateCommand(
                "https://example.com/new_profile.png",
                "https://example.com/new_cover.png",
                "새 리로그 팀",
                "새 팀 소개",
                "https://new_rilog.example.com",
                "https://github.com/new_rilog",
                "new_rilog@example.com"
        );

        // when
        blogCommandService.changeBlogProfile(admin.getId(), "team_a", command);

        // then
        Blog savedColog = blogRepository.findById(colog.getId()).orElseThrow();
        assertThat(savedColog.getName()).isEqualTo(command.name());
        assertThat(savedColog.getCoverImageUrl()).isEqualTo(command.coverImageUrl());
    }

    @Test
    @DisplayName("RILOG 프로필을 변경하면 개인 블로그와 소유자 프로필 정보가 함께 변경된다.")
    void changeBlogProfilePersistsChangedRilogProfileAndOwnerProfile() {
        // given
        User owner = userRepository.save(createCompletedUser(400L, "러로", "riro"));
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(owner, "https://rilog.example.com"));
        BlogProfileUpdateCommand command = new BlogProfileUpdateCommand(
                "https://example.com/new_profile.png",
                null,
                "새 개인 블로그",
                "새 소개",
                "https://new_rilog.example.com",
                "https://github.com/new_rilog",
                "new_rilog@example.com"
        );

        // when
        blogCommandService.changeBlogProfile(owner.getId(), "riro", command);

        // then
        Blog savedRilog = blogRepository.findById(rilog.getId()).orElseThrow();
        User savedOwner = userRepository.findById(owner.getId()).orElseThrow();

        assertThat(savedRilog.getName()).isEqualTo(command.name());
        assertThat(savedRilog.getServiceUrl()).isEqualTo(command.serviceUrl());
        assertThat(savedOwner.getNickname()).isEqualTo(command.name());
        assertThat(savedOwner.getProfileImageUrl()).isEqualTo(command.profileImageUrl());
    }

    private Blog createColog(User owner, String slug, String name) {
        return Blog.createColog(
                owner,
                slug,
                Profile.createColog(
                        name,
                        "팀 소개",
                        "https://example.com/profile.png",
                        "https://example.com/cover.png",
                        "https://rilog.example.com",
                        "https://github.com/rilog",
                        "test@test.com"
                )
        );
    }

    private User createCompletedUser(Long githubId, String nickname, String slug) {
        return User.builder()
                .githubId(githubId)
                .nickname(Nickname.from(nickname))
                .slug(Slug.from(slug))
                .introduction("기록하는 개발자입니다.")
                .profileImageUrl("https://example.com/profile.png")
                .githubUrl("https://github.com/%s".formatted(slug))
                .email(Email.from("%s@example.com".formatted(slug)))
                .build();
    }

}
