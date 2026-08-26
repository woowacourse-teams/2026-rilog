package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.blog.service.dto.command.CologMemberInviteCommand;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.blog.entity.vo.Slug;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.*;
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
        validateProfileNameUnique(command.name());

        Blog colog = Blog.createColog(
                owner,
                command.slug(),
                command.toProfile()
        );
        Blog savedColog = saveColog(colog);
        BlogMember ownerMember = BlogMember.createOwner(savedColog, owner, LocalDateTime.now(clock));
        blogMemberRepository.save(ownerMember);

        return CologCreateResult.from(savedColog);
    }

    @Transactional
    public CologMemberInviteResult inviteMember(Long requesterId, String slug, CologMemberInviteCommand command) {
        Blog colog = getColog(slug);

        BlogMember requesterMember = getActiveMember(colog.getId(), requesterId);
        requesterMember.validateCanInvite();

        User invitee = getUser(command.userId());
        validateNotActiveMember(colog.getId(), invitee.getId());

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

    public List<MyCologResponse> getMyCologsPreview(Long requesterId) {
        return blogRepository.findAllActiveCologsByUserId(requesterId).stream()
                .map(MyCologResponse::of)
                .toList();
    }

    private User getUser(Long ownerId) {
        return userRepository.findById(ownerId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

    private Blog getColog(String slug) {
        return blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(slug), BlogType.COLOG)
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    private BlogMember getActiveMember(Long blogId, Long userId) {
        return blogMemberRepository.findByBlogIdAndUserIdAndStatus(blogId, userId, BlogMemberStatus.ACTIVE)
                .orElseThrow(() -> new BlogException(BLOG_MEMBER_INVITE_FORBIDDEN));
    }

    private void validateNotActiveMember(Long blodIg, Long userId) {
        if (blogMemberRepository.existsByBlogIdAndUserIdAndStatus(blodIg, userId, BlogMemberStatus.ACTIVE)) {
            throw new BlogException(BLOG_MEMBER_ALREADY_EXISTS);
        }
    }

    private void validateSlugUnique(String slug) {
        if (blogRepository.existsBySlug(Slug.from(slug))) {
            throw new BlogException(BLOG_SLUG_ALREADY_EXISTS);
        }
    }

    private void validateProfileNameUnique(String profileName) {
        if (blogRepository.existsByProfileName(profileName)) {
            throw new BlogException(BLOG_PROFILE_NAME_ALREADY_EXISTS);
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
