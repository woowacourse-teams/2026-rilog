package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.blog.service.dto.command.CologMemberInviteCommand;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.blog.service.dto.result.CologDetailResult;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_INVITE_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_PERMISSION_INVALID;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CologServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long OWNER_ID = 1L;
    private static final Long COLOG_ID = 2L;
    private static final Long INVITEE_ID = 3L;
    private static final Instant NOW = Instant.parse("2026-08-13T12:00:00Z");

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    @Mock
    private UserRepository userRepository;

    private CologService cologService;

    @BeforeEach
    void setUp() {
        cologService = new CologService(
                blogRepository,
                blogMemberRepository,
                userRepository,
                Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    @DisplayName("팀을 생성하면 COLOG 블로그와 생성자 OWNER 멤버가 저장된다")
    void createCreatesCologAndOwnerMember() {
        // given
        User owner = createOwner();
        CologCreateCommand command = createCommand();
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));
        when(blogRepository.existsBySlug("rilog-team")).thenReturn(false);
        when(blogRepository.saveAndFlush(any(Blog.class))).thenAnswer(invocation -> {
            Blog colog = invocation.getArgument(0);
            return Blog.builder()
                    .id(COLOG_ID)
                    .owner(colog.getOwner())
                    .name(colog.getName())
                    .slug(colog.getSlug())
                    .introduction(colog.getIntroduction())
                    .logoUrl(colog.getLogoUrl())
                    .coverImageUrl(colog.getCoverImageUrl())
                    .serviceUrl(colog.getServiceUrl())
                    .githubUrl(colog.getGithubUrl())
                    .blogType(colog.getBlogType())
                    .build();
        });

        // when
        CologCreateResult result = cologService.create(OWNER_ID, command);

        // then
        ArgumentCaptor<Blog> blogCaptor = ArgumentCaptor.forClass(Blog.class);
        ArgumentCaptor<BlogMember> memberCaptor = ArgumentCaptor.forClass(BlogMember.class);
        verify(blogRepository).saveAndFlush(blogCaptor.capture());
        verify(blogMemberRepository).save(memberCaptor.capture());

        assertThat(blogCaptor.getValue())
                .extracting(
                        Blog::getOwner,
                        Blog::getSlug,
                        Blog::getLogoUrl,
                        Blog::getServiceUrl,
                        Blog::getGithubUrl,
                        Blog::getBlogType
                )
                .containsExactly(
                        owner,
                        "rilog-team",
                        "https://example.com/logo.png",
                        "https://rilog.example.com",
                        "https://github.com/rilog",
                        BlogType.COLOG
                );

        assertThat(memberCaptor.getValue())
                .extracting(
                        BlogMember::getUser,
                        BlogMember::getPermission,
                        BlogMember::getStatus,
                        BlogMember::getJoinedAt
                )
                .containsExactly(
                        owner,
                        BlogPermission.OWNER,
                        BlogMemberStatus.ACTIVE,
                        LocalDateTime.ofInstant(NOW, ZoneOffset.UTC)
                );

        assertThat(result).isEqualTo(new CologCreateResult(COLOG_ID, "리로그 팀", "rilog-team"));
    }

    @Test
    @DisplayName("팀 slug로 팀 상세 정보를 조회한다")
    void getDetailFindsCologBySlug() {
        // given
        User owner = createCompletedOwner();
        Blog colog = createDetailedColog(owner);
        when(blogRepository.findBySlugAndBlogType("rilog-team", BlogType.COLOG)).thenReturn(Optional.of(colog));

        // when
        CologDetailResult result = cologService.getDetail("rilog-team");

        // then
        assertThat(result)
                .extracting(
                        CologDetailResult::id,
                        CologDetailResult::name,
                        CologDetailResult::slug,
                        CologDetailResult::introduction,
                        CologDetailResult::logoUrl,
                        CologDetailResult::coverImageUrl,
                        CologDetailResult::serviceUrl,
                        CologDetailResult::githubUrl
                )
                .containsExactly(
                        COLOG_ID,
                        "리로그 팀",
                        "rilog-team",
                        "함께 쓰는 기술 블로그",
                        "https://example.com/logo.png",
                        "https://example.com/cover.png",
                        "https://rilog.example.com",
                        "https://github.com/rilog"
                );
        assertThat(result.user())
                .extracting(
                        CologDetailResult.UserResult::id,
                        CologDetailResult.UserResult::nickname,
                        CologDetailResult.UserResult::slug,
                        CologDetailResult.UserResult::profileImageUrl
                )
                .containsExactly(
                        OWNER_ID,
                        "리로",
                        "jinriro",
                        "https://example.com/profile.png"
                );
    }

    @Test
    @DisplayName("팀 slug에 해당하는 COLOG가 없으면 팀 상세 조회를 거부한다")
    void getDetailRejectsMissingColog() {
        // given
        when(blogRepository.findBySlugAndBlogType("unknown-team", BlogType.COLOG)).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> cologService.getDetail("unknown-team"))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_NOT_FOUND);
    }

    @Test
    @DisplayName("팀 slug가 이미 존재하면 팀 생성을 거부한다")
    void createRejectsDuplicateSlug() {
        // given
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(createOwner()));
        when(blogRepository.existsBySlug("rilog-team")).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> cologService.create(OWNER_ID, createCommand()))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_SLUG_ALREADY_EXISTS);
        verify(blogRepository, never()).saveAndFlush(any(Blog.class));
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("동시 팀 생성으로 slug 제약이 충돌하면 팀 생성을 거부한다")
    void createRejectsConcurrentDuplicateSlug() {
        // given
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(createOwner()));
        when(blogRepository.existsBySlug("rilog-team")).thenReturn(false);
        when(blogRepository.saveAndFlush(any(Blog.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate slug"));

        // when - then
        assertThatThrownBy(() -> cologService.create(OWNER_ID, createCommand()))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_SLUG_ALREADY_EXISTS);
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("팀 생성자가 존재하지 않으면 팀 생성을 거부한다")
    void createRejectsMissingOwner() {
        // given
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> cologService.create(OWNER_ID, createCommand()))
                .isInstanceOf(UserException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(USER_NOT_FOUND);
        verify(blogRepository, never()).saveAndFlush(any(Blog.class));
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("OWNER 권한 팀 멤버는 사용자를 ADMIN 멤버로 초대할 수 있다")
    void inviteMemberAllowsOwnerToInviteAdmin() {
        // given
        User owner = createOwner();
        User invitee = createInvitee();
        Blog colog = createColog(owner);
        BlogMember requesterMember = createMember(colog, owner, BlogPermission.OWNER);
        when(blogRepository.findByIdAndBlogType(COLOG_ID, BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatus(COLOG_ID, OWNER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(Optional.of(requesterMember));
        when(userRepository.findById(INVITEE_ID)).thenReturn(Optional.of(invitee));
        when(blogMemberRepository.existsByBlogIdAndUserIdAndStatus(COLOG_ID, INVITEE_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(false);
        when(blogMemberRepository.save(any(BlogMember.class))).thenAnswer(invocation -> {
            BlogMember member = invocation.getArgument(0);
            return BlogMember.builder()
                    .id(10L)
                    .blog(member.getBlog())
                    .user(member.getUser())
                    .blogRole(member.getBlogRole())
                    .permission(member.getPermission())
                    .status(member.getStatus())
                    .joinedAt(member.getJoinedAt())
                    .build();
        });

        // when
        CologMemberInviteResult result = cologService.inviteMember(
                OWNER_ID,
                COLOG_ID,
                new CologMemberInviteCommand(INVITEE_ID, BlogPermission.ADMIN, "Backend")
        );

        // then
        ArgumentCaptor<BlogMember> memberCaptor = ArgumentCaptor.forClass(BlogMember.class);
        verify(blogMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue())
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
                        BlogPermission.ADMIN,
                        BlogMemberStatus.ACTIVE,
                        LocalDateTime.ofInstant(NOW, ZoneOffset.UTC)
                );
        assertThat(result).isEqualTo(new CologMemberInviteResult(
                10L,
                INVITEE_ID,
                BlogPermission.ADMIN,
                "Backend"
        ));
    }

    @Test
    @DisplayName("ADMIN 권한 팀 멤버는 사용자를 MEMBER 멤버로 초대할 수 있다")
    void inviteMemberAllowsAdminToInviteMember() {
        // given
        User admin = createOwner();
        User invitee = createInvitee();
        Blog colog = createColog(admin);
        BlogMember requesterMember = createMember(colog, admin, BlogPermission.ADMIN);
        when(blogRepository.findByIdAndBlogType(COLOG_ID, BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(admin));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatus(COLOG_ID, OWNER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(Optional.of(requesterMember));
        when(userRepository.findById(INVITEE_ID)).thenReturn(Optional.of(invitee));
        when(blogMemberRepository.existsByBlogIdAndUserIdAndStatus(COLOG_ID, INVITEE_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(false);
        when(blogMemberRepository.save(any(BlogMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        cologService.inviteMember(
                OWNER_ID,
                COLOG_ID,
                new CologMemberInviteCommand(INVITEE_ID, BlogPermission.MEMBER, "Frontend")
        );

        // then
        ArgumentCaptor<BlogMember> memberCaptor = ArgumentCaptor.forClass(BlogMember.class);
        verify(blogMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getPermission()).isEqualTo(BlogPermission.MEMBER);
    }

    @Test
    @DisplayName("MEMBER 권한 팀 멤버는 사용자를 초대할 수 없다")
    void inviteMemberRejectsMemberRequester() {
        // given
        User requester = createOwner();
        Blog colog = createColog(requester);
        BlogMember requesterMember = createMember(colog, requester, BlogPermission.MEMBER);
        when(blogRepository.findByIdAndBlogType(COLOG_ID, BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(requester));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatus(COLOG_ID, OWNER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(Optional.of(requesterMember));

        // when - then
        assertThatThrownBy(() -> cologService.inviteMember(
                OWNER_ID,
                COLOG_ID,
                new CologMemberInviteCommand(INVITEE_ID, BlogPermission.MEMBER, "Frontend")
        ))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_MEMBER_INVITE_FORBIDDEN);
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("팀 멤버가 아닌 사용자는 사용자를 초대할 수 없다")
    void inviteMemberRejectsNonMemberRequester() {
        // given
        User requester = createOwner();
        Blog colog = createColog(requester);
        when(blogRepository.findByIdAndBlogType(COLOG_ID, BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(requester));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatus(COLOG_ID, OWNER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> cologService.inviteMember(
                OWNER_ID,
                COLOG_ID,
                new CologMemberInviteCommand(INVITEE_ID, BlogPermission.MEMBER, "Frontend")
        ))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_MEMBER_INVITE_FORBIDDEN);
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("OWNER 권한으로는 사용자를 초대할 수 없다")
    void inviteMemberRejectsOwnerPermission() {
        // given
        User owner = createOwner();
        Blog colog = createColog(owner);
        BlogMember requesterMember = createMember(colog, owner, BlogPermission.OWNER);
        when(blogRepository.findByIdAndBlogType(COLOG_ID, BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatus(COLOG_ID, OWNER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(Optional.of(requesterMember));

        // when - then
        assertThatThrownBy(() -> cologService.inviteMember(
                OWNER_ID,
                COLOG_ID,
                new CologMemberInviteCommand(INVITEE_ID, BlogPermission.OWNER, "Owner")
        ))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_MEMBER_PERMISSION_INVALID);
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("이미 ACTIVE 멤버인 사용자는 중복 초대할 수 없다")
    void inviteMemberRejectsAlreadyActiveMember() {
        // given
        User owner = createOwner();
        User invitee = createInvitee();
        Blog colog = createColog(owner);
        BlogMember requesterMember = createMember(colog, owner, BlogPermission.OWNER);
        when(blogRepository.findByIdAndBlogType(COLOG_ID, BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatus(COLOG_ID, OWNER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(Optional.of(requesterMember));
        when(userRepository.findById(INVITEE_ID)).thenReturn(Optional.of(invitee));
        when(blogMemberRepository.existsByBlogIdAndUserIdAndStatus(COLOG_ID, INVITEE_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(true);

        // when - then
        assertThatThrownBy(() -> cologService.inviteMember(
                OWNER_ID,
                COLOG_ID,
                new CologMemberInviteCommand(INVITEE_ID, BlogPermission.MEMBER, "Frontend")
        ))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_MEMBER_ALREADY_EXISTS);
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    private User createOwner() {
        return User.builder()
                .id(OWNER_ID)
                .githubId(100L)
                .build();
    }

    private User createCompletedOwner() {
        return User.builder()
                .id(OWNER_ID)
                .githubId(100L)
                .nickname("리로")
                .slug("jinriro")
                .profileImageUrl("https://example.com/profile.png")
                .build();
    }

    private User createInvitee() {
        return User.builder()
                .id(INVITEE_ID)
                .githubId(300L)
                .build();
    }

    private Blog createColog(User owner) {
        return Blog.builder()
                .id(COLOG_ID)
                .owner(owner)
                .name("리로그 팀")
                .slug("rilog-team")
                .blogType(BlogType.COLOG)
                .build();
    }

    private Blog createDetailedColog(User owner) {
        return Blog.builder()
                .id(COLOG_ID)
                .owner(owner)
                .name("리로그 팀")
                .slug("rilog-team")
                .introduction("함께 쓰는 기술 블로그")
                .logoUrl("https://example.com/logo.png")
                .coverImageUrl("https://example.com/cover.png")
                .serviceUrl("https://rilog.example.com")
                .githubUrl("https://github.com/rilog")
                .blogType(BlogType.COLOG)
                .build();
    }

    private BlogMember createMember(Blog colog, User user, BlogPermission permission) {
        return BlogMember.builder()
                .blog(colog)
                .user(user)
                .permission(permission)
                .status(BlogMemberStatus.ACTIVE)
                .joinedAt(LocalDateTime.ofInstant(NOW, ZoneOffset.UTC))
                .build();
    }

    private CologCreateCommand createCommand() {
        return new CologCreateCommand(
                "리로그 팀",
                "rilog-team",
                "함께 쓰는 기술 블로그",
                "https://example.com/logo.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog"
        );
    }
}
