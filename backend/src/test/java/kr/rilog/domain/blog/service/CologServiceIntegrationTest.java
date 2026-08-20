package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.CologMemberInviteCommand;
import kr.rilog.domain.blog.service.dto.command.CologProfileUpdateCommand;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class CologServiceIntegrationTest extends ServiceSupport {

    private static final String COLOG_SLUG = "rilog-team";

    @Autowired
    private CologService cologService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Test
    @DisplayName("OWNER는 사용자를 ADMIN 멤버로 초대한다.")
    void inviteMemberPersistsActiveAdminMember() {
        // given
        InvitationScenario scenario = createInvitationScenario();

        CologMemberInviteCommand command = new CologMemberInviteCommand(
                scenario.invitee().getId(),
                BlogPermission.ADMIN,
                "Backend"
        );

        // when
        CologMemberInviteResult result = cologService.inviteMember(
                scenario.owner().getId(),
                COLOG_SLUG,
                command
        );

        // then
        BlogMember savedMember = getBlogMember(scenario);

        assertThat(savedMember.getPermission()).isEqualTo(BlogPermission.ADMIN);
        assertThat(result.permission()).isEqualTo(BlogPermission.ADMIN);
    }

    @Test
    @DisplayName("OWNER는 사용자를 MEMBER 멤버로 초대한다.")
    void inviteMemberPersistsActiveMember() {
        // given
        InvitationScenario scenario = createInvitationScenario();

        CologMemberInviteCommand command =
                new CologMemberInviteCommand(
                        scenario.invitee().getId(),
                        BlogPermission.MEMBER,
                        "Backend"
                );

        // when
        CologMemberInviteResult result = cologService.inviteMember(
                scenario.owner().getId(),
                COLOG_SLUG,
                command
        );

        // then
        BlogMember savedMember = getBlogMember(scenario);

        assertThat(savedMember.getPermission()).isEqualTo(BlogPermission.MEMBER);
        assertThat(result.permission()).isEqualTo(BlogPermission.MEMBER);
    }

    @Test
    @DisplayName("ADMIN이 팀 프로필을 변경하면 변경된 프로필이 저장된다.")
    void changeCologProfilePersistsChangedProfile() {
        // given
        User owner = userRepository.save(createUser(100L, "owner"));
        User admin = userRepository.save(createUser(200L, "admin"));
        Blog colog = blogRepository.save(createColog(owner));
        blogMemberRepository.saveAndFlush(
                BlogMember.invite(
                        colog,
                        admin,
                        "Backend",
                        BlogPermission.ADMIN,
                        LocalDateTime.now()
                )
        );
        CologProfileUpdateCommand command = new CologProfileUpdateCommand(
                "https://example.com/new-profile.png",
                "https://example.com/new-cover.png",
                "새 리로그 팀",
                "새 팀 소개",
                "https://new-rilog.example.com",
                "https://github.com/new-rilog",
                "new-rilog@example.com"
        );
        Profile expectedProfile = command.toProfile();

        // when
        cologService.changeCologProfile(admin.getId(), COLOG_SLUG, command);

        // then
        Blog savedColog = blogRepository.findById(colog.getId()).orElseThrow();
        assertThat(savedColog.getProfile())
                .usingRecursiveComparison()
                .isEqualTo(expectedProfile);
    }

    private InvitationScenario createInvitationScenario() {
        User owner = userRepository.save(
                createUser(100L, "owner")
        );
        User invitee = userRepository.save(
                createUser(200L, "invitee")
        );

        Blog colog = blogRepository.save(
                createColog(owner)
        );

        blogMemberRepository.saveAndFlush(
                BlogMember.createOwner(colog, owner, LocalDateTime.now())
        );

        return new InvitationScenario(owner, invitee, colog);
    }

    private User createUser(Long githubId, String slug) {
        return User.builder()
                .githubId(githubId)
                .slug(Slug.from(slug))
                .build();
    }

    private Blog createColog(User owner) {
        return Blog.createColog(
                owner,
                COLOG_SLUG,
                Profile.createColog(
                        "리로그 팀",
                        "세계 최고의 블로그 플랫폼 Rilog. 입니다.",
                        "https://example.com/profile.png",
                        "https://example.com/cover.png",
                        "https://rilog.example.com",
                        "https://github.com/rilog",
                        "test@test.com"
                )
        );
    }

    private record InvitationScenario(
            User owner,
            User invitee,
            Blog colog
    ) {
    }


    private BlogMember getBlogMember(InvitationScenario scenario) {
        return blogMemberRepository
                .findByBlogIdAndUserIdAndStatus(
                        scenario.colog().getId(),
                        scenario.invitee().getId(),
                        BlogMemberStatus.ACTIVE
                ).orElseThrow();
    }


}
