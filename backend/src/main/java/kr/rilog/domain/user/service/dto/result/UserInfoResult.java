package kr.rilog.domain.user.service.dto.result;

import kr.rilog.domain.user.entity.User;

public record UserInfoResult(
        Long id,
        String nickname,
        String slug,
        String profileImageUrl
) {

    public static UserInfoResult from(User user) {
        return new UserInfoResult(
                user.getId(),
                user.getNickname(),
                user.getSlug(),
                user.getProfileImageUrl()
        );
    }
}
