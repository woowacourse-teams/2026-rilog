package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.repository.projection.CologIndexProjection;
import kr.rilog.domain.blog.service.dto.command.BlogProfileUpdateCommand;
import kr.rilog.domain.blog.service.dto.result.BlogIndexResult;
import kr.rilog.domain.blog.service.dto.result.BlogPublicProfileResult;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.chapter.repository.projection.ChapterIndexProjection;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_INVITE_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_PROFILE_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;

@Service
@RequiredArgsConstructor
public class BlogService {

    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final PostRepository postRepository;
    private final ChapterRepository chapterRepository;
    private final TagAssetsPublisher tagAssetsPublisher;

    @Transactional
    public void changeBlogProfile(Long requesterId, String slug, BlogProfileUpdateCommand command) {
        Blog blog = getBlog(slug);

        validateCanChangeProfile(requesterId, blog);

        validateDuplicatedProfileName(command.name(), blog.getId());

        TagAssets previous = blog.getTagAssets();
        blog.changeProfile(command.toProfile());
        synchronizeOwnerProfileIfRilog(blog, command);
        TagAssets current = blog.getTagAssets();
        tagAssetsPublisher.synchronize(previous, current);
    }

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

    public void createRilogIfAbsent(User user) {
        if (blogRepository.findRilogByOwnerId(user.getId()).isPresent()) {
            return;
        }

        blogRepository.save(Blog.createRilog(user));
    }

    public BlogPublicProfileResult getPublicProfile(String slug) {
        Blog blog = blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));

        long memberCount = countMembers(blog);
        long postCount = countPublicPublishedPosts(blog);
        return BlogPublicProfileResult.from(blog, memberCount, postCount);
    }

    private long countMembers(Blog blog) {
        if (!blog.isColog()) {
            return 1L;
        }

        return blogMemberRepository.countActiveMembersByBlogId(blog.getId());
    }

    private long countPublicPublishedPosts(Blog blog) {
        if (blog.isColog()) {
            return postRepository.countPublicPublishedPostsByCologId(blog.getId());
        }

        return postRepository.countPublicPublishedPostsByRilogId(blog.getId());
    }

    private Blog getBlog(String slug) {
        return blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    private void validateDuplicatedProfileName(String profileName, Long excludedBlogId) {
        if (blogRepository.existsByProfileNameExceptId(profileName, excludedBlogId)) {
            throw new BlogException(BLOG_PROFILE_NAME_ALREADY_EXISTS);
        }
    }

    private void synchronizeOwnerProfileIfRilog(Blog blog, BlogProfileUpdateCommand command) {
        if (blog.isColog()) {
            return;
        }

        blog.getOwner().synchronizeRilogProfile(
                command.name(),
                command.introduction(),
                command.profileImageUrl(),
                command.githubUrl(),
                command.email()
        );
    }

    private void validateCanChangeProfile(Long requesterId, Blog blog) {
        if (blog.isColog()) {
            BlogMember requesterMember = getActiveMember(blog.getId(), requesterId);
            requesterMember.validateAdminPermission();
            return;
        }

        blog.validateIsOwner(requesterId);
    }

    private BlogMember getActiveMember(Long blogId, Long userId) {
        return blogMemberRepository.findByBlogIdAndUserIdAndStatus(blogId, userId, BlogMemberStatus.ACTIVE)
                .orElseThrow(() -> new BlogException(BLOG_MEMBER_INVITE_FORBIDDEN));
    }

    private List<CologIndexProjection> readCologIndex(Long userId) {
        return blogRepository.findCologIndexByUserId(userId);
    }

    private List<ChapterIndexProjection> readChapterIndex(Long blogId) {
        return chapterRepository.findChapterIndexByBlogId(blogId);
    }

}
