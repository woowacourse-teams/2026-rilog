package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.controller.dto.response.PublicBlogFeedPostResponse;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import kr.rilog.domain.blog.entity.vo.Slug;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;

@Service
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

    public PublicBlogFeedPostResponse readPublicBlogPosts(String slug, int page, int size) {
        Blog blog = getBlog(slug);
        PageRequest pageable = PageRequest.of(page, size);

        Slice<PostFullFeedRow> posts = blog.isColog()
                ? readPublicCologPosts(blog, pageable)
                : readPublicRilogPosts(blog, pageable);

        return PublicBlogFeedPostResponse.from(blog.getBlogType(), posts);
    }

    private Blog getBlog(String slug) {
        return blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    private Slice<PostFullFeedRow> readPublicCologPosts(Blog colog, PageRequest pageable) {
        return postFeedQueryRepository.findPublicCologPosts(
                colog.getId(),
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        );
    }

    private Slice<PostFullFeedRow> readPublicRilogPosts(Blog rilog, PageRequest pageable) {
        return postFeedQueryRepository.findPublicRilogPosts(
                rilog.getId(),
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        );
    }

}
