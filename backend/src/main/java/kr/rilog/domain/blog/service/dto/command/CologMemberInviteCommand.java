package kr.rilog.domain.blog.service.dto.command;

public record CologMemberInviteCommand(
        Long userId,
        String blogRole
) {
}
