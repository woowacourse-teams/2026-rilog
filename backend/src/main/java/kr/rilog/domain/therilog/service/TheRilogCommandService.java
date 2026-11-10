package kr.rilog.domain.therilog.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.therilog.repository.TheRilogRepository;
import kr.rilog.domain.therilog.entity.vo.TheRilogPublication;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import kr.rilog.domain.therilog.service.dto.command.TheRilogPostPublishCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
import static kr.rilog.domain.post.entity.Post.THE_RILOG_BLOG_SLUG;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@RequiredArgsConstructor
public class TheRilogCommandService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final TheRilogRepository theRilogRepository;
    private final BlogRepository blogRepository;
    private final UserRepository userRepository;
    private final ChapterRepository chapterRepository;
    private final TagAssetsPublisher tagAssetsPublisher;
    private final PostViewCountRepository viewCountRepository;
    private final Clock clock;

    @Transactional
    public PostPublishResult publishTheRilog(TheRilogPostPublishCommand command, Long requesterId) {
        Blog blog = getTheRilogBlog();
        User writer = getUser(requesterId);
        blog.validateIsOwner(writer);
        Chapter chapter = getTheRilogChapter(blog, command.postType());
        Post post = Post.createTheRilog(blog, writer, command.detail(), chapter, command.toMetadata(),
                LocalDateTime.ofInstant(clock.instant(), SEOUL));

        Post published = theRilogRepository.save(post);
        viewCountRepository.initialize(published.getId());
        tagAssetsPublisher.attach(published.getTagAssets());
        return PostPublishResult.of(published, blog);
    }

    @Transactional
    public List<TheRilogPublishedArticle> publishPublication(TheRilogPublication publication) {
        Long ownerId = getTheRilogBlog().getOwner().getId();
        return publication.articles().stream().map(article -> {
            var metadata = article.metadata();
            var command = new TheRilogPostPublishCommand(metadata.postType(), article.detail(),
                    metadata.description(), metadata.sourceProfileName(), metadata.sourceProfileImage());
            PostPublishResult published = publishTheRilog(command, ownerId);
            return new TheRilogPublishedArticle(article.rowId(), article.contentType(), published.postId());
        }).toList();
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
            case DAILY_HEADLINES -> "news";
            case ENTERPRISE_SPOTLIGHT -> "enterprise";
            case PERSONAL_SPOTLIGHT -> "personal";
            case STANDARD -> throw new IllegalStateException("일반 글에는 지정된 편집 챕터가 없습니다.");
        };
        return chapterRepository.findByBlogIdAndName(blog.getId(), chapterName)
                .orElseThrow(() -> new ChapterException(CHAPTER_NOT_FOUND));
    }

}
