package kr.rilog.domain.therilog.service;

import kr.rilog.domain.post.service.PostCommandService;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogMemberFixture;
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
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.heading;
import static kr.rilog.support.fixure.TheRilogPostFixture.publishedNews;
import static kr.rilog.support.fixure.TheRilogPostFixture.publishedSpotlight;
import static org.assertj.core.api.Assertions.assertThat;

class TheRilogServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime PUBLICATION_TIME = LocalDateTime.of(2026, 9, 30, 6, 0);

    @Autowired
    private TheRilogQueryService theRilogQueryService;

    @Autowired
    private PostCommandService postCommandService;

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

    @BeforeEach
    void setUpOfficialBlog() {
        var editor = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("편집자", THE_RILOG_BLOG_SLUG));
        theRilog = blogRepository.saveAndFlush(Blog.createRilog(editor));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(theRilog, editor));
        news = chapterRepository.saveAndFlush(Chapter.create(theRilog, "news", 0));
        enterprise = chapterRepository.saveAndFlush(Chapter.create(theRilog, "enterprise", 1));
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
        var result = theRilogQueryService.readTheRilog();

        // then
        assertThat(result).isEqualTo(new TheRilogResult(THE_RILOG_BLOG_SLUG, null, null, List.of()));
    }

    @Test
    @DisplayName("기존 게시글 수정 경로로 변경한 뉴스 제목은 메인 헤드라인에도 반영된다.")
    void reflectsHeadlinesEditedThroughPostService() {
        // given
        Post newsPost = postRepository.saveAndFlush(publishedNews(news, PUBLICATION_TIME, newsContent("수정 전")));
        var command = new PostUpdateCommand(THE_RILOG_BLOG_SLUG, newsPost.getTitle(), newsContent("수정 후").getContent(),
                TECH, PUBLIC, null, news.getId());

        // when
        postCommandService.update(command, newsPost.getId(), theRilog.getOwner().getId());

        // then
        assertThat(theRilogQueryService.readTheRilog().news().headlines())
                .isEqualTo(List.of(new TheRilogResult.HeadlineResult("수정 후")));
    }

    private PostContent newsContent(String title) {
        return content(heading("headline", 2, title));
    }
}
