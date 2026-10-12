package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.result.TheRilogResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.PostContentFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.post.entity.Post.THE_RILOG_BLOG_SLUG;
import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostType.DAILY_HEADLINES;
import static kr.rilog.domain.post.entity.enums.PostType.ENTERPRISE_SPOTLIGHT;
import static kr.rilog.domain.post.entity.enums.PostType.PERSONAL_SPOTLIGHT;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.support.fixure.TheRilogPostFixture.draftNews;
import static kr.rilog.support.fixure.TheRilogPostFixture.draftSpotlight;
import static kr.rilog.support.fixure.TheRilogPostFixture.privateNews;
import static kr.rilog.support.fixure.TheRilogPostFixture.privateSpotlight;
import static kr.rilog.support.fixure.TheRilogPostFixture.publishedNews;
import static kr.rilog.support.fixure.TheRilogPostFixture.publishedSpotlight;
import static org.assertj.core.api.Assertions.assertThat;

class TheRilogServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime SEPTEMBER_30 = LocalDateTime.of(2026, 9, 30, 6, 0);

    @Autowired
    private TheRilogService theRilogService;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    private User editor;
    private Blog theRilog;
    private Chapter headlinesChapter;
    private Chapter spotlightsChapter;

    @BeforeEach
    void setUpTheRilogBlog() {
        editor = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("더 리로그", THE_RILOG_BLOG_SLUG));
        theRilog = blogRepository.saveAndFlush(Blog.createRilog(editor));
        headlinesChapter = chapterRepository.saveAndFlush(Chapter.create(theRilog, "headlines", 0));
        spotlightsChapter = chapterRepository.saveAndFlush(Chapter.create(theRilog, "spotlights", 1));
    }

    @Test
    @DisplayName("더 리로그 메인 조회는 최신 공개 뉴스 게시글을 반환한다.")
    void readTheRilogReturnsLatestPublicNews() {
        // given
        save(publishedNews(theRilog, editor, headlinesChapter, "이전 뉴스", SEPTEMBER_30.minusDays(1), heading("이전 헤드라인")));
        Post latestNews = save(publishedNews(theRilog, editor, headlinesChapter, "오늘의 뉴스", SEPTEMBER_30, heading("오늘의 헤드라인")));
        save(privateNews(theRilog, editor, headlinesChapter, "비공개 뉴스", SEPTEMBER_30.plusDays(1), heading("비공개 헤드라인")));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.news()).isEqualTo(new TheRilogResult.NewsResult(
                latestNews.getId(),
                "오늘의 뉴스",
                SEPTEMBER_30,
                List.of(new TheRilogResult.HeadlineResult("오늘의 헤드라인"))
        ));
    }

    @Test
    @DisplayName("같은 시간에 발행된 뉴스가 여러 개면 더 나중에 저장된 뉴스를 반환한다.")
    void readTheRilogReturnsLastSavedNewsWhenPublishedAtTies() {
        // given
        save(publishedNews(theRilog, editor, headlinesChapter, "먼저 저장된 뉴스", SEPTEMBER_30, heading("먼저 저장된 헤드라인")));
        Post lastSavedNews = save(publishedNews(theRilog, editor, headlinesChapter, "나중에 저장된 뉴스", SEPTEMBER_30, heading("나중에 저장된 헤드라인")));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.news()).isEqualTo(new TheRilogResult.NewsResult(
                lastSavedNews.getId(),
                "나중에 저장된 뉴스",
                SEPTEMBER_30,
                List.of(new TheRilogResult.HeadlineResult("나중에 저장된 헤드라인"))
        ));
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"DAILY_HEADLINES", "ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("더 리로그 메인 조회는 비공개 편집 게시글을 제외한다.")
    void readTheRilogExcludesPrivatePosts(PostType postType) {
        // given
        Post publicPost = save(officialPost(postType, "공개 글", SEPTEMBER_30));
        save(privatePost(postType, "비공개 글", SEPTEMBER_30.plusMinutes(1)));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(resultByType(result, postType)).isEqualTo(List.of(expectedResult(publicPost)));
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"DAILY_HEADLINES", "ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("더 리로그 메인 조회는 임시 저장 편집 게시글을 제외한다.")
    void readTheRilogExcludesDraftPosts(PostType postType) {
        // given
        Post publicPost = save(officialPost(postType, "공개 글", SEPTEMBER_30));
        save(draftPost(postType, "임시 글", SEPTEMBER_30.plusMinutes(2)));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(resultByType(result, postType)).isEqualTo(List.of(expectedResult(publicPost)));
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"DAILY_HEADLINES", "ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("더 리로그 메인 조회는 삭제된 편집 게시글을 제외한다.")
    void readTheRilogExcludesDeletedPosts(PostType postType) {
        // given
        Post visiblePost = save(officialPost(postType, "공개 글", SEPTEMBER_30));
        Post deletedPost = save(officialPost(postType, "삭제 글", SEPTEMBER_30.plusMinutes(1)));
        deletedPost.delete();
        postRepository.saveAndFlush(deletedPost);

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(resultByType(result, postType)).isEqualTo(List.of(expectedResult(visiblePost)));
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"DAILY_HEADLINES", "ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("더 리로그 메인 조회는 공식 블로그가 삭제되면 편집 게시글을 반환하지 않는다.")
    void readTheRilogExcludesPostsFromDeletedOfficialBlog(PostType postType) {
        // given
        save(officialPost(postType, "공개 글", SEPTEMBER_30));
        theRilog.delete();
        blogRepository.saveAndFlush(theRilog);

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(resultByType(result, postType)).isEmpty();
    }

    @Test
    @DisplayName("더 리로그 메인 조회는 Colog에 속한 스포트라이트를 제외한다.")
    void readTheRilogExcludesSpotlightTransferredToColog() {
        // given
        Post officialSpotlight = save(publishedSpotlight(theRilog, editor, spotlightsChapter, ENTERPRISE_SPOTLIGHT, "공식 글", "공식 출처", SEPTEMBER_30));
        Blog colog = blogRepository.saveAndFlush(Blog.createColog(editor, "team_rilog", BlogFixture.cologProfile()));
        Post cologSpotlight = save(publishedSpotlight(theRilog, editor, spotlightsChapter, ENTERPRISE_SPOTLIGHT, "팀 글", "팀 출처", SEPTEMBER_30.plusMinutes(1)));
        cologSpotlight.update(
                new PostDetail("팀 글", PostContentFixture.content(PostContentFixture.paragraph("본문")).getContent(), TECH, PUBLIC, "https://example.com/team.png"),
                colog,
                null
        );
        postRepository.saveAndFlush(cologSpotlight);

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.spotlights()).containsExactly(expectedSpotlightResult(officialSpotlight));
    }

    @Test
    @DisplayName("더 리로그 메인 조회는 일반 게시글을 제외한다.")
    void readTheRilogExcludesStandardPosts() {
        // given
        Post spotlight = save(publishedSpotlight(theRilog, editor, spotlightsChapter, PERSONAL_SPOTLIGHT, "개인 글", "개발자", SEPTEMBER_30));
        save(Post.create(
                theRilog,
                editor,
                new PostDetail("일반 글", PostContentFixture.content(PostContentFixture.paragraph("본문")).getContent(), TECH, PUBLIC, null),
                spotlightsChapter
        ));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.spotlights()).containsExactly(expectedSpotlightResult(spotlight));
    }

    @Test
    @DisplayName("더 리로그 메인 조회는 뉴스가 있으면 뉴스 발행일을 대표 날짜로 반환한다.")
    void readTheRilogReturnsNewsDateWhenNewsExists() {
        // given
        save(publishedNews(theRilog, editor, headlinesChapter, "오늘의 뉴스", SEPTEMBER_30, heading("오늘의 헤드라인")));
        save(publishedSpotlight(theRilog, editor, spotlightsChapter, ENTERPRISE_SPOTLIGHT, "기업 글", "기업", SEPTEMBER_30.plusDays(1)));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.date()).isEqualTo(LocalDate.of(2026, 9, 30));
    }

    @Test
    @DisplayName("더 리로그 메인 조회는 뉴스가 없으면 최신 공개 스포트라이트 발행일을 대표 날짜로 반환한다.")
    void readTheRilogReturnsLatestSpotlightDateWithoutNews() {
        // given
        save(publishedSpotlight(theRilog, editor, spotlightsChapter, ENTERPRISE_SPOTLIGHT, "기업 글", "기업", SEPTEMBER_30.minusDays(1)));
        save(publishedSpotlight(theRilog, editor, spotlightsChapter, PERSONAL_SPOTLIGHT, "개인 글", "개발자", SEPTEMBER_30));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.date()).isEqualTo(LocalDate.of(2026, 9, 30));
    }

    @Test
    @DisplayName("더 리로그 메인 조회는 기업 스포트라이트 3개와 개인 스포트라이트 2개를 최신순으로 반환한다.")
    void readTheRilogReturnsSpotlightLimitAndOrder() {
        // given
        save(publishedSpotlight(theRilog, editor, spotlightsChapter, ENTERPRISE_SPOTLIGHT, "기업 0", "기업0", SEPTEMBER_30.minusMinutes(4)));
        Post enterprise1 = save(publishedSpotlight(theRilog, editor, spotlightsChapter, ENTERPRISE_SPOTLIGHT, "기업 1", "기업1", SEPTEMBER_30.minusMinutes(1)));
        Post enterprise2 = save(publishedSpotlight(theRilog, editor, spotlightsChapter, ENTERPRISE_SPOTLIGHT, "기업 2", "기업2", SEPTEMBER_30.minusMinutes(2)));
        Post enterprise3 = save(publishedSpotlight(theRilog, editor, spotlightsChapter, ENTERPRISE_SPOTLIGHT, "기업 3", "기업3", SEPTEMBER_30.minusMinutes(3)));
        Post personal1 = save(publishedSpotlight(theRilog, editor, spotlightsChapter, PERSONAL_SPOTLIGHT, "개인 1", "개인1", SEPTEMBER_30.minusMinutes(1)));
        Post personal2 = save(publishedSpotlight(theRilog, editor, spotlightsChapter, PERSONAL_SPOTLIGHT, "개인 2", "개인2", SEPTEMBER_30.minusMinutes(2)));
        save(publishedSpotlight(theRilog, editor, spotlightsChapter, PERSONAL_SPOTLIGHT, "개인 0", "개인0", SEPTEMBER_30.minusMinutes(3)));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.spotlights()).containsExactly(
                expectedSpotlightResult(enterprise1),
                expectedSpotlightResult(enterprise2),
                expectedSpotlightResult(enterprise3),
                expectedSpotlightResult(personal1),
                expectedSpotlightResult(personal2)
        );
    }

    @Test
    @DisplayName("같은 시간에 발행된 스포트라이트가 여러 개면 더 나중에 저장된 스포트라이트를 반환한다.")
    void readTheRilogReturnsLastSavedSpotlightWhenPublishedAtTies() {
        // given
        save(publishedSpotlight(theRilog, editor, spotlightsChapter, ENTERPRISE_SPOTLIGHT, "먼저 저장된 글", "먼저", SEPTEMBER_30));
        Post lastSavedSpotlight = save(publishedSpotlight(theRilog, editor, spotlightsChapter, ENTERPRISE_SPOTLIGHT, "나중에 저장된 글", "나중", SEPTEMBER_30));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.spotlights()).startsWith(expectedSpotlightResult(lastSavedSpotlight));
    }

    @Test
    @DisplayName("더 리로그 메인 조회는 스포트라이트 출처 이미지가 없으면 null로 반환한다.")
    void readTheRilogReturnsNullSourceImageWhenSpotlightHasNoSourceImage() {
        // given
        Post spotlight = save(publishedSpotlight(
                theRilog,
                editor,
                spotlightsChapter,
                ENTERPRISE_SPOTLIGHT,
                "기업 글",
                "요약",
                "기업 출처",
                null,
                SEPTEMBER_30
        ));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.spotlights()).containsExactly(expectedSpotlightResult(spotlight));
    }

    @Test
    @DisplayName("더 리로그 메인 조회는 뉴스 제목을 본문 헤딩에서 읽고 빈 헤딩은 제외한다.")
    void readTheRilogExtractsHeadlineTitlesFromNewsContent() {
        // given
        Post news = save(publishedNews(
                theRilog,
                editor,
                headlinesChapter,
                "오늘의 뉴스",
                SEPTEMBER_30,
                heading("첫 번째 소식"),
                heading("   "),
                PostContentFixture.paragraph("설명입니다."),
                heading("두 번째 소식")
        ));

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.news()).isEqualTo(new TheRilogResult.NewsResult(
                news.getId(),
                "오늘의 뉴스",
                SEPTEMBER_30,
                List.of(
                        new TheRilogResult.HeadlineResult("첫 번째 소식"),
                        new TheRilogResult.HeadlineResult("두 번째 소식")
                )
        ));
    }

    @Test
    @DisplayName("더 리로그 메인 조회는 게시글 수정 후 바뀐 뉴스 제목을 반환한다.")
    void readTheRilogReturnsUpdatedHeadlineTitle() {
        // given
        Post news = save(publishedNews(theRilog, editor, headlinesChapter, "오늘의 뉴스", SEPTEMBER_30, heading("수정 전 소식")));
        news.update(new PostDetail("오늘의 뉴스", PostContentFixture.content(heading("수정 후 소식")).getContent(), TECH, PUBLIC, null), theRilog, headlinesChapter);
        postRepository.saveAndFlush(news);

        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result.news()).isEqualTo(new TheRilogResult.NewsResult(
                news.getId(),
                "오늘의 뉴스",
                SEPTEMBER_30,
                List.of(new TheRilogResult.HeadlineResult("수정 후 소식"))
        ));
    }

    @Test
    @DisplayName("더 리로그 메인 조회는 공개된 공식 콘텐츠가 없으면 빈 응답을 반환한다.")
    void readTheRilogReturnsEmptyResponseWithoutOfficialPosts() {
        // when
        TheRilogResult result = theRilogService.readTheRilog();

        // then
        assertThat(result).isEqualTo(new TheRilogResult(THE_RILOG_BLOG_SLUG, null, null, List.of()));
    }

    private Post officialPost(PostType postType, String title, LocalDateTime publishedAt) {
        if (postType == DAILY_HEADLINES) {
            return publishedNews(theRilog, editor, headlinesChapter, title, publishedAt, heading(title + " 헤드라인"));
        }
        return publishedSpotlight(theRilog, editor, spotlightsChapter, postType, title, title + " 출처", publishedAt);
    }

    private Post privatePost(PostType postType, String title, LocalDateTime publishedAt) {
        if (postType == DAILY_HEADLINES) {
            return privateNews(theRilog, editor, headlinesChapter, title, publishedAt, heading(title + " 헤드라인"));
        }
        return privateSpotlight(theRilog, editor, spotlightsChapter, postType, title, publishedAt);
    }

    private Post draftPost(PostType postType, String title, LocalDateTime publishedAt) {
        if (postType == DAILY_HEADLINES) {
            return draftNews(theRilog, editor, headlinesChapter, title, publishedAt, heading(title + " 헤드라인"));
        }
        return draftSpotlight(theRilog, editor, spotlightsChapter, postType, title, publishedAt);
    }

    private List<Object> resultByType(TheRilogResult result, PostType postType) {
        if (postType == DAILY_HEADLINES) {
            return result.news() == null ? List.of() : List.of(result.news());
        }
        return result.spotlights().stream()
                .map(Object.class::cast)
                .toList();
    }

    private Object expectedResult(Post post) {
        if (post.getPostType() == DAILY_HEADLINES) {
            return expectedNewsResult(post);
        }
        return expectedSpotlightResult(post);
    }

    private TheRilogResult.NewsResult expectedNewsResult(Post post) {
        return new TheRilogResult.NewsResult(
                post.getId(),
                post.getTitle(),
                post.getPublishedAt(),
                List.of(new TheRilogResult.HeadlineResult(post.getTitle() + " 헤드라인"))
        );
    }

    private TheRilogResult.SpotlightResult expectedSpotlightResult(Post post) {
        return new TheRilogResult.SpotlightResult(
                post.getId(),
                post.getPostType(),
                post.getTitle(),
                post.getDescription(),
                post.getThumbnailImageUrl(),
                post.getPublishedAt(),
                new TheRilogResult.SourceResult(
                        post.getSource().getSourceProfileName(),
                        post.getSource().getSourceProfileImage()
                )
        );
    }

    private Post save(Post post) {
        return postRepository.saveAndFlush(post);
    }

    private String heading(String title) {
        return """
                {
                  "id": "heading-%s",
                  "type": "heading",
                  "props": { "level": 1 },
                  "content": [ { "type": "text", "text": "%s", "styles": {} } ],
                  "children": []
                }
                """.formatted(Math.abs(title.hashCode()), title);
    }
}
