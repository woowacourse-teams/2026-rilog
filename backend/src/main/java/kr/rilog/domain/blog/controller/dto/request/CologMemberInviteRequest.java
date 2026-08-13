package kr.rilog.domain.blog.controller.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.service.dto.command.CologMemberInviteCommand;

@Schema(description = "팀 멤버 초대 요청")
public record CologMemberInviteRequest(

        @Schema(description = "초대할 사용자 ID", example = "10")
        @NotNull(message = "초대할 사용자 ID는 필수입니다.")
        Long userId,

        @Schema(description = "초대할 팀 권한", example = "MEMBER", allowableValues = {"ADMIN", "MEMBER"})
        @NotNull(message = "팀 권한은 필수입니다.")
        BlogPermission permission,

        @Schema(description = "팀 내 역할명", example = "Backend")
        @Size(max = 50, message = "팀 내 역할명은 50자 이하여야 합니다.")
        String blogRole
) {

    public CologMemberInviteCommand toCommand() {
        return new CologMemberInviteCommand(userId, permission, blogRole);
    }

}
