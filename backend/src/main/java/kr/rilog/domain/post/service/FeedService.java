package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.PublicBlogFeedPostResponse;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import kr.rilog.domain.post.service.dto.command.BlogFeedSearchCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_BLOG_FEED_FILTER;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class FeedService {

    private final PostFeedQueryRepository postFeedQueryRepository;
    private final BlogRepository blogRepository;

    /** 1차 MVP 전체 피드 조회 정책 - 게시됨 + 공개 */
    public FullFeedPostResponse readFullFeedPostList(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);

        Slice<PostFullFeedRow> feed = postFeedQueryRepository.findFullFeed(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        );

        return FullFeedPostResponse.from(feed);
    }

    public PublicBlogFeedPostResponse readBlogPosts(String slug, Long requesterId, BlogFeedSearchCommand command) {
        Blog blog = getBlog(slug);
        validateFeedFilters(blog, command);
        Long targetCologId = getTargetCologId(command);
        PageRequest pageable = PageRequest.of(command.page(), command.size());

        Slice<PostFullFeedRow> posts = blog.isColog()
                ? readCologPosts(blog, requesterId, command, pageable)
                : readRilogPosts(blog, targetCologId, requesterId, command, pageable);

        return PublicBlogFeedPostResponse.from(blog.getBlogType(), posts);
    }

    private Slice<PostFullFeedRow> readCologPosts(
            Blog colog,
            Long requesterId,
            BlogFeedSearchCommand command,
            PageRequest pageable
    ) {
        return postFeedQueryRepository.findCologFeedPosts(
                colog.getId(),
                requesterId,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                command.category(),
                command.chapterId(),
                pageable
        );
    }

    private Slice<PostFullFeedRow> readRilogPosts(
            Blog rilog,
            Long targetCologId,
            Long requesterId,
            BlogFeedSearchCommand command,
            PageRequest pageable
    ) {
        return postFeedQueryRepository.findRilogFeedPosts(
                rilog.getId(),
                requesterId,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                command.category(),
                command.chapterId(),
                targetCologId,
                pageable
        );
    }

    private Blog getBlog(String slug) {
        return blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    private Long getTargetCologId(BlogFeedSearchCommand command) {
        if (!command.hasTargetCologFilter()) {
            return null;
        }

        return blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(
                        Slug.from(command.targetCologSlug()),
                        BlogType.COLOG
                )
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND))
                .getId();
    }

    private void validateFeedFilters(Blog blog, BlogFeedSearchCommand command) {
        if (!command.hasTargetCologFilter()) {
            return;
        }

        if (blog.isColog() || command.hasChapterFilter()) {
            throw new PostException(INVALID_BLOG_FEED_FILTER);
        }
    }

}
