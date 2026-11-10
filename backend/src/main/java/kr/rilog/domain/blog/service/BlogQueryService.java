package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.repository.projection.CologIndexProjection;
import kr.rilog.domain.blog.service.dto.result.BlogIndexResult;
import kr.rilog.domain.blog.service.dto.result.BlogPublicProfileResult;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.chapter.repository.projection.ChapterIndexProjection;
import kr.rilog.domain.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_PROFILE_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BlogQueryService {

    private final BlogRepository blogRepository;
    private final PostRepository postRepository;
    private final ChapterRepository chapterRepository;

    public BlogIndexResult readBlogIndex(String slug) {
        Blog blog = getBlog(slug);

        List<ChapterIndexProjection> chapterOverviews = readChapterIndex(blog.getId());

        if (blog.isColog()) {
            long totalCount = postRepository.countPublicPublishedPostsByCologId(blog.getId());
            return BlogIndexResult.of(BlogType.COLOG, totalCount, chapterOverviews);
        }

        List<CologIndexProjection> cologOverviews = readCologIndex(blog.getOwner().getId());
        long totalCount = postRepository.countAllPublicPublishedPostsByRilogId(blog.getId());
        return BlogIndexResult.of(BlogType.RILOG, totalCount, chapterOverviews, cologOverviews);
    }

    public void validateDuplicatedSlug(String slug) {
        if (blogRepository.existsBySlug(Slug.from(slug))) {
            throw new BlogException(BLOG_SLUG_ALREADY_EXISTS);
        }
    }

    public void validateDuplicatedProfileName(String profileName) {
        if (blogRepository.existsByProfileName(profileName)) {
            throw new BlogException(BLOG_PROFILE_NAME_ALREADY_EXISTS);
        }
    }

    public BlogPublicProfileResult getPublicProfile(String slug) {
        Blog blog = getBlog(slug);
        return BlogPublicProfileResult.from(blog);
    }

    private Blog getBlog(String slug) {
        return blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    private List<CologIndexProjection> readCologIndex(Long userId) {
        return blogRepository.findCologIndexByUserId(userId);
    }

    private List<ChapterIndexProjection> readChapterIndex(Long blogId) {
        return chapterRepository.findChapterIndexByBlogId(blogId);
    }

}
