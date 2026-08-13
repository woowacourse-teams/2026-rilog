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
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
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

    private User createOwner() {
        return User.builder()
                .id(OWNER_ID)
                .githubId(100L)
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
