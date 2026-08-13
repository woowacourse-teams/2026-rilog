package kr.rilog.domain.user.service;

import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import static kr.rilog.domain.user.exception.UserErrorInformation.NICKNAME_DUPLICATED;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public void validateDuplicatedNickname(String nickname) {
        if (userRepository.existsByNickname(nickname)) {
            throw new UserException(NICKNAME_DUPLICATED);
        }
    }

    public void validateDuplicatedSlug(String slug) {
        if (userRepository.existsBySlug(slug)) {
            throw new UserException(NICKNAME_DUPLICATED);
        }
    }

}
