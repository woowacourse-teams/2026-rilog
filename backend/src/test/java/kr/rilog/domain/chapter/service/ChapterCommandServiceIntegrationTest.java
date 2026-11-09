package kr.rilog.domain.chapter.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
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
import java.util.stream.IntStream;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

class ChapterCommandServiceIntegrationTest extends ServiceSupport {

    private static final int MAX_CHAPTER_COUNT = 30;
    private static final String BLOG_SLUG = "rilog_team";
    private static final LocalDateTime JOINED_AT = LocalDateTime.of(2026, 8, 30, 12, 0);

    @Autowired
    private ChapterCommandService chapterCommandService;

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
    @DisplayName("OWNER가 챕터를 생성하면 요청한 이름과 다음 순서로 저장한다.")
    void createPersistsRequestedNameAndNextOrderByOwner() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "기존 챕터", 0));
        ChapterCreateCommand command = new ChapterCreateCommand("새 챕터");

        // when
        ChapterResult result = chapterCommandService.create(BLOG_SLUG, scenario.requester().getId(), command);

        // then
        Chapter saved = chapterRepository.findById(result.chapterId()).orElseThrow();
        assertThat(saved.getName()).isEqualTo(command.name());
        assertThat(saved.getOrder()).isEqualTo(1);
    }

    @Test
    @DisplayName("생성 한도는 대상 블로그의 활성 챕터만 센다.")
    void createCountsOnlyActiveChaptersOfTargetBlog() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        List<Chapter> chapters = createChapters(scenario.blog(), MAX_CHAPTER_COUNT);
        chapters.getLast().delete();
        chapterRepository.saveAllAndFlush(chapters);
        User otherOwner = saveUser(300L, "other_owner");
        Blog otherBlog = blogRepository.saveAndFlush(
                Blog.createColog(otherOwner, "other_team", BlogFixture.cologProfile())
        );
        saveChapters(otherBlog, MAX_CHAPTER_COUNT);
        ChapterCreateCommand command = new ChapterCreateCommand("새 챕터");

        // when
        chapterCommandService.create(BLOG_SLUG, scenario.requester().getId(), command);

        // then
        assertThat(chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(scenario.blog().getId()))
                .hasSize(MAX_CHAPTER_COUNT);
    }

    @Test
    @DisplayName("챕터 이름을 중복되지 않은 이름으로 변경하면 새 이름이 저장된다.")
    void renamePersistsUniqueName() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        Chapter target = chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "개발 이야기", 0));
        ChapterRenameCommand command = new ChapterRenameCommand("새로운 이야기");

        // when
        chapterCommandService.rename(BLOG_SLUG, target.getId(), scenario.requester().getId(), command);

        // then
        Chapter saved = chapterRepository.findById(target.getId()).orElseThrow();
        assertThat(saved.getName()).isEqualTo(command.name());
    }

    @Test
    @DisplayName("다른 블로그의 챕터 이름을 변경하면 예외가 발생한다.")
    void renameRejectsChapterOfOtherBlog() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        User otherOwner = saveUser(300L, "other_owner");
        Blog otherBlog = blogRepository.saveAndFlush(Blog.createColog(otherOwner, "other_team", BlogFixture.cologProfile()));
        Chapter otherChapter = chapterRepository.saveAndFlush(Chapter.create(otherBlog, "다른 블로그 챕터", 0));
        ChapterRenameCommand command = new ChapterRenameCommand("새로운 이야기");

        // when & then
        assertThatThrownBy(() -> chapterCommandService.rename(BLOG_SLUG, otherChapter.getId(), scenario.requester().getId(), command))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("중간 챕터를 삭제하면 남은 챕터의 순서가 0부터 연속되게 저장된다.")
    void deletePersistsSequentialOrdersOfRemainingChapters() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        Chapter first = chapterRepository.save(Chapter.create(scenario.blog(), "첫 번째", 0));
        Chapter target = chapterRepository.save(Chapter.create(scenario.blog(), "두 번째", 1));
        Chapter third = chapterRepository.save(Chapter.create(scenario.blog(), "세 번째", 2));
        Chapter fourth = chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "네 번째", 3));

        // when
        chapterCommandService.delete(BLOG_SLUG, target.getId(), scenario.requester().getId());

        // then
        List<Chapter> remainingChapters = chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(scenario.blog().getId());
        assertThat(remainingChapters)
                .extracting(Chapter::getId, Chapter::getOrder)
                .containsExactly(tuple(first.getId(), 0), tuple(third.getId(), 1), tuple(fourth.getId(), 2));
    }

    @Test
    @DisplayName("챕터를 삭제하면 연결된 게시글은 유지되고 챕터 연결만 해제된다.")
    void deleteClearsChapterFromAssociatedPost() {
        // given
        ChapterCreationScenario scenario = createMemberScenario(BlogPermission.OWNER);
        Chapter target = chapterRepository.saveAndFlush(Chapter.create(scenario.blog(), "삭제 대상", 0));
        Post post = postRepository.saveAndFlush(
                PostFixture.publicPublishedColog(scenario.blog(), scenario.blog(), scenario.requester(), target)
        );

        // when
        chapterCommandService.delete(BLOG_SLUG, target.getId(), scenario.requester().getId());

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
        blogMemberRepository.saveAndFlush(BlogMember.invite(blog, requester, "Backend", permission, JOINED_AT));
        return new ChapterCreationScenario(blog, requester);
    }

    private void saveChapters(Blog blog, int count) {
        chapterRepository.saveAllAndFlush(createChapters(blog, count));
    }

    private List<Chapter> createChapters(Blog blog, int count) {
        return IntStream.range(0, count)
                .mapToObj(order -> Chapter.create(blog, "챕터 " + order, order))
                .toList();
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
