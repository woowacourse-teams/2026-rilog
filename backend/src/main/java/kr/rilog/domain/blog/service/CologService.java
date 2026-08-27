package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogErrorInformation;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.blog.service.dto.command.CologMemberInviteCommand;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;
import kr.rilog.domain.upload.service.TagAssetsLifecycle;
import kr.rilog.domain.post.repository.PostRepository;
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
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final TagAssetsLifecycle tagAssetsLifecycle;
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

        tagAssetsLifecycle.attach(savedColog.getTagAssets());

        return CologCreateResult.from(savedColog);
    }

    @Transactional
    public CologMemberInviteResult inviteMember(Long requesterId, String slug, CologMemberInviteCommand command) {
        Blog colog = getColog(Slug.from(slug));

        BlogMember requesterMember = getActiveMember(colog.getId(), requesterId, BLOG_MEMBER_INVITE_FORBIDDEN);
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

    @Transactional
    public void leaveColog(Long requesterId, String slug) {
        Blog colog = getColog(Slug.from(slug));
        BlogMember requesterMember = getActiveMember(colog.getId(), requesterId, BLOG_MEMBER_DOESNT_NOT_BELONG);

        requesterMember.leaveBySelf();
    }

    @Transactional
    public void removeMember(Long requesterId, String slug, Long memberId) {
        Blog colog = getColog(Slug.from(slug));
        BlogMember requesterMember = getActiveMember(colog.getId(), requesterId, BLOG_MEMBER_DOESNT_NOT_BELONG);
        BlogMember targetMember = getActiveMemberById(colog.getId(), memberId);

        requesterMember.remove(targetMember);
    }

    @Transactional
    public void deleteColog(Long requesterId, String slug) {
        Blog colog = getColog(Slug.from(slug));
        BlogMember requesterMember = getActiveMember(colog.getId(), requesterId, BLOG_MEMBER_DOESNT_NOT_BELONG);
        requesterMember.validateCanDeleteColog();

        List<BlogMember> activeMembers = blogMemberRepository.findAllByBlogIdAndStatusAndDeletedAtIsNull(colog.getId(), BlogMemberStatus.ACTIVE);
        colog.deleteCologBy(requesterMember, activeMembers);

        postRepository.softDeleteAllByCologId(colog.getId(), LocalDateTime.now(clock));
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

    private Blog getColog(Slug slug) {
        return blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(slug, BlogType.COLOG)
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    private BlogMember getActiveMember(Long blogId, Long userId, BlogErrorInformation errorInformation) {
        return blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(blogId, userId, BlogMemberStatus.ACTIVE)
                .orElseThrow(() -> new BlogException(errorInformation));
    }

    private BlogMember getActiveMemberById(Long blogId, Long memberId) {
        return blogMemberRepository.findByIdAndBlogIdAndStatusAndDeletedAtIsNull(memberId, blogId, BlogMemberStatus.ACTIVE)
                .orElseThrow(() -> new BlogException(BLOG_MEMBER_DOESNT_NOT_BELONG));
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
