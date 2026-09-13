package kr.rilog.domain.blog.service.dto.command;

import kr.rilog.domain.blog.entity.enums.BlogPermission;

public record CologMemberUpdateCommand(
        BlogPermission permission,
        String blogRole
) {

    public boolean isEmpty() {
        return permission == null && blogRole == null;
    }

}
