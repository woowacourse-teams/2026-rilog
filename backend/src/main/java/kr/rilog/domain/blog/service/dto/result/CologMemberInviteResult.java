package kr.rilog.domain.blog.service.dto.result;

import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;

public record CologMemberInviteResult(
        Long id,
        Long userId,
        BlogPermission permission,
        String blogRole
) {

    public static CologMemberInviteResult from(BlogMember member) {
        return new CologMemberInviteResult(
                member.getId(),
                member.getUser().getId(),
                member.getPermission(),
                member.getBlogRole()
        );
    }

}
