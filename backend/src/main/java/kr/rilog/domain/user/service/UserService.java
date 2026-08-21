package kr.rilog.domain.user.service;

import kr.rilog.domain.blog.service.BlogService;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.user.exception.UserErrorInformation.NICKNAME_DUPLICATED;
import static kr.rilog.domain.user.exception.UserErrorInformation.ONBOARDING_ALREADY_COMPLETED;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BlogService blogService;

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
        blogService.validateDuplicatedSlug(command.slug());

        user.completeOnboarding(
                command.nickname(),
                command.slug(),
                command.introduction(),
                command.profileImageUrl(),
                command.githubUrl(),
                command.email()
        );

        User completedUser = userRepository.saveAndFlush(user);
        blogService.createRilogIfAbsent(completedUser);
        return completedUser;
    }

    public void validateDuplicatedNickname(String nickname) {
        if (userRepository.existsByNickname(Nickname.from(nickname))) {
            throw new UserException(NICKNAME_DUPLICATED);
        }
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

}
