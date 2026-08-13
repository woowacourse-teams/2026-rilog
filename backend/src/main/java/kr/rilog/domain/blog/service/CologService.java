package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.blog.service.dto.command.CologMemberInviteCommand;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.blog.service.dto.result.CologDetailResult;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.domain.blog.service.dto.result.CologProfileResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_INVITE_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_PERMISSION_INVALID;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class CologService {

    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Transactional
    public CologCreateResult create(Long ownerId, CologCreateCommand command) {
        User owner = getUser(ownerId);
        validateSlugUnique(command.slug());

        Blog colog = Blog.createColog(
                owner,
                command.name(),
                command.slug(),
                command.introduction(),
                command.logoUrl(),
                command.coverImageUrl(),
                command.serviceUrl(),
                command.githubUrl()
        );
        Blog savedColog = saveColog(colog);
        BlogMember ownerMember = BlogMember.createOwner(savedColog, owner, LocalDateTime.now(clock));
        blogMemberRepository.save(ownerMember);

        return CologCreateResult.from(savedColog);
    }

    public CologDetailResult getDetail(String slug) {
        Blog colog = blogRepository.findBySlugAndBlogType(slug, BlogType.COLOG)
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));

        return CologDetailResult.from(colog);
    }

    public CologProfileResult getProfile(String slug) {
        Blog colog = blogRepository.findBySlugAndBlogType(slug, BlogType.COLOG)
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));

        return CologProfileResult.from(colog);
    }

    @Transactional
    public CologMemberInviteResult inviteMember(Long requesterId, Long cologId, CologMemberInviteCommand command) {
        Blog colog = getColog(cologId);
        User requester = getUser(requesterId);
        BlogMember requesterMember = getActiveMember(cologId, requester.getId());
        validateInvitePermission(requesterMember);
        validateAssignablePermission(command.permission());

        User invitee = getUser(command.userId());
        validateNotActiveMember(cologId, invitee.getId());

        BlogMember member = BlogMember.invite(
                colog,
                invitee,
                command.blogRole(),
                command.permission(),
                LocalDateTime.now(clock)
        );
        BlogMember savedMember = blogMemberRepository.save(member);

        return CologMemberInviteResult.from(savedMember);
    }

    private User getUser(Long ownerId) {
        return userRepository.findById(ownerId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

    private Blog getColog(Long cologId) {
        return blogRepository.findByIdAndBlogType(cologId, BlogType.COLOG)
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    private BlogMember getActiveMember(Long cologId, Long userId) {
        return blogMemberRepository.findByBlogIdAndUserIdAndStatus(cologId, userId, BlogMemberStatus.ACTIVE)
                .orElseThrow(() -> new BlogException(BLOG_MEMBER_INVITE_FORBIDDEN));
    }

    private void validateInvitePermission(BlogMember member) {
        if (member.getPermission() != BlogPermission.OWNER && member.getPermission() != BlogPermission.ADMIN) {
            throw new BlogException(BLOG_MEMBER_INVITE_FORBIDDEN);
        }
    }

    private void validateAssignablePermission(BlogPermission permission) {
        if (permission != BlogPermission.ADMIN && permission != BlogPermission.MEMBER) {
            throw new BlogException(BLOG_MEMBER_PERMISSION_INVALID);
        }
    }

    private void validateNotActiveMember(Long cologId, Long userId) {
        if (blogMemberRepository.existsByBlogIdAndUserIdAndStatus(cologId, userId, BlogMemberStatus.ACTIVE)) {
            throw new BlogException(BLOG_MEMBER_ALREADY_EXISTS);
        }
    }

    private void validateSlugUnique(String slug) {
        if (blogRepository.existsBySlug(slug)) {
            throw new BlogException(BLOG_SLUG_ALREADY_EXISTS);
        }
    }

    private Blog saveColog(Blog colog) {
        try {
            return blogRepository.saveAndFlush(colog);
        } catch (DataIntegrityViolationException exception) {
            throw new BlogException(BLOG_SLUG_ALREADY_EXISTS);
        }
    }

}
