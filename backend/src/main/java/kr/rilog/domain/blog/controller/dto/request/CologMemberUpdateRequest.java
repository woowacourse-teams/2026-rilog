package kr.rilog.domain.blog.controller.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.service.dto.command.CologMemberUpdateCommand;

@Schema(description = "팀 멤버 정보 수정 요청")
public record CologMemberUpdateRequest(

        @Schema(description = "변경할 팀 권한", example = "ADMIN", allowableValues = {"OWNER", "ADMIN", "MEMBER"})
        BlogPermission permission,

        @Schema(description = "팀 내 역할명", example = "Backend")
        @Size(max = 50, message = "팀 내 역할명은 50자 이하여야 합니다.")
        String blogRole
) {

    @AssertTrue(message = "수정할 팀 멤버 정보가 하나 이상 필요합니다.")
    public boolean hasUpdateValue() {
        return permission != null || blogRole != null;
    }

    public CologMemberUpdateCommand toCommand() {
        return new CologMemberUpdateCommand(permission, blogRole);
    }

}
