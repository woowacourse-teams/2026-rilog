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
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CologCommandServiceIntegrationTest extends ServiceSupport {

    private static final String COLOG_SLUG = "rilog_team";

    @Autowired
    private CologCommandService cologCommandService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private PostRepository postRepository;

    @Test
    @DisplayName("Colog를 생성하면 생성자가 해당 팀의 활성 OWNER로 저장된다.")
    void createPersistsActiveOwnerMembership() {
        // given
        User owner = userRepository.saveAndFlush(createUser(100L, "owner"));
        CologCreateCommand command = new CologCreateCommand(
                "리로그 팀",
                COLOG_SLUG,
                "팀 소개",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog",
                "test@test.com"
        );

        // when
        CologCreateResult result = cologCommandService.create(owner.getId(), command);

        // then
        BlogMember savedMember = blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                result.id(), owner.getId(), BlogMemberStatus.ACTIVE
        ).orElseThrow();
        assertThat(savedMember.getPermission()).isEqualTo(BlogPermission.OWNER);
    }

    @Test
    @DisplayName("이름이 다른 Colog라도 이미 사용 중인 slug로 저장하면 DB 유일성 제약에 걸린다.")
    void saveAndFlushRejectsDuplicateCologSlug() {
        // given
        User owner = userRepository.saveAndFlush(createUser(100L, "owner"));
        blogRepository.saveAndFlush(createColog(owner));
        Blog duplicateSlugColog = Blog.createColog(owner, COLOG_SLUG, BlogFixture.cologProfile());

        // when - then
        assertThatThrownBy(() -> blogRepository.saveAndFlush(duplicateSlugColog))
                .isInstanceOf(DataIntegrityViolationException.class);
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
        cologCommandService.leaveColog(scenario.invitee().getId(), COLOG_SLUG);

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
        cologCommandService.removeMember(scenario.owner().getId(), COLOG_SLUG, adminMember.getId());

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
        Post cologPost = postRepository.saveAndFlush(PostFixture.publicPublishedColog(rilog, scenario.colog(), scenario.owner()));

        // when
        cologCommandService.deleteColog(scenario.owner().getId(), COLOG_SLUG);

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
        User owner = userRepository.save(createUser(100L, "owner"));
        User invitee = userRepository.save(createUser(200L, "invitee"));

        Blog colog = blogRepository.save(createColog(owner));
        blogMemberRepository.saveAndFlush(BlogMember.createOwner(colog, owner, LocalDateTime.now()));
        return new InvitationScenario(owner, invitee, colog);
    }

    private User createUser(Long githubId, String slug) {
        return User.builder()
                .githubId(githubId)
                .slug(Slug.from(slug))
                .build();
    }

    private Blog saveRilog(User owner) {
        return blogRepository.saveAndFlush(Blog.builder()
                .owner(owner)
                .slug(Slug.from("owner_rilog"))
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

}
