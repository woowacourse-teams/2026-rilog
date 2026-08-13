package kr.rilog.domain.blog.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.service.dto.result.BlogMemberResult;

import java.time.LocalDateTime;

@Schema(description = "팀 멤버 응답")
public record BlogMemberResponse(

        Long id,
        Long userId,
        String nickname,
        String slug,
        String profileImageUrl,
        BlogPermission permission,
        String blogRole,
        LocalDateTime joinedAt

) {

    public static BlogMemberResponse from(BlogMemberResult result) {
        return new BlogMemberResponse(
                result.id(),
                result.userId(),
                result.nickname(),
                result.slug(),
                result.profileImageUrl(),
                result.permission(),
                result.blogRole(),
                result.joinedAt()
        );
    }

}
