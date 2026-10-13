package kr.rilog.domain.therilog.service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Stream;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostSource;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.therilog.repository.TheRilogRepository;
import kr.rilog.domain.therilog.repository.projection.TheRilogSpotlightRow;
import kr.rilog.domain.therilog.service.dto.command.TheRilogPostPublishCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult.*;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
import static kr.rilog.domain.post.entity.Post.THE_RILOG_BLOG_SLUG;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class TheRilogService {

    private static final int ENTERPRISE_SPOTLIGHT_SIZE = 3;
    private static final int PERSONAL_SPOTLIGHT_SIZE = 2;

    private final TheRilogRepository theRilogRepository;
    private final BlogRepository blogRepository;
    private final UserRepository userRepository;
    private final ChapterRepository chapterRepository;
    private final TagAssetsPublisher tagAssetsPublisher;
    private final PostViewCountRepository viewCountRepository;

    public TheRilogResult readTheRilog() {
        NewsResult news = readLatestPublicNews();
        List<SpotlightResult> spotlights = readSpotlights();
        return new TheRilogResult(THE_RILOG_BLOG_SLUG, readDate(news, spotlights), news, spotlights);
    }

    @Transactional
    public PostPublishResult publishTheRilog(TheRilogPostPublishCommand command, Long requesterId) {
        Blog blog = getTheRilogBlog();
        User writer = getUser(requesterId);
        blog.validateIsOwner(writer);
        Chapter chapter = getTheRilogChapter(blog, command.postType());
        Post post = Post.createTheRilog(blog, writer, command.detail(), chapter, command.toMetadata());

        Post published = theRilogRepository.save(post);
        viewCountRepository.initialize(published.getId());
        tagAssetsPublisher.attach(published.getTagAssets());
        return PostPublishResult.of(published, blog);
    }

    private NewsResult readLatestPublicNews() {
        return theRilogRepository.findLatestPublicNews(Slug.from(THE_RILOG_BLOG_SLUG), PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(this::toNewsResult)
                .orElse(null);
    }

    private List<SpotlightResult> readSpotlights() {
        List<TheRilogSpotlightRow> enterpriseSpotlights = theRilogRepository.findLatestPublicSpotlights(
                Slug.from(THE_RILOG_BLOG_SLUG),
                PostType.ENTERPRISE_SPOTLIGHT,
                PageRequest.of(0, ENTERPRISE_SPOTLIGHT_SIZE)
        );
        List<TheRilogSpotlightRow> personalSpotlights = theRilogRepository.findLatestPublicSpotlights(
                Slug.from(THE_RILOG_BLOG_SLUG),
                PostType.PERSONAL_SPOTLIGHT,
                PageRequest.of(0, PERSONAL_SPOTLIGHT_SIZE)
        );

        return Stream.concat(enterpriseSpotlights.stream(), personalSpotlights.stream())
                .map(this::toSpotlightResult)
                .toList();
    }

    private Blog getTheRilogBlog() {
        return blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(THE_RILOG_BLOG_SLUG))
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    private User getUser(Long requesterId) {
        return userRepository.findById(requesterId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

    private Chapter getTheRilogChapter(Blog blog, PostType postType) {
        String chapterName = switch (postType) {
            case DAILY_HEADLINES -> "headlines";
            case ENTERPRISE_SPOTLIGHT, PERSONAL_SPOTLIGHT -> "spotlights";
            case STANDARD -> throw new IllegalStateException("일반 글에는 지정된 편집 챕터가 없습니다.");
        };
        return chapterRepository.findByBlogIdAndName(blog.getId(), chapterName)
                .orElseThrow(() -> new ChapterException(CHAPTER_NOT_FOUND));
    }

    private NewsResult toNewsResult(Post post) {
        List<HeadlineResult> headlines = post.getContent()
                .extractHeadingBlocks()
                .stream()
                .filter(block -> !block.text().isBlank())
                .map(block -> new HeadlineResult(block.text()))
                .toList();
        return new NewsResult(post.getId(), post.getTitle(), post.getPublishedAt(), headlines);
    }

    private LocalDate readDate(NewsResult news, List<SpotlightResult> spotlights) {
        if (news != null && news.publishedAt() != null) {
            return news.publishedAt().toLocalDate();
        }
        return spotlights.stream()
                .map(SpotlightResult::publishedAt)
                .max(java.time.LocalDateTime::compareTo)
                .map(java.time.LocalDateTime::toLocalDate)
                .orElse(null);
    }

    private SpotlightResult toSpotlightResult(TheRilogSpotlightRow row) {
        return new SpotlightResult(
                row.postId(),
                row.postType(),
                row.title(),
                row.description(),
                row.thumbnailImageUrl(),
                row.publishedAt(),
                toSourceResult(row.source())
        );
    }

    private SourceResult toSourceResult(PostSource source) {
        if (source == null) {
            return null;
        }
        return new SourceResult(source.getSourceProfileName(), source.getSourceProfileImage());
    }
}
