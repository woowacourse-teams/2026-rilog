package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.CologMemberInviteCommand;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.PostFixture;
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

    @Autowired
    private PostRepository postRepository;

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
    @DisplayName("MEMBER가 팀에서 탈퇴하면 ACTIVE 멤버 조회에서 제외된다.")
    void leaveCologPersistsLeftStatus() {
        // given
        InvitationScenario scenario = createInvitationScenario();
        BlogMember member = blogMemberRepository.saveAndFlush(BlogMember.invite(
                scenario.colog(),
                scenario.invitee(),
                "Backend",
                BlogPermission.MEMBER,
                LocalDateTime.now()
        ));

        // when
        cologService.leaveColog(scenario.invitee().getId(), COLOG_SLUG);

        // then
        assertThat(blogMemberRepository.findByBlogIdAndUserIdAndStatus(
                scenario.colog().getId(),
                scenario.invitee().getId(),
                BlogMemberStatus.ACTIVE
        )).isEmpty();
        assertThat(blogMemberRepository.findById(member.getId()).orElseThrow().getStatus())
                .isEqualTo(BlogMemberStatus.LEFT);
    }

    @Test
    @DisplayName("OWNER가 ADMIN을 내보내면 대상이 ACTIVE 멤버 조회에서 제외된다.")
    void removeMemberPersistsLeftStatus() {
        // given
        InvitationScenario scenario = createInvitationScenario();
        BlogMember adminMember = blogMemberRepository.saveAndFlush(BlogMember.invite(
                scenario.colog(),
                scenario.invitee(),
                "Backend",
                BlogPermission.ADMIN,
                LocalDateTime.now()
        ));

        // when
        cologService.removeMember(scenario.owner().getId(), COLOG_SLUG, adminMember.getId());

        // then
        assertThat(blogMemberRepository.findByBlogIdAndUserIdAndStatus(
                scenario.colog().getId(),
                scenario.invitee().getId(),
                BlogMemberStatus.ACTIVE
        )).isEmpty();
        assertThat(blogMemberRepository.findById(adminMember.getId()).orElseThrow().getStatus())
                .isEqualTo(BlogMemberStatus.LEFT);
    }

    @Test
    @DisplayName("OWNER가 팀 블로그를 삭제하면 팀과 팀 게시글, 팀 멤버가 삭제 처리된다.")
    void deleteCologPersistsCologPostAndMemberDeletion() {
        // given
        InvitationScenario scenario = createInvitationScenario();
        Blog rilog = saveRilog(scenario.owner());
        BlogMember member = blogMemberRepository.saveAndFlush(BlogMember.invite(
                scenario.colog(),
                scenario.invitee(),
                "Backend",
                BlogPermission.MEMBER,
                LocalDateTime.now()
        ));
        Post cologPost = postRepository.saveAndFlush(
                PostFixture.publicPublishedColog(rilog, scenario.colog(), scenario.owner())
        );

        // when
        cologService.deleteColog(scenario.owner().getId(), COLOG_SLUG);

        // then
        Blog deletedColog = blogRepository.findById(scenario.colog().getId()).orElseThrow();
        BlogMember deletedOwnerMember = blogMemberRepository
                .findByBlogIdAndUserIdAndStatus(
                        scenario.colog().getId(),
                        scenario.owner().getId(),
                        BlogMemberStatus.LEFT
                )
                .orElseThrow();
        BlogMember deletedMember = blogMemberRepository.findById(member.getId()).orElseThrow();
        Post deletedPost = postRepository.findById(cologPost.getId()).orElseThrow();

        assertThat(deletedColog.getDeletedAt()).isNotNull();
        assertThat(deletedOwnerMember.getDeletedAt()).isNotNull();
        assertThat(deletedMember.getStatus()).isEqualTo(BlogMemberStatus.LEFT);
        assertThat(deletedMember.getDeletedAt()).isNotNull();
        assertThat(deletedPost.getDeletedAt()).isNotNull();
        assertThat(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .isEmpty();
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

    private Blog saveRilog(User owner) {
        return blogRepository.saveAndFlush(Blog.builder()
                .owner(owner)
                .slug(Slug.from("owner-rilog"))
                .profile(Profile.createRilog(
                        "러로",
                        "기록하는 개발자입니다.",
                        "https://example.com/profile.png",
                        "rilog@example.com",
                        "https://github.com/rilog"
                ))
                .blogType(BlogType.RILOG)
                .build());
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
