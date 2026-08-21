package kr.rilog.domain.blog.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.service.dto.result.CologMemberInviteResult;

@Schema(description = "팀 멤버 초대 응답")
public record CologMemberInviteResponse(

        @Schema(description = "생성된 팀 멤버 ID", example = "3")
        Long id,

        @Schema(description = "초대된 사용자 ID", example = "10")
        Long userId,

        @Schema(description = "부여된 팀 권한", example = "MEMBER")
        BlogPermission permission,

        @Schema(description = "팀 내 역할명", example = "Backend")
        String blogRole
) {

    public static CologMemberInviteResponse from(CologMemberInviteResult result) {
        return new CologMemberInviteResponse(
                result.id(),
                result.userId(),
                result.permission(),
                result.blogRole()
        );
    }

}
