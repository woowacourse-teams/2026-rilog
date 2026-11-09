package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.blog.service.dto.command.CologMemberInviteCommand;
import kr.rilog.domain.blog.service.dto.command.CologMemberUpdateCommand;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.*;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CologCommandServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long OWNER_ID = 1L;
    private static final Long COLOG_ID = 2L;
    private static final Long INVITEE_ID = 3L;
    private static final Long REQUESTER_MEMBER_ID = 4L;
    private static final Long TARGET_MEMBER_ID = 5L;
    private static final String COLOG_SLUG = "rilog_team";
    private static final Instant NOW = Instant.parse("2026-08-13T12:00:00Z");

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TagAssetsPublisher tagAssetsPublisher;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private CologCommandService cologCommandService;

    @BeforeEach
    void setUp() {
        cologCommandService = new CologCommandService(
                blogRepository,
                blogMemberRepository,
                postRepository,
                userRepository,
                tagAssetsPublisher,
                Clock.fixed(NOW, ZoneOffset.UTC),
                eventPublisher
        );
    }

    @Test
    @DisplayName("활성 Colog에 9개 가입한 사용자는 새 Colog를 만들 수 있다")
    void createAllowsCreationUntilOwnerReachesMaximumCologs() {
        // given
        User owner = createOwner();
        CologCreateCommand command = createCommand();
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));
        when(blogMemberRepository.countActiveCologsByUserId(OWNER_ID)).thenReturn(9L);
        when(blogRepository.existsBySlug(Slug.from(COLOG_SLUG))).thenReturn(false);
        when(blogRepository.existsByProfileName(command.name())).thenReturn(false);
        when(blogRepository.saveAndFlush(any(Blog.class))).thenAnswer(invocation -> {
            Blog colog = invocation.getArgument(0);
            return Blog.builder()
                    .id(COLOG_ID)
                    .owner(colog.getOwner())
                    .slug(Slug.from(colog.getSlug()))
                    .profile(colog.getProfile())
                    .blogType(colog.getBlogType())
                    .build();
        });

        // when
        CologCreateResult result = cologCommandService.create(OWNER_ID, command);

        // then
        assertThat(result).isEqualTo(new CologCreateResult(COLOG_ID, "리로그 팀", COLOG_SLUG));
        verify(blogRepository, times(1)).saveAndFlush(any(Blog.class));
    }

    @Test
    @DisplayName("활성 Colog에 10개 가입한 사용자는 새 Colog를 만들 수 없다")
    void createRejectsCreationWhenOwnerHasMaximumCologs() {
        // given
        CologCreateCommand command = createCommand();
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(createOwner()));
        when(blogMemberRepository.countActiveCologsByUserId(OWNER_ID)).thenReturn(10L);

        // when - then
        assertThatThrownBy(() -> cologCommandService.create(OWNER_ID, command))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(USER_COLOG_COUNT_EXCEEDED);
        verify(blogRepository, never()).saveAndFlush(any(Blog.class));
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("팀을 생성하면 프로필 이미지와 커버 이미지를 attach 요청한다.")
    void createAttachesTagAssets() {
        // given
        User owner = createOwner();
        CologCreateCommand command = createCommand();
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner));
        when(blogRepository.existsBySlug(Slug.from(COLOG_SLUG))).thenReturn(false);
        when(blogRepository.existsByProfileName(command.name())).thenReturn(false);
        when(blogRepository.saveAndFlush(any(Blog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        cologCommandService.create(OWNER_ID, command);

        // then
        verify(tagAssetsPublisher).attach(new TagAssets(Set.of(
                command.profileImageUrl(),
                command.coverImageUrl()
        )));
    }

    @Test
    @DisplayName("팀 slug가 이미 존재하면 팀 생성을 거부한다")
    void createRejectsDuplicateSlug() {
        // given
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(createOwner()));
        when(blogRepository.existsBySlug(Slug.from(COLOG_SLUG))).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> cologCommandService.create(OWNER_ID, createCommand()))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_SLUG_ALREADY_EXISTS);
        verify(blogRepository, never()).saveAndFlush(any(Blog.class));
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
        verify(tagAssetsPublisher, never()).attach(any());
    }

    @Test
    @DisplayName("팀 이름이 이미 존재하면 팀 생성을 거부한다")
    void createRejectsDuplicateProfileName() {
        // given
        CologCreateCommand command = createCommand();
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(createOwner()));
        when(blogRepository.existsBySlug(Slug.from(COLOG_SLUG))).thenReturn(false);
        when(blogRepository.existsByProfileName(command.name())).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> cologCommandService.create(OWNER_ID, command))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_PROFILE_NAME_ALREADY_EXISTS);
        verify(blogRepository, never()).saveAndFlush(any(Blog.class));
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("팀 생성자가 존재하지 않으면 팀 생성을 거부한다")
    void createRejectsMissingOwner() {
        // given
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> cologCommandService.create(OWNER_ID, createCommand()))
                .isInstanceOf(UserException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(USER_NOT_FOUND);
        verify(blogRepository, never()).saveAndFlush(any(Blog.class));
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("OWNER는 활성 멤버가 19명인 Colog에 새 MEMBER를 초대할 수 있다")
    void inviteMemberAllowsOwnerToInviteMember() {
        // given
        User invitee = createInvitee();
        Blog colog = createColog(createOwner());
        stubOwnerInvitation(colog, invitee);
        when(blogMemberRepository.countActiveMembersByBlogId(COLOG_ID)).thenReturn(19L);
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
        CologMemberInviteResult result = cologCommandService.inviteMember(
                OWNER_ID,
                COLOG_SLUG,
                new CologMemberInviteCommand(INVITEE_ID, "Backend")
        );

        // then
        assertThat(result).isEqualTo(new CologMemberInviteResult(10L, INVITEE_ID, BlogPermission.MEMBER, "Backend"));
        verify(blogMemberRepository, times(1)).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("활성 멤버가 20명인 Colog에는 새 멤버를 초대할 수 없다")
    void inviteMemberRejectsInviteWhenCologHasMaximumMembers() {
        // given
        stubOwnerInvitation(createColog(createOwner()), createInvitee());
        when(blogMemberRepository.countActiveMembersByBlogId(COLOG_ID)).thenReturn(20L);
        CologMemberInviteCommand command = new CologMemberInviteCommand(INVITEE_ID, "Backend");

        // when - then
        assertThatThrownBy(() -> cologCommandService.inviteMember(OWNER_ID, COLOG_SLUG, command))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COLOG_MEMBER_COUNT_EXCEEDED);
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("활성 Colog에 9개 가입한 사용자를 다른 Colog에 초대할 수 있다")
    void inviteMemberAllowsInviteUntilInviteeReachesMaximumCologs() {
        // given
        stubOwnerInvitation(createColog(createOwner()), createInvitee());
        when(blogMemberRepository.countActiveMembersByBlogId(COLOG_ID)).thenReturn(1L);
        when(blogMemberRepository.countActiveCologsByUserId(INVITEE_ID)).thenReturn(9L);
        when(blogMemberRepository.save(any(BlogMember.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CologMemberInviteCommand command = new CologMemberInviteCommand(INVITEE_ID, "Backend");

        // when
        CologMemberInviteResult result = cologCommandService.inviteMember(OWNER_ID, COLOG_SLUG, command);

        // then
        verify(blogMemberRepository).save(any(BlogMember.class));
        assertThat(result.userId()).isEqualTo(INVITEE_ID);
    }

    @Test
    @DisplayName("활성 Colog에 10개 가입한 사용자는 다른 Colog에 초대할 수 없다")
    void inviteMemberRejectsInviteWhenInviteeHasMaximumCologs() {
        // given
        stubOwnerInvitation(createColog(createOwner()), createInvitee());
        when(blogMemberRepository.countActiveMembersByBlogId(COLOG_ID)).thenReturn(1L);
        when(blogMemberRepository.countActiveCologsByUserId(INVITEE_ID)).thenReturn(10L);
        CologMemberInviteCommand command = new CologMemberInviteCommand(INVITEE_ID, "Backend");

        // when - then
        assertThatThrownBy(() -> cologCommandService.inviteMember(OWNER_ID, COLOG_SLUG, command))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(USER_COLOG_COUNT_EXCEEDED);
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("ADMIN 권한 팀 멤버는 사용자를 MEMBER 멤버로 초대할 수 있다")
    void inviteMemberAllowsAdminToInviteMember() {
        // given
        User admin = createOwner();
        User invitee = createInvitee();
        Blog colog = createColog(admin);
        BlogMember requesterMember = createMember(colog, admin, BlogPermission.ADMIN);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));
        when(userRepository.findById(INVITEE_ID)).thenReturn(Optional.of(invitee));
        when(blogMemberRepository.existsByBlogIdAndUserIdAndStatus(COLOG_ID, INVITEE_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(false);
        when(blogMemberRepository.save(any(BlogMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        cologCommandService.inviteMember(
                OWNER_ID,
                COLOG_SLUG,
                new CologMemberInviteCommand(INVITEE_ID, "Frontend")
        );

        // then
        ArgumentCaptor<BlogMember> memberCaptor = ArgumentCaptor.forClass(BlogMember.class);
        verify(blogMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getPermission()).isEqualTo(BlogPermission.MEMBER);
    }

    @Test
    @DisplayName("팀 멤버가 아닌 사용자는 사용자를 초대할 수 없다")
    void inviteMemberRejectsNonMemberRequester() {
        // given
        User requester = createOwner();
        Blog colog = createColog(requester);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> cologCommandService.inviteMember(
                OWNER_ID,
                COLOG_SLUG,
                new CologMemberInviteCommand(INVITEE_ID, "Frontend")
        ))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_MEMBER_DOESNT_NOT_BELONG);
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
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));
        when(userRepository.findById(INVITEE_ID)).thenReturn(Optional.of(invitee));
        when(blogMemberRepository.existsByBlogIdAndUserIdAndStatus(COLOG_ID, INVITEE_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(true);

        // when - then
        assertThatThrownBy(() -> cologCommandService.inviteMember(
                OWNER_ID,
                COLOG_SLUG,
                new CologMemberInviteCommand(INVITEE_ID, "Frontend")
        ))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_MEMBER_ALREADY_EXISTS);
        verify(blogMemberRepository, never()).save(any(BlogMember.class));
    }

    @Test
    @DisplayName("ACTIVE ADMIN 또는 MEMBER는 자신이 속한 팀에서 탈퇴할 수 있다")
    void leaveCologChangesRequesterMemberStatusToLeft() {
        // given
        User owner = createOwner();
        User requester = createInvitee();
        Blog colog = createColog(owner);
        BlogMember requesterMember = spy(createMember(REQUESTER_MEMBER_ID, colog, requester, BlogPermission.MEMBER));
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                INVITEE_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));

        // when
        cologCommandService.leaveColog(INVITEE_ID, COLOG_SLUG);

        // then
        assertThat(requesterMember.getStatus()).isEqualTo(BlogMemberStatus.LEFT);
        verify(requesterMember, times(1)).leaveBySelf();
    }

    @Test
    @DisplayName("OWNER는 자신이 속한 팀에서 바로 탈퇴할 수 없다")
    void leaveCologRejectsOwner() {
        // given
        User owner = createOwner();
        Blog colog = createColog(owner);
        BlogMember ownerMember = createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.OWNER);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(ownerMember));

        // when - then
        assertThatThrownBy(() -> cologCommandService.leaveColog(OWNER_ID, COLOG_SLUG))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COLOG_OWNER_LEAVE_FORBIDDEN);
        assertThat(ownerMember.getStatus()).isEqualTo(BlogMemberStatus.ACTIVE);
    }

    @Test
    @DisplayName("OWNER는 ADMIN을 팀에서 내보낼 수 있다")
    void removeMemberAllowsOwnerToRemoveAdmin() {
        // given
        User owner = createOwner();
        User targetUser = createInvitee();
        Blog colog = createColog(owner);
        BlogMember requesterMember = spy(createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.OWNER));
        BlogMember targetMember = createMember(TARGET_MEMBER_ID, colog, targetUser, BlogPermission.ADMIN);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        ))
                .thenReturn(Optional.of(requesterMember));
        when(blogMemberRepository.findByIdAndBlogIdAndStatusAndDeletedAtIsNull(
                TARGET_MEMBER_ID,
                COLOG_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(targetMember));

        // when
        cologCommandService.removeMember(OWNER_ID, COLOG_SLUG, TARGET_MEMBER_ID);

        // then
        assertThat(targetMember.getStatus()).isEqualTo(BlogMemberStatus.LEFT);
        verify(requesterMember, times(1)).remove(targetMember);
    }

    @Test
    @DisplayName("ADMIN은 MEMBER를 팀에서 내보낼 수 있다")
    void removeMemberAllowsAdminToRemoveMember() {
        // given
        User owner = createOwner();
        User targetUser = createInvitee();
        Blog colog = createColog(owner);
        BlogMember requesterMember = spy(createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.ADMIN));
        BlogMember targetMember = createMember(TARGET_MEMBER_ID, colog, targetUser, BlogPermission.MEMBER);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        ))
                .thenReturn(Optional.of(requesterMember));
        when(blogMemberRepository.findByIdAndBlogIdAndStatusAndDeletedAtIsNull(
                TARGET_MEMBER_ID,
                COLOG_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(targetMember));

        // when
        cologCommandService.removeMember(OWNER_ID, COLOG_SLUG, TARGET_MEMBER_ID);

        // then
        assertThat(targetMember.getStatus()).isEqualTo(BlogMemberStatus.LEFT);
        verify(requesterMember, times(1)).remove(targetMember);
    }

    @Test
    @DisplayName("ADMIN은 ADMIN을 팀에서 내보낼 수 없다")
    void removeMemberRejectsAdminRemovingAdmin() {
        // given
        User owner = createOwner();
        User targetUser = createInvitee();
        Blog colog = createColog(owner);
        BlogMember requesterMember = spy(createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.ADMIN));
        BlogMember targetMember = createMember(TARGET_MEMBER_ID, colog, targetUser, BlogPermission.ADMIN);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));
        when(blogMemberRepository.findByIdAndBlogIdAndStatusAndDeletedAtIsNull(
                TARGET_MEMBER_ID,
                COLOG_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(targetMember));

        // when - then
        assertThatThrownBy(() -> cologCommandService.removeMember(OWNER_ID, COLOG_SLUG, TARGET_MEMBER_ID))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COLOG_MEMBER_REMOVE_FORBIDDEN);
        assertThat(targetMember.getStatus()).isEqualTo(BlogMemberStatus.ACTIVE);
        verify(requesterMember, times(1)).remove(targetMember);
    }

    @Test
    @DisplayName("MEMBER는 다른 멤버를 팀에서 내보낼 수 없다")
    void removeMemberRejectsMemberRequester() {
        // given
        User owner = createOwner();
        User targetUser = createInvitee();
        Blog colog = createColog(owner);
        BlogMember requesterMember = spy(createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.MEMBER));
        BlogMember targetMember = createMember(TARGET_MEMBER_ID, colog, targetUser, BlogPermission.MEMBER);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));
        when(blogMemberRepository.findByIdAndBlogIdAndStatusAndDeletedAtIsNull(
                TARGET_MEMBER_ID,
                COLOG_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(targetMember));

        // when - then
        assertThatThrownBy(() -> cologCommandService.removeMember(OWNER_ID, COLOG_SLUG, TARGET_MEMBER_ID))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COLOG_MEMBER_REMOVE_FORBIDDEN);
        assertThat(targetMember.getStatus()).isEqualTo(BlogMemberStatus.ACTIVE);
        verify(requesterMember, times(1)).remove(targetMember);
    }

    @Test
    @DisplayName("자기 자신은 강제로 내보낼 수 없다")
    void removeMemberRejectsSelfRemove() {
        // given
        User owner = createOwner();
        Blog colog = createColog(owner);
        BlogMember requesterMember = spy(createMember(TARGET_MEMBER_ID, colog, owner, BlogPermission.OWNER));
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));
        when(blogMemberRepository.findByIdAndBlogIdAndStatusAndDeletedAtIsNull(
                TARGET_MEMBER_ID,
                COLOG_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));

        // when - then
        assertThatThrownBy(() -> cologCommandService.removeMember(OWNER_ID, COLOG_SLUG, TARGET_MEMBER_ID))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COLOG_SELF_REMOVE_FORBIDDEN);
        assertThat(requesterMember.getStatus()).isEqualTo(BlogMemberStatus.ACTIVE);
        verify(requesterMember, times(1)).remove(requesterMember);
    }

    @Test
    @DisplayName("대상 멤버가 팀에 속해있지 않으면 내보낼 수 없다")
    void removeMemberRejectsTargetMemberNotInColog() {
        // given
        User owner = createOwner();
        Blog colog = createColog(owner);
        BlogMember requesterMember = spy(createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.OWNER));
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));
        when(blogMemberRepository.findByIdAndBlogIdAndStatusAndDeletedAtIsNull(
                TARGET_MEMBER_ID,
                COLOG_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> cologCommandService.removeMember(OWNER_ID, COLOG_SLUG, TARGET_MEMBER_ID))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_MEMBER_DOESNT_NOT_BELONG);
        verify(requesterMember, never()).remove(any());
    }

    @Test
    @DisplayName("OWNER는 MEMBER를 ADMIN으로 변경할 수 있다")
    void updateMemberAllowsOwnerToPromoteMemberAuthorizationToAdmin() {
        // given
        User owner = createOwner();
        User targetUser = createInvitee();
        Blog colog = createColog(owner);
        BlogMember requesterMember = spy(createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.OWNER));
        BlogMember targetMember = createMember(TARGET_MEMBER_ID, colog, targetUser, BlogPermission.MEMBER);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));
        when(blogMemberRepository.findByIdAndBlogIdAndStatusAndDeletedAtIsNull(
                TARGET_MEMBER_ID,
                COLOG_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(targetMember));

        // when
        cologCommandService.updateMember(
                OWNER_ID,
                COLOG_SLUG,
                TARGET_MEMBER_ID,
                new CologMemberUpdateCommand(BlogPermission.ADMIN, null)
        );

        // then
        assertThat(targetMember.getPermission()).isEqualTo(BlogPermission.ADMIN);
        verify(requesterMember, times(1)).updateMemberInformation(targetMember, BlogPermission.ADMIN, null);
    }

    @Test
    @DisplayName("OWNER가 OWNER를 부여하면 기존 OWNER는 ADMIN이 되고 대상 멤버는 OWNER가 된다")
    void updateMemberTransfersOwnerPermission() {
        // given
        User owner = createOwner();
        User targetUser = createInvitee();
        Blog colog = spy(createColog(owner));
        BlogMember requesterMember = spy(createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.OWNER));
        BlogMember targetMember = spy(createMember(TARGET_MEMBER_ID, colog, targetUser, BlogPermission.MEMBER));
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));
        when(blogMemberRepository.findByIdAndBlogIdAndStatusAndDeletedAtIsNull(
                TARGET_MEMBER_ID,
                COLOG_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(targetMember));

        // when
        cologCommandService.updateMember(
                OWNER_ID,
                COLOG_SLUG,
                TARGET_MEMBER_ID,
                new CologMemberUpdateCommand(BlogPermission.OWNER, null)
        );

        // then
        assertThat(requesterMember.getPermission()).isEqualTo(BlogPermission.ADMIN);
        assertThat(targetMember.getPermission()).isEqualTo(BlogPermission.OWNER);
        assertThat(colog.getOwner()).isEqualTo(targetUser);
        verify(requesterMember, times(1)).updateMemberInformation(targetMember, BlogPermission.OWNER, null);
        verify(colog, times(1)).transferOwnerTo(targetUser);
    }

    @Test
    @DisplayName("ADMIN은 MEMBER의 팀 내 역할명을 수정할 수 있다")
    void updateMemberAllowsAdminToUpdateMemberBlogRole() {
        // given
        User owner = createOwner();
        User targetUser = createInvitee();
        Blog colog = spy(createColog(owner));
        BlogMember requesterMember = spy(createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.ADMIN));
        BlogMember targetMember = createMember(TARGET_MEMBER_ID, colog, targetUser, BlogPermission.MEMBER);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));
        when(blogMemberRepository.findByIdAndBlogIdAndStatusAndDeletedAtIsNull(
                TARGET_MEMBER_ID,
                COLOG_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(targetMember));

        // when
        cologCommandService.updateMember(
                OWNER_ID,
                COLOG_SLUG,
                TARGET_MEMBER_ID,
                new CologMemberUpdateCommand(null, "Frontend")
        );

        // then
        assertThat(targetMember.getBlogRole()).isEqualTo("Frontend");

        verify(requesterMember, times(1)).updateMemberInformation(targetMember, null, "Frontend");
        verify(colog, never()).transferOwnerTo(targetUser);
    }

    @Test
    @DisplayName("ACTIVE OWNER는 COLOG를 영구 삭제 처리할 수 있다")
    void deleteCologDeletesCologPostsAndLeavesMembers() {
        // given
        User owner = createOwner();
        Blog colog = spy(createColog(owner));
        BlogMember ownerMember = spy(createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.OWNER));
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(ownerMember));

        // when
        cologCommandService.deleteColog(OWNER_ID, COLOG_SLUG);

        // then
        assertThat(colog.getDeletedAt()).isNotNull();

        verify(blogMemberRepository).softDeleteAllByBlogId(COLOG_ID, LocalDateTime.ofInstant(NOW, ZoneOffset.UTC));
        verify(postRepository).softDeleteAllByCologId(COLOG_ID, LocalDateTime.ofInstant(NOW, ZoneOffset.UTC));
        verify(ownerMember, times(1)).validateCanDeleteColog();
        verify(colog, times(1)).delete();
    }

    @Test
    @DisplayName("ACTIVE 멤버여도 OWNER가 아니면 팀 블로그를 삭제할 수 없다")
    void deleteCologRejectsNonOwnerMember() {
        // given
        User owner = createOwner();
        Blog colog = spy(createColog(owner));
        BlogMember adminMember = spy(createMember(REQUESTER_MEMBER_ID, colog, owner, BlogPermission.ADMIN));
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                OWNER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(adminMember));

        // when - then
        assertThatThrownBy(() -> cologCommandService.deleteColog(OWNER_ID, COLOG_SLUG))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COLOG_DELETE_FORBIDDEN);
        assertThat(colog.getDeletedAt()).isNull();
        verify(blogMemberRepository, never()).softDeleteAllByBlogId(any(), any());
        verify(postRepository, never()).softDeleteAllByCologId(any(), any());
        verify(adminMember, times(1)).validateCanDeleteColog();
        verify(colog, never()).delete();
    }

    private void stubOwnerInvitation(Blog colog, User invitee) {
        BlogMember ownerMember = createMember(colog, colog.getOwner(), BlogPermission.OWNER);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID, OWNER_ID, BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(ownerMember));
        when(userRepository.findById(INVITEE_ID)).thenReturn(Optional.of(invitee));
    }

    private User createOwner() {
        return User.builder()
                .id(OWNER_ID)
                .githubId(100L)
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
                .slug(Slug.from(COLOG_SLUG))
                .profile(createCologProfile())
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

    private BlogMember createMember(Long id, Blog colog, User user, BlogPermission permission) {
        return BlogMember.builder()
                .id(id)
                .blog(colog)
                .user(user)
                .permission(permission)
                .status(BlogMemberStatus.ACTIVE)
                .joinedAt(LocalDateTime.ofInstant(NOW, ZoneOffset.UTC))
                .build();
    }

    private BlogMember createMember(
            Long id,
            Blog colog,
            User user,
            BlogPermission permission,
            String blogRole,
            LocalDateTime joinedAt
    ) {
        return BlogMember.builder()
                .id(id)
                .blog(colog)
                .user(user)
                .permission(permission)
                .blogRole(blogRole)
                .status(BlogMemberStatus.ACTIVE)
                .joinedAt(joinedAt)
                .build();
    }

    private CologCreateCommand createCommand() {
        return new CologCreateCommand(
                "리로그 팀",
                COLOG_SLUG,
                "세계 최고의 블로그 플랫폼 Rilog. 입니다.",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog",
                "test@test.com"
        );
    }

    private Profile createCologProfile() {
        return Profile.createColog(
                "리로그 팀",
                "세계 최고의 블로그 플랫폼 Rilog. 입니다.",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog",
                "test@test.com"
        );
    }
}
