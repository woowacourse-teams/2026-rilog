package kr.rilog.domain.blog.service.dto.result;

import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.user.entity.User;

import java.time.LocalDateTime;

public record BlogMemberResult(
        Long id,
        Long userId,
        String nickname,
        String slug,
        String profileImageUrl,
        BlogPermission permission,
        String blogRole,
        LocalDateTime joinedAt
) {

    public static BlogMemberResult from(BlogMember member) {
        User user = member.getUser();
        return new BlogMemberResult(
                member.getId(),
                user.getId(),
                user.getNickname(),
                user.getSlug(),
                user.getProfileImageUrl(),
                member.getPermission(),
                member.getBlogRole(),
                member.getJoinedAt()
        );
    }

}
