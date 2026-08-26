package kr.rilog.domain.blog.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum BlogErrorInformation implements ErrorInformation {

    BLOG_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 블로그를 찾을 수 없습니다."),
    BLOG_SLUG_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 slug입니다."),
    BLOG_PROFILE_NAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 이름입니다."),
    BLOG_MEMBER_INVITE_FORBIDDEN(HttpStatus.FORBIDDEN, "팀 멤버 초대 권한이 없습니다."),
    BLOG_MEMBER_INVITATION_PERMISSION_INVALID(HttpStatus.BAD_REQUEST, "초대할 수 없는 팀 권한입니다."),
    ADMIN_PERMISSION_INVALID(HttpStatus.BAD_REQUEST, "ADMIN 권한이 아닙니다."),
    BLOG_MEMBER_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 팀에 참여 중인 사용자입니다."),
    BLOG_MEMBER_DOESNT_NOT_BELONG(HttpStatus.BAD_REQUEST, "해당 팀에 속해있지 않습니다."),
    ALREADY_BLOG_MEMBER_LEFT(HttpStatus.FORBIDDEN, "이미 탈퇴한 회원입니다."),
    COLOG_OWNER_LEAVE_FORBIDDEN(HttpStatus.FORBIDDEN, "OWNER는 팀 블로그에서 탈퇴할 수 없습니다."),
    COLOG_MEMBER_REMOVE_FORBIDDEN(HttpStatus.FORBIDDEN, "팀 멤버 내보내기 권한이 없습니다."),
    COLOG_SELF_REMOVE_FORBIDDEN(HttpStatus.BAD_REQUEST, "자기 자신은 내보내기 할 수 없습니다."),
    RILOG_NOT_FOUND(HttpStatus.NOT_FOUND, "작성자의 개인 블로그를 찾을 수 없습니다."),
    RILOG_POST_PUBLISH_FORBIDDEN(HttpStatus.FORBIDDEN, "본인의 개인 블로그에만 게시글을 발행할 수 있습니다."),
    COLOG_POST_PUBLISH_FORBIDDEN(HttpStatus.FORBIDDEN, "팀 블로그 게시글 발행 권한이 없습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }

}
