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
import kr.rilog.domain.chapter.service.dto.command.ChapterRenameCommand;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;
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

import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.ADMIN_PERMISSION_INVALID;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_DOESNT_NOT_BELONG;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
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

    @Autowired
    private PostRepository postRepository;

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

    @Test
    @DisplayName("챕터 목록을 조회하면 활성 챕터를 순서대로 반환한다.")
    void readAllReturnsActiveChaptersInOrder() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        Chapter third = chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "세 번째", 2));
        Chapter first = chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "첫 번째", 0));
        Chapter second = chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "두 번째", 1));

        // when
        List<ChapterResult> result = chapterService.readAll(BLOG_SLUG);

        // then
        assertThat(result).containsExactly(
                ChapterResult.from(first),
                ChapterResult.from(second),
                ChapterResult.from(third)
        );
    }

    @Test
    @DisplayName("챕터 목록을 조회하면 대상 블로그의 챕터만 반환한다.")
    void readAllReturnsOnlyChaptersOfRequestedBlog() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        Chapter targetChapter = chapterRepository.saveAndFlush(
                Chapter.create(scenario.blog(), "대상 챕터", 0)
        );
        User otherOwner = saveUser(300L, "other-owner");
        Blog otherBlog = blogRepository.saveAndFlush(
                Blog.createColog(otherOwner, "other-team", BlogFixture.cologProfile())
        );
        chapterRepository.saveAndFlush(Chapter.create(otherBlog, "다른 블로그 챕터", 0));

        // when
        List<ChapterResult> result = chapterService.readAll(BLOG_SLUG);

        // then
        assertThat(result).containsExactly(ChapterResult.from(targetChapter));
    }

    @Test
    @DisplayName("챕터 목록을 조회하면 삭제된 챕터를 제외한다.")
    void readAllExcludesDeletedChapter() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        Chapter activeChapter = chapterRepository.saveAndFlush(
                Chapter.create(scenario.blog(), "활성 챕터", 0)
        );
        Chapter deletedChapter = chapterRepository.saveAndFlush(
                Chapter.create(scenario.blog(), "삭제된 챕터", 1)
        );
        deletedChapter.delete();
        chapterRepository.saveAndFlush(deletedChapter);

        // when
        List<ChapterResult> result = chapterService.readAll(BLOG_SLUG);

        // then
        assertThat(result).containsExactly(ChapterResult.from(activeChapter));
    }

    @Test
    @DisplayName("챕터가 없는 블로그의 목록을 조회하면 빈 목록을 반환한다.")
    void readAllReturnsEmptyListWhenBlogHasNoChapter() {
        // given
        createMemberScenario(BlogPermission.OWNER);

        // when
        List<ChapterResult> result = chapterService.readAll(BLOG_SLUG);

        // then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 블로그의 챕터 목록을 조회하면 예외가 발생한다.")
    void readAllRejectsMissingBlog() {
        // when & then
        assertThatThrownBy(() -> chapterService.readAll("missing-blog"))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("챕터 이름을 중복되지 않은 이름으로 변경하면 새 이름이 저장된다.")
    void renamePersistsUniqueName() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        Chapter target = chapterRepository.saveAndFlush(
                Chapter.create(scenario.blog(), "개발 이야기", 0)
        );
        ChapterRenameCommand command = new ChapterRenameCommand("새로운 이야기");

        // when
        ChapterResult result = chapterService.rename(
                BLOG_SLUG,
                target.getId(),
                scenario.requester().getId(),
                command
        );

        // then
        Chapter saved = chapterRepository.findById(target.getId()).orElseThrow();
        assertThat(result.name()).isEqualTo(command.name());
        assertThat(saved.getName()).isEqualTo(command.name());
    }

    @Test
    @DisplayName("챕터 이름을 자기 자신의 이름으로 변경하면 기존 이름을 유지한다.")
    void renameAllowsOwnName() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        Chapter target = chapterRepository.saveAndFlush(
                Chapter.create(scenario.blog(), "개발 이야기", 0)
        );
        ChapterRenameCommand command = new ChapterRenameCommand("개발 이야기");

        // when
        ChapterResult result = chapterService.rename(
                BLOG_SLUG,
                target.getId(),
                scenario.requester().getId(),
                command
        );

        // then
        Chapter saved = chapterRepository.findById(target.getId()).orElseThrow();
        assertThat(result.name()).isEqualTo("개발 이야기");
        assertThat(saved.getName()).isEqualTo("개발 이야기");
    }

    @Test
    @DisplayName("챕터 이름을 다른 챕터의 이름으로 변경하면 예외가 발생하고 기존 이름을 유지한다.")
    void renameRejectsOtherChapterNameAndPreservesName() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        Chapter target = chapterRepository.saveAndFlush(
                Chapter.create(scenario.blog(), "개발 이야기", 0)
        );
        chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "회고", 1));
        ChapterRenameCommand command = new ChapterRenameCommand("  회고  ");

        // when & then
        assertThatThrownBy(() -> chapterService.rename(
                BLOG_SLUG,
                target.getId(),
                scenario.requester().getId(),
                command
        ))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NAME_ALREADY_EXISTS.getMessage());
        Chapter saved = chapterRepository.findById(target.getId()).orElseThrow();
        assertThat(saved.getName()).isEqualTo("개발 이야기");
    }

    @Test
    @DisplayName("ADMIN이 챕터 이름을 변경하면 새 이름이 저장된다.")
    void renamePersistsNameByAdmin() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.ADMIN);
        Chapter target = chapterRepository.saveAndFlush(
                Chapter.create(scenario.blog(), "개발 이야기", 0)
        );
        ChapterRenameCommand command = new ChapterRenameCommand("새로운 이야기");

        // when
        ChapterResult result = chapterService.rename(
                BLOG_SLUG,
                target.getId(),
                scenario.requester().getId(),
                command
        );

        // then
        Chapter saved = chapterRepository.findById(target.getId()).orElseThrow();
        assertThat(result.name()).isEqualTo(command.name());
        assertThat(saved.getName()).isEqualTo(command.name());
    }

    @Test
    @DisplayName("MEMBER는 챕터 이름을 변경할 수 없고 기존 이름이 유지된다.")
    void renameRejectsMemberPermissionAndPreservesName() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.MEMBER);
        Chapter target = chapterRepository.saveAndFlush(
                Chapter.create(scenario.blog(), "개발 이야기", 0)
        );
        ChapterRenameCommand command = new ChapterRenameCommand("새로운 이야기");

        // when & then
        assertThatThrownBy(() -> chapterService.rename(
                BLOG_SLUG,
                target.getId(),
                scenario.requester().getId(),
                command
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(ADMIN_PERMISSION_INVALID.getMessage());
        Chapter saved = chapterRepository.findById(target.getId()).orElseThrow();
        assertThat(saved.getName()).isEqualTo("개발 이야기");
    }

    @Test
    @DisplayName("다른 블로그의 챕터 이름을 변경하면 예외가 발생한다.")
    void renameRejectsChapterOfOtherBlog() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        User otherOwner = saveUser(300L, "other-owner");
        Blog otherBlog = blogRepository.saveAndFlush(
                Blog.createColog(otherOwner, "other-team", BlogFixture.cologProfile())
        );
        Chapter otherChapter = chapterRepository.saveAndFlush(
                Chapter.create(otherBlog, "다른 블로그 챕터", 0)
        );
        ChapterRenameCommand command = new ChapterRenameCommand("새로운 이야기");

        // when & then
        assertThatThrownBy(() -> chapterService.rename(
                BLOG_SLUG,
                otherChapter.getId(),
                scenario.requester().getId(),
                command
        ))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("중간 챕터를 삭제하면 남은 챕터의 순서가 0부터 연속되게 저장된다.")
    void deletePersistsSequentialOrdersOfRemainingChapters() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "첫 번째", 0));
        chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "두 번째", 1));
        Chapter target = chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "세 번째", 2));
        chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "네 번째", 3));
        chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "다섯 번째", 4));
        chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "여섯 번째", 5));

        // when
        chapterService.delete(BLOG_SLUG, target.getId(), scenario.requester().getId());

        // then
        List<Chapter> remainingChapters = chapterRepository
                .findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(scenario.blog().getId());
        assertThat(remainingChapters.stream().map(Chapter::getOrder).toList())
                .containsExactly(0, 1, 2, 3, 4);
    }

    @Test
    @DisplayName("챕터를 삭제하면 연결된 게시글은 유지되고 챕터 연결만 해제된다.")
    void deleteClearsChapterFromAssociatedPost() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        Chapter target = chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "삭제 대상", 0));
        Post post = PostFixture.publicPublishedColog(
                scenario.blog(),
                scenario.blog(),
                scenario.requester()
        );
        post.update(PostFixture.updatedPostDetail(), scenario.blog(), target);
        postRepository.saveAndFlush(post);

        // when
        chapterService.delete(BLOG_SLUG, target.getId(), scenario.requester().getId());

        // then
        Post preservedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(preservedPost.getChapter()).isNull();
    }

    private ChapterCreationScenario createMemberScenario(BlogPermission permission) {
        User owner = saveUser(100L, "owner");
        Blog blog = blogRepository.saveAndFlush(Blog.createColog(owner, BLOG_SLUG, BlogFixture.cologProfile()));
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
        Blog blog = blogRepository.saveAndFlush(Blog.createColog(owner, BLOG_SLUG, BlogFixture.cologProfile()));
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
