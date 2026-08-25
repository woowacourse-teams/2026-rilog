package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.BlogProfileUpdateCommand;
import kr.rilog.domain.blog.service.dto.result.CologPublicProfileResult;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_INVITE_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_PROFILE_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;

@Service
@RequiredArgsConstructor
public class BlogService {

    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final PostRepository postRepository;

    @Transactional
    public void changeBlogProfile(Long requesterId, String slug, BlogProfileUpdateCommand command) {
        Blog blog = getBlog(slug);

        validateCanChangeProfile(requesterId, blog);

        validateDuplicatedProfileName(command.name(), blog.getId());
        blog.changeProfile(command.toProfile());
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

    public CologPublicProfileResult getPublicProfile(String slug) {
        Blog colog = blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(slug), BlogType.COLOG)
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));

        long memberCount = blogMemberRepository.countActiveMembersByBlogId(colog.getId());
        long postCount = postRepository.countPublicPublishedPostsByCologId(colog.getId());
        return CologPublicProfileResult.from(colog, memberCount, postCount);
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

    private void validateCanChangeProfile(Long requesterId, Blog blog) {
        if (blog.isColog()) {
            BlogMember requesterMember = getActiveMember(blog.getId(), requesterId);
            requesterMember.validateHasAdminPermission();
            return;
        }

        if (blog.getOwner() == null
                || blog.getOwner().getId() == null
                || !blog.getOwner().getId().equals(requesterId)) {
            throw new BlogException(RILOG_POST_PUBLISH_FORBIDDEN);
        }
    }

    private BlogMember getActiveMember(Long blogId, Long userId) {
        return blogMemberRepository.findByBlogIdAndUserIdAndStatus(blogId, userId, BlogMemberStatus.ACTIVE)
                .orElseThrow(() -> new BlogException(BLOG_MEMBER_INVITE_FORBIDDEN));
    }

}
