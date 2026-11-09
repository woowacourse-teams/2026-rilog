package kr.rilog.domain.chapter.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.entity.vo.ChapterName;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.chapter.service.dto.command.ChapterCreateCommand;
import kr.rilog.domain.chapter.service.dto.command.ChapterRenameCommand;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.ADMIN_PERMISSION_REQUIRED;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_DOESNT_NOT_BELONG;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_COUNT_EXCEEDED;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NAME_ALREADY_EXISTS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ChapterCommandServiceTest {

    private static final String BLOG_SLUG = "rilog_team";
    private static final Long REQUESTER_ID = 1L;
    private static final LocalDateTime JOINED_AT = LocalDateTime.of(2026, 8, 30, 12, 0);

    private final BlogMemberRepository blogMemberRepository = mock(BlogMemberRepository.class);
    private final ChapterRepository chapterRepository = mock(ChapterRepository.class);
    private final ChapterCommandService chapterCommandService = new ChapterCommandService(
            blogMemberRepository, chapterRepository, mock(PostRepository.class)
    );

    @Test
    @DisplayName("ADMIN이 요청한 챕터를 저장한다.")
    void createAllowsAdmin() {
        // given
        Blog blog = stubMembership(BlogType.COLOG, BlogPermission.ADMIN);
        when(chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(blog.getId()))
                .thenReturn(List.of(Chapter.create(blog, "기존 챕터", 0)));
        when(chapterRepository.save(any(Chapter.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        ChapterResult result = chapterCommandService.create(blog.getSlug(), REQUESTER_ID, new ChapterCreateCommand("개발"));

        // then
        assertThat(result.name()).isEqualTo("개발");
        assertThat(result.order()).isEqualTo(1);
        verify(chapterRepository).save(any(Chapter.class));
    }

    @ParameterizedTest
    @EnumSource(BlogType.class)
    @DisplayName("RILOG와 COLOG 모두 활성 챕터가 30개이면 추가 저장하지 않는다.")
    void createRejectsChapterWhenBlogHasMaximumChapters(BlogType type) {
        // given
        Blog blog = stubMembership(type, BlogPermission.OWNER);
        List<Chapter> chapters = IntStream.range(0, 30)
                .mapToObj(order -> Chapter.create(blog, "챕터 " + order, order))
                .toList();
        when(chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(blog.getId())).thenReturn(chapters);

        // when
        Throwable thrown = catchThrowable(() ->
                chapterCommandService.create(blog.getSlug(), REQUESTER_ID, new ChapterCreateCommand("초과 챕터")));

        // then
        assertThat(thrown).isInstanceOf(ChapterException.class).hasMessage(CHAPTER_COUNT_EXCEEDED.getMessage());
        verify(chapterRepository, never()).save(any(Chapter.class));
    }

    @Test
    @DisplayName("같은 이름의 챕터가 있으면 추가 저장하지 않는다.")
    void createRejectsDuplicateNameAndPreservesExistingChapter() {
        // given
        Blog blog = stubMembership(BlogType.COLOG, BlogPermission.OWNER);
        Chapter existing = Chapter.create(blog, "개발 이야기", 0);
        when(chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(blog.getId()))
                .thenReturn(List.of(existing));

        // when
        Throwable thrown = catchThrowable(() ->
                chapterCommandService.create(blog.getSlug(), REQUESTER_ID, new ChapterCreateCommand("  개발 이야기  ")));

        // then
        assertThat(thrown).isInstanceOf(ChapterException.class).hasMessage(CHAPTER_NAME_ALREADY_EXISTS.getMessage());
        assertThat(existing.getName()).isEqualTo("개발 이야기");
        verify(chapterRepository, never()).save(any(Chapter.class));
    }

    @Test
    @DisplayName("MEMBER는 챕터를 생성할 수 없다.")
    void createRejectsMemberPermission() {
        // given
        Blog blog = stubMembership(BlogType.COLOG, BlogPermission.MEMBER);

        // when
        Throwable thrown = catchThrowable(() ->
                chapterCommandService.create(blog.getSlug(), REQUESTER_ID, new ChapterCreateCommand("개발 이야기")));

        // then
        assertThat(thrown).isInstanceOf(BlogException.class).hasMessage(ADMIN_PERMISSION_REQUIRED.getMessage());
        verifyNoInteractions(chapterRepository);
    }

    @Test
    @DisplayName("블로그에 속하지 않은 사용자는 챕터를 생성할 수 없다.")
    void createRejectsNonMember() {
        // given
        when(blogMemberRepository.findWithBlogBySlugAndUserId(Slug.from(BLOG_SLUG), REQUESTER_ID))
                .thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() ->
                chapterCommandService.create(BLOG_SLUG, REQUESTER_ID, new ChapterCreateCommand("개발 이야기")));

        // then
        assertThat(thrown).isInstanceOf(BlogException.class).hasMessage(BLOG_MEMBER_DOESNT_NOT_BELONG.getMessage());
        verifyNoInteractions(chapterRepository);
    }

    @Test
    @DisplayName("ADMIN이 챕터 이름을 변경할 수 있다.")
    void renameAllowsAdmin() {
        // given
        Blog blog = stubMembership(BlogType.COLOG, BlogPermission.ADMIN);
        Chapter target = chapter(blog, 2L, "기존 이름", 0);
        when(chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(blog.getId())).thenReturn(List.of(target));

        // when
        ChapterResult result = chapterCommandService.rename(
                blog.getSlug(), target.getId(), REQUESTER_ID, new ChapterRenameCommand("새로운 이름")
        );

        // then
        assertThat(result.name()).isEqualTo("새로운 이름");
        assertThat(target.getName()).isEqualTo("새로운 이름");
    }

    @Test
    @DisplayName("중복 이름으로 변경하면 기존 챕터 이름을 유지한다.")
    void renameRejectsOtherChapterNameAndPreservesName() {
        // given
        Blog blog = stubMembership(BlogType.COLOG, BlogPermission.OWNER);
        Chapter target = chapter(blog, 2L, "기존 이름", 0);
        Chapter other = chapter(blog, 3L, "회고", 1);
        when(chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(blog.getId()))
                .thenReturn(List.of(target, other));

        // when
        Throwable thrown = catchThrowable(() -> chapterCommandService.rename(
                blog.getSlug(), target.getId(), REQUESTER_ID, new ChapterRenameCommand("  회고  ")
        ));

        // then
        assertThat(thrown).isInstanceOf(ChapterException.class).hasMessage(CHAPTER_NAME_ALREADY_EXISTS.getMessage());
        assertThat(target.getName()).isEqualTo("기존 이름");
        verify(chapterRepository, never()).save(any(Chapter.class));
    }

    @Test
    @DisplayName("MEMBER는 챕터 이름을 변경할 수 없고 기존 이름이 유지된다.")
    void renameRejectsMemberPermissionAndPreservesName() {
        // given
        Blog blog = stubMembership(BlogType.COLOG, BlogPermission.MEMBER);
        Chapter target = chapter(blog, 2L, "기존 이름", 0);

        // when
        Throwable thrown = catchThrowable(() -> chapterCommandService.rename(
                blog.getSlug(), target.getId(), REQUESTER_ID, new ChapterRenameCommand("새로운 이름")
        ));

        // then
        assertThat(thrown).isInstanceOf(BlogException.class).hasMessage(ADMIN_PERMISSION_REQUIRED.getMessage());
        assertThat(target.getName()).isEqualTo("기존 이름");
        verifyNoInteractions(chapterRepository);
    }

    private Blog stubMembership(BlogType type, BlogPermission permission) {
        User owner = UserFixture.completedWithNicknameAndSlug("러로", BLOG_SLUG);
        Blog blog = type == BlogType.COLOG
                ? Blog.createColog(owner, BLOG_SLUG, BlogFixture.cologProfile())
                : Blog.createRilog(owner);
        BlogMember membership = permission == BlogPermission.OWNER
                ? BlogMember.createOwner(blog, owner, JOINED_AT)
                : BlogMember.invite(blog, owner, "Backend", permission, JOINED_AT);
        when(blogMemberRepository.findWithBlogBySlugAndUserId(Slug.from(blog.getSlug()), REQUESTER_ID))
                .thenReturn(Optional.of(membership));
        return blog;
    }

    private Chapter chapter(Blog blog, Long id, String name, int order) {
        return Chapter.builder()
                .id(id)
                .blog(blog)
                .name(ChapterName.from(name))
                .order(order)
                .build();
    }
}
