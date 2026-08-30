package kr.rilog.domain.chapter.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.chapter.service.dto.command.ChapterCreateCommand;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.ADMIN_PERMISSION_INVALID;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_DOESNT_NOT_BELONG;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NAME_ALREADY_EXISTS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChapterServiceIntegrationTest extends ServiceSupport {

    private static final String BLOG_SLUG = "rilog-team";
    private static final LocalDateTime JOINED_AT = LocalDateTime.of(2026, 8, 30, 12, 0);

    @Autowired
    private ChapterService chapterService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Test
    @DisplayName("OWNER가 챕터를 생성하면 요청한 이름으로 저장된다.")
    void createPersistsRequestedNameByOwner() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        ChapterCreateCommand command = new ChapterCreateCommand("개발 이야기");

        // when
        ChapterResult result = chapterService.create(BLOG_SLUG, scenario.requester().getId(), command);

        // then
        Chapter saved = chapterRepository.findById(result.chapterId()).orElseThrow();
        assertThat(result.name()).isEqualTo(command.name());
        assertThat(saved.getName()).isEqualTo(command.name());
    }

    @Test
    @DisplayName("ADMIN이 챕터를 생성하면 새 챕터가 저장된다.")
    void createPersistsChapterByAdmin() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.ADMIN);
        ChapterCreateCommand command = new ChapterCreateCommand("개발 이야기");

        // when
        ChapterResult result = chapterService.create(BLOG_SLUG, scenario.requester().getId(), command);

        // then
        assertThat(chapterRepository.findById(result.chapterId())).isPresent();
    }

    @Test
    @DisplayName("기존 챕터가 있으면 새 챕터를 다음 순서로 저장한다.")
    void createPersistsChapterWithNextOrder() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "기존 챕터", 0));
        ChapterCreateCommand command = new ChapterCreateCommand("새 챕터");

        // when
        ChapterResult result = chapterService.create(BLOG_SLUG, scenario.requester().getId(), command);

        // then
        Chapter saved = chapterRepository.findById(result.chapterId()).orElseThrow();
        assertThat(result.order()).isEqualTo(1);
        assertThat(saved.getOrder()).isEqualTo(1);
    }

    @Test
    @DisplayName("같은 이름의 챕터가 있으면 생성을 거부하고 기존 챕터만 유지한다.")
    void createRejectsDuplicateNameAndPreservesExistingChapter() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "개발 이야기", 0));
        ChapterCreateCommand command = new ChapterCreateCommand("  개발 이야기  ");

        // when & then
        assertThatThrownBy(() -> chapterService.create(BLOG_SLUG, scenario.requester().getId(), command))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NAME_ALREADY_EXISTS.getMessage());
        assertThat(chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(scenario.blog().getId()))
                .hasSize(1);
    }

    @Test
    @DisplayName("MEMBER는 챕터를 생성할 수 없다.")
    void createRejectsMemberPermission() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.MEMBER);
        ChapterCreateCommand command = new ChapterCreateCommand("개발 이야기");

        // when & then
        assertThatThrownBy(() -> chapterService.create(BLOG_SLUG, scenario.requester().getId(), command))
                .isInstanceOf(BlogException.class)
                .hasMessage(ADMIN_PERMISSION_INVALID.getMessage());
        assertThat(chapterRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("블로그에 속하지 않은 사용자는 챕터를 생성할 수 없다.")
    void createRejectsNonMember() {
        // given
        ChapterCreationScenario scenario = createCologWithoutRequesterMembership();
        ChapterCreateCommand command = new ChapterCreateCommand("개발 이야기");

        // when & then
        assertThatThrownBy(() -> chapterService.create(BLOG_SLUG, scenario.requester().getId(), command))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_MEMBER_DOESNT_NOT_BELONG.getMessage());
        assertThat(chapterRepository.findAll()).isEmpty();
    }

    private ChapterCreationScenario createMemberScenario(BlogPermission permission) {
        User owner = saveUser(100L, "owner");
        Blog blog = blogRepository.saveAndFlush(
                Blog.createColog(owner, BLOG_SLUG, BlogFixture.cologProfile())
        );
        blogMemberRepository.saveAndFlush(BlogMember.createOwner(blog, owner, JOINED_AT));

        if (permission == BlogPermission.OWNER) {
            return new ChapterCreationScenario(blog, owner);
        }

        User requester = saveUser(200L, "requester");
        blogMemberRepository.saveAndFlush(
                BlogMember.invite(blog, requester, "Backend", permission, JOINED_AT)
        );
        return new ChapterCreationScenario(blog, requester);
    }

    private ChapterCreationScenario createCologWithoutRequesterMembership() {
        User owner = saveUser(100L, "owner");
        User requester = saveUser(200L, "requester");
        Blog blog = blogRepository.saveAndFlush(
                Blog.createColog(owner, BLOG_SLUG, BlogFixture.cologProfile())
        );
        blogMemberRepository.saveAndFlush(BlogMember.createOwner(blog, owner, JOINED_AT));
        return new ChapterCreationScenario(blog, requester);
    }

    private User saveUser(Long githubId, String githubLogin) {
        return userRepository.saveAndFlush(User.createPendingGithubUser(
                githubId,
                githubLogin,
                "https://example.com/%s.png".formatted(githubLogin)
        ));
    }

    private record ChapterCreationScenario(
            Blog blog,
            User requester
    ) {
    }

}
