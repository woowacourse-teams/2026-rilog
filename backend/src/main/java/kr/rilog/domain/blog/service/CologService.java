package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.blog.service.dto.result.CologCreateResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class CologService {

    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final UserRepository userRepository;
    private Clock clock = Clock.systemUTC();

    CologService(
            BlogRepository blogRepository,
            BlogMemberRepository blogMemberRepository,
            UserRepository userRepository,
            Clock clock
    ) {
        this.blogRepository = blogRepository;
        this.blogMemberRepository = blogMemberRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

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

    private User getUser(Long ownerId) {
        return userRepository.findById(ownerId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
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
