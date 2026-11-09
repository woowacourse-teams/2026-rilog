package kr.rilog.domain.therilog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.therilog.entity.vo.TheRilogPublication;
import kr.rilog.domain.therilog.entity.vo.TheRilogPublicationArticle;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.UserFixture;
import kr.rilog.support.testdouble.MutableClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.heading;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class TheRilogPublicationIntegrationTest extends ServiceSupport {

    @Autowired
    private TheRilogCommandService theRilogCommandService;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private MutableClock clock;

    private Chapter enterprise;

    @BeforeEach
    void prepareOfficialBlog() {
        clock.fix(Instant.parse("2026-10-14T20:00:00Z"));
        var owner = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("공식 계정", "the_rilog"));
        var blog = blogRepository.saveAndFlush(Blog.createRilog(owner));
        chapterRepository.saveAndFlush(Chapter.create(blog, "news", 0));
        enterprise = chapterRepository.saveAndFlush(Chapter.create(blog, "enterprise", 1));
        chapterRepository.saveAndFlush(Chapter.create(blog, "personal", 2));
    }

    @Test
    @DisplayName("목요일 발행분은 여섯 게시글의 발행 시각과 각 초기 조회수를 함께 저장한다.")
    void commitsCompletePublication() {
        // given
        TheRilogPublication publication = thursdayPublication();

        // when
        var published = theRilogCommandService.publishPublication(publication);

        // then
        List<Post> saved = postRepository.findAll();
        var savedIds = saved.stream().map(Post::getId).toList();
        var initializedIds = jdbc.queryForList("select post_id from post_view_count where view_count = 0", Long.class);
        assertSoftly(softly -> {
            softly.assertThat(published.stream().map(article -> article.postId()).toList())
                    .containsExactlyInAnyOrderElementsOf(savedIds).hasSize(6);
            softly.assertThat(initializedIds).containsExactlyInAnyOrderElementsOf(savedIds);
            softly.assertThat(saved).extracting(post -> post.getPublishedAt().toLocalDate()).containsOnly(publication.date());
            softly.assertThat(saved).filteredOn(post -> post.getPostType() == PostType.DAILY_HEADLINES)
                    .singleElement().satisfies(news -> assertThat(news.getContent().getContent())
                            .isEqualTo(publication.articles().getFirst().detail().content()));
        });
    }

    @Test
    @DisplayName("뉴스 저장 뒤 스포트라이트 발행이 실패하면 해당 발행분의 게시글과 조회수도 롤백한다.")
    void rollsBackEarlierArticlesWhenLaterPublicationFails() {
        chapterRepository.delete(enterprise);
        TheRilogPublication publication = thursdayPublication();

        assertThatThrownBy(() -> theRilogCommandService.publishPublication(publication))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());

        assertThat(postRepository.count()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from post_view_count", Long.class)).isZero();
    }

    private TheRilogPublication thursdayPublication() {
        List<TheRilogPublicationArticle> articles = new ArrayList<>();
        String[] headings = IntStream.range(0, 8).mapToObj(index -> heading("news-" + index, 2, "기사 " + index))
                .toArray(String[]::new);
        articles.add(new TheRilogPublicationArticle("news", new PostDetail("오늘의 뉴스", content(headings).getContent(), TECH, PUBLIC, null),
                new TheRilogPostMetadata(PostType.DAILY_HEADLINES, null, null, null)));
        IntStream.range(0, 3).forEach(index -> articles.add(spotlight("enterprise-" + index, PostType.ENTERPRISE_SPOTLIGHT)));
        IntStream.range(0, 2).forEach(index -> articles.add(spotlight("personal-" + index, PostType.PERSONAL_SPOTLIGHT)));
        return TheRilogPublication.of(LocalDate.of(2026, 10, 15), articles);
    }

    private TheRilogPublicationArticle spotlight(String rowId, PostType type) {
        return new TheRilogPublicationArticle(rowId, new PostDetail("기술 요약", content(paragraph("본문")).getContent(), TECH, PUBLIC, null),
                new TheRilogPostMetadata(type, "핵심 요약", "출처", null));
    }
}
