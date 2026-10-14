package kr.rilog.domain.therilog.service;

import kr.rilog.domain.post.service.PostService;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.post.entity.Post.THE_RILOG_BLOG_SLUG;
import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostType.ENTERPRISE_SPOTLIGHT;
import static kr.rilog.domain.post.entity.enums.PostType.PERSONAL_SPOTLIGHT;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PRIVATE;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.heading;
import static kr.rilog.support.fixure.TheRilogPostFixture.publishedNews;
import static kr.rilog.support.fixure.TheRilogPostFixture.publishedSpotlight;
import static org.assertj.core.api.Assertions.assertThat;

class TheRilogServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime PUBLICATION_TIME = LocalDateTime.of(2026, 9, 30, 6, 0);

    @Autowired
    private TheRilogService theRilogService;

    @Autowired
    private PostService postService;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private ChapterRepository chapterRepository;


    private Blog theRilog;
    private Chapter news;
    private Chapter enterprise;
    private Chapter personal;

    @BeforeEach
    void setUpOfficialBlog() {
        var editor = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("편집자", THE_RILOG_BLOG_SLUG));
        theRilog = blogRepository.saveAndFlush(Blog.createRilog(editor));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(theRilog, editor));
        news = chapterRepository.saveAndFlush(Chapter.create(theRilog, "news", 0));
        enterprise = chapterRepository.saveAndFlush(Chapter.create(theRilog, "enterprise", 1));
        personal = chapterRepository.saveAndFlush(Chapter.create(theRilog, "personal", 2));
    }

    @Test
    @DisplayName("메인 뉴스는 발행일이 최신인 글을 선택하고 같은 발행일이면 나중에 저장한 글을 선택한다.")
    void selectsLatestNewsWithIdAsTieBreaker() {
        // given
        postRepository.saveAndFlush(publishedNews(news, PUBLICATION_TIME, newsContent("첫 뉴스")));
        Post latest = postRepository.saveAndFlush(publishedNews(news, PUBLICATION_TIME, newsContent("최신 뉴스")));
        postRepository.saveAndFlush(publishedNews(news, PUBLICATION_TIME.minusDays(1), newsContent("과거 뉴스")));

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.news().postId()).isEqualTo(latest.getId());
    }

    @Test
    @DisplayName("메인 뉴스는 더 최근에 발행된 비공개 글을 제외한다.")
    void excludesPrivateNews() {
        // given
        Post visible = postRepository.saveAndFlush(publishedNews(news, PUBLICATION_TIME, newsContent("공개 소식")));
        Post hidden = publishedNews(news, PUBLICATION_TIME.plusDays(1), newsContent("비공개 소식"));
        hidden.update(new PostDetail(hidden.getTitle(), hidden.getContent().getContent(), TECH, PRIVATE, null), theRilog, news);
        postRepository.saveAndFlush(hidden);

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.news().postId()).isEqualTo(visible.getId());
    }

    @Test
    @DisplayName("메인 뉴스는 더 최근에 발행된 삭제 글을 제외한다.")
    void excludesDeletedNews() {
        // given
        Post visible = postRepository.saveAndFlush(publishedNews(news, PUBLICATION_TIME, newsContent("공개 소식")));
        Post deleted = publishedNews(news, PUBLICATION_TIME.plusDays(1), newsContent("삭제 소식"));
        deleted.delete();
        postRepository.saveAndFlush(deleted);

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.news().postId()).isEqualTo(visible.getId());
    }

    @Test
    @DisplayName("메인 스포트라이트는 비공개 글을 제외한다.")
    void excludesPrivateSpotlights() {
        // given
        Post visible = postRepository.saveAndFlush(publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME));
        Post hidden = publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME.plusDays(1));
        hidden.update(new PostDetail(hidden.getTitle(), hidden.getContent().getContent(), TECH, PRIVATE, null), theRilog, enterprise);
        postRepository.saveAndFlush(hidden);

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.spotlights().stream().map(TheRilogResult.SpotlightResult::postId).toList())
                .containsExactly(visible.getId());
    }

    @Test
    @DisplayName("메인 스포트라이트는 삭제된 글을 제외한다.")
    void excludesDeletedSpotlights() {
        // given
        Post visible = postRepository.saveAndFlush(publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME));
        Post deleted = publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME.plusDays(1));
        deleted.delete();
        postRepository.saveAndFlush(deleted);

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.spotlights().stream().map(TheRilogResult.SpotlightResult::postId).toList())
                .containsExactly(visible.getId());
    }

    @Test
    @DisplayName("스포트라이트는 기업 3개와 개인 2개를 각각 최신순으로 선택하고 발행일 동률은 저장 순서로 정렬한다.")
    void selectsLatestSpotlightsWithinEachTypeLimit() {
        // given
        postRepository.saveAndFlush(publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME.minusDays(2)));
        Post enterprise1 = postRepository.saveAndFlush(publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME));
        Post enterprise2 = postRepository.saveAndFlush(publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME));
        Post enterprise3 = postRepository.saveAndFlush(publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME.minusDays(1)));
        postRepository.saveAndFlush(publishedSpotlight(personal, PERSONAL_SPOTLIGHT, PUBLICATION_TIME.minusDays(1)));
        Post personal1 = postRepository.saveAndFlush(publishedSpotlight(personal, PERSONAL_SPOTLIGHT, PUBLICATION_TIME.plusDays(1)));
        Post personal2 = postRepository.saveAndFlush(publishedSpotlight(personal, PERSONAL_SPOTLIGHT, PUBLICATION_TIME.plusDays(1)));

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.spotlights().stream().map(TheRilogResult.SpotlightResult::postId).toList())
                .containsExactly(enterprise2.getId(), enterprise1.getId(), enterprise3.getId(), personal2.getId(), personal1.getId());
    }

    @Test
    @DisplayName("Colog로 이동한 뉴스는 공식 더 리로그 메인에 노출되지 않는다.")
    void excludesNewsTransferredToColog() {
        // given
        Post newsPost = publishedNews(news, PUBLICATION_TIME, newsContent("이동한 소식"));
        Blog colog = blogRepository.saveAndFlush(BlogFixture.createPersistableColog(theRilog.getOwner(), "team"));
        newsPost.update(new PostDetail(newsPost.getTitle(), newsPost.getContent().getContent(), TECH, PUBLIC, null), colog);
        postRepository.saveAndFlush(newsPost);

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.news()).isNull();
    }

    @Test
    @DisplayName("Colog로 이동한 스포트라이트는 공식 더 리로그 메인에 노출되지 않는다.")
    void excludesSpotlightTransferredToColog() {
        // given
        Post spotlight = publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME);
        Blog colog = blogRepository.saveAndFlush(BlogFixture.createPersistableColog(theRilog.getOwner(), "team"));
        spotlight.update(new PostDetail(spotlight.getTitle(), spotlight.getContent().getContent(), TECH, PUBLIC, null), colog);
        postRepository.saveAndFlush(spotlight);

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.spotlights()).isEmpty();
    }

    @Test
    @DisplayName("공식 블로그가 삭제되면 메인에서 콘텐츠를 반환하지 않는다.")
    void hidesContentsOfDeletedOfficialBlog() {
        // given
        postRepository.saveAndFlush(publishedNews(news, PUBLICATION_TIME, newsContent("뉴스")));
        postRepository.saveAndFlush(publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME));
        theRilog.delete();
        blogRepository.saveAndFlush(theRilog);

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result).isEqualTo(new TheRilogResult(THE_RILOG_BLOG_SLUG, null, null, List.of()));
    }

    @Test
    @DisplayName("일반 게시글은 더 리로그 콘텐츠로 조회하지 않는다.")
    void excludesStandardPosts() {
        // given
        postRepository.saveAndFlush(PostFixture.publicPublishedRilogPostWithParagraph(theRilog, theRilog.getOwner(), "일반 글 본문"));

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result).isEqualTo(new TheRilogResult(THE_RILOG_BLOG_SLUG, null, null, List.of()));
    }

    @Test
    @DisplayName("메인 대표 날짜는 스포트라이트가 더 최근이어도 뉴스의 발행일을 사용한다.")
    void prefersNewsPublicationDate() {
        // given
        postRepository.saveAndFlush(publishedNews(news, PUBLICATION_TIME, newsContent("뉴스")));
        postRepository.saveAndFlush(publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME.plusDays(1)));

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.date()).isEqualTo(PUBLICATION_TIME.toLocalDate());
    }

    @Test
    @DisplayName("뉴스가 없으면 메인 대표 날짜는 최신 스포트라이트의 발행일을 사용한다.")
    void fallsBackToLatestSpotlightPublicationDate() {
        // given
        postRepository.saveAndFlush(publishedSpotlight(enterprise, ENTERPRISE_SPOTLIGHT, PUBLICATION_TIME));
        postRepository.saveAndFlush(publishedSpotlight(personal, PERSONAL_SPOTLIGHT, PUBLICATION_TIME.plusDays(1)));

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.date()).isEqualTo(PUBLICATION_TIME.plusDays(1).toLocalDate());
    }

    @Test
    @DisplayName("뉴스 헤드라인은 빈 제목을 제외하고 나머지 제목의 문서 순서를 유지한다.")
    void excludesBlankHeadlines() {
        // given
        postRepository.saveAndFlush(publishedNews(news, PUBLICATION_TIME, content(
                heading("first", 1, "첫 소식"), heading("blank", 2, "   "), heading("last", 3, "마지막 소식"))));

        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result.news().headlines()).isEqualTo(List.of(
                new TheRilogResult.HeadlineResult("첫 소식"), new TheRilogResult.HeadlineResult("마지막 소식")));
    }

    @Test
    @DisplayName("기존 게시글 수정 경로로 변경한 뉴스 제목은 메인 헤드라인에도 반영된다.")
    void reflectsHeadlinesEditedThroughPostService() {
        // given
        Post newsPost = postRepository.saveAndFlush(publishedNews(news, PUBLICATION_TIME, newsContent("수정 전")));
        var command = new PostUpdateCommand(THE_RILOG_BLOG_SLUG, newsPost.getTitle(), newsContent("수정 후").getContent(),
                TECH, PUBLIC, null, news.getId());

        // when
        postService.update(command, newsPost.getId(), theRilog.getOwner().getId());

        // then
        assertThat(theRilogService.readTheRilog().news().headlines())
                .isEqualTo(List.of(new TheRilogResult.HeadlineResult("수정 후")));
    }

    @Test
    @DisplayName("콘텐츠가 아직 없으면 더 리로그 메인은 빈 결과를 반환한다.")
    void returnsEmptyMainBeforeFirstPublication() {
        // when
        var result = theRilogService.readTheRilog();

        // then
        assertThat(result).isEqualTo(new TheRilogResult(THE_RILOG_BLOG_SLUG, null, null, List.of()));
    }

    private PostContent newsContent(String title) {
        return content(heading("headline", 2, title));
    }
}
