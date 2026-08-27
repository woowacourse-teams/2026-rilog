package kr.rilog.domain.user.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_PROFILE_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;
import static kr.rilog.domain.user.exception.UserErrorInformation.*;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;

    public UserInfoResult getUserInformation(Long userId) {
        User user = getUser(userId);
        return UserInfoResult.from(user);
    }

    public UserInfoResult getUserInfo(String slug) {
        User user = userRepository.findBySlugAndOnboardingStatus(Slug.from(slug), OnboardingStatus.COMPLETED)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));

        return UserInfoResult.from(user);
    }

    @Transactional
    public User completeOnboarding(Long userId, OnboardingCompleteCommand command) {
        User user = getUser(userId);
        if (user.isOnboardingCompleted()) {
            throw new UserException(ONBOARDING_ALREADY_COMPLETED);
        }

        validateDuplicatedProfileName(command.nickname());
        validateDuplicatedUserSlug(command.slug());
        validateDuplicatedBlogSlug(command.slug());

        user.completeOnboarding(
                command.nickname(),
                command.slug(),
                command.introduction(),
                command.profileImageUrl(),
                command.githubUrl(),
                command.email()
        );

        User completedUser = userRepository.saveAndFlush(user);
        createRilog(completedUser, command.serviceUrl());
        return completedUser;
    }

    private void validateDuplicatedProfileName(String profileName) {
        if (blogRepository.existsByProfileName(profileName)) {
            throw new BlogException(BLOG_PROFILE_NAME_ALREADY_EXISTS);
        }
    }

    public void validateDuplicatedUserSlug(String slug) {
        if (userRepository.existsBySlug(Slug.from(slug))) {
            throw new UserException(SLUG_DUPLICATED);
        }
    }

    private void validateDuplicatedBlogSlug(String slug) {
        if (blogRepository.existsBySlug(Slug.from(slug))) {
            throw new BlogException(BLOG_SLUG_ALREADY_EXISTS);
        }
    }

    private void createRilog(User user, String serviceUrl) {
        Blog rilog = blogRepository.save(Blog.createRilog(user, serviceUrl));
        createRilogMember(rilog, user);
    }

    private void createRilogMember(Blog rilog, User owner) {
        blogMemberRepository.save(BlogMember.createOwner(rilog, owner, LocalDateTime.now()));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

}
