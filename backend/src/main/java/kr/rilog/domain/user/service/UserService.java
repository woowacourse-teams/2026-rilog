package kr.rilog.domain.user.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.user.exception.UserErrorInformation.NICKNAME_DUPLICATED;
import static kr.rilog.domain.user.exception.UserErrorInformation.ONBOARDING_ALREADY_COMPLETED;
import static kr.rilog.domain.user.exception.UserErrorInformation.SLUG_DUPLICATED;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BlogRepository blogRepository;

    public UserInfoResult getUserInformation(Long userId) {
        User user = getUser(userId);
        return UserInfoResult.from(user);
    }

    @Transactional
    public User completeOnboarding(Long userId, OnboardingCompleteCommand command) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));

        if (user.isOnboardingCompleted()) {
            throw new UserException(ONBOARDING_ALREADY_COMPLETED);
        }

        validateDuplicatedNickname(command.nickname());
        validateDuplicatedSlug(command.slug());

        user.completeOnboarding(
                command.nickname(),
                command.slug(),
                command.introduction(),
                command.profileImageUrl(),
                command.githubUrl(),
                command.email()
        );

        User completedUser = userRepository.saveAndFlush(user);
        createRilogIfAbsent(completedUser);
        return completedUser;
    }

    public void validateDuplicatedNickname(String nickname) {
        if (userRepository.existsByNickname(Nickname.from(nickname))) {
            throw new UserException(NICKNAME_DUPLICATED);
        }
    }

    public void validateDuplicatedSlug(String slug) {
        if (userRepository.existsBySlug(Slug.from(slug))) {
            throw new UserException(SLUG_DUPLICATED);
        }
    }

    private void createRilogIfAbsent(User user) {
        if (blogRepository.findRilogByOwnerId(user.getId()).isPresent()) {
            return;
        }

        blogRepository.save(Blog.createRilog(user));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

}
