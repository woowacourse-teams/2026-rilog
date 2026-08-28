package kr.rilog.domain.blog.service.dto.command;

import kr.rilog.domain.blog.entity.enums.BlogPermission;

public record CologMemberInviteCommand(
        Long userId,
        BlogPermission permission,
        String blogRole
) {
}
