package kr.rilog.domain.user.service;

import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserQueryService {

    private final UserRepository userRepository;

    public UserInfoResult getUserInfo(String slug) {
        User user = userRepository.findBySlugAndOnboardingStatus(slug, OnboardingStatus.COMPLETED)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));

        return UserInfoResult.from(user);
    }
}
