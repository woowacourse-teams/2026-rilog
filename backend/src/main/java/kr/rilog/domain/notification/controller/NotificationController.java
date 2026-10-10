package kr.rilog.domain.notification.controller;

import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.notification.controller.apispec.NotificationApiSpec;
import kr.rilog.domain.notification.controller.dto.response.NotificationListResponse;
import kr.rilog.domain.notification.controller.dto.response.NotificationUnreadCountResponse;
import kr.rilog.domain.notification.service.NotificationQueryService;
import kr.rilog.domain.notification.service.NotificationService;
import kr.rilog.domain.notification.service.dto.command.NotificationFilter;
import kr.rilog.domain.notification.service.dto.command.NotificationSearchCommand;
import kr.rilog.domain.notification.service.dto.result.NotificationListResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class NotificationController implements NotificationApiSpec {

    private final NotificationService notificationService;
    private final NotificationQueryService notificationQueryService;

    @AuthGuard
    @GetMapping("/notifications")
    public ApiResponse<NotificationListResponse> readNotifications(
            @LoginUserId Long userId,
            @RequestParam(defaultValue = "ALL") NotificationFilter filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        NotificationSearchCommand command = new NotificationSearchCommand(filter, page, size);
        NotificationListResult result = notificationQueryService.readNotifications(command, userId);
        NotificationListResponse data = NotificationListResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "알림 목록을 조회했습니다.", data);
    }

    @AuthGuard
    @GetMapping("/notifications/unread-count")
    public ApiResponse<NotificationUnreadCountResponse> countUnreadNotifications(@LoginUserId Long userId) {
        long unreadCount = notificationQueryService.countUnreadNotifications(userId);
        NotificationUnreadCountResponse data = new NotificationUnreadCountResponse(unreadCount);
        return ApiResponse.response(HttpStatus.OK, "읽지 않은 알림 수를 조회했습니다.", data);
    }

    @AuthGuard
    @PatchMapping("/notifications/{notificationId}/read")
    public ApiResponse<Void> readNotification(
            @LoginUserId Long userId,
            @PathVariable Long notificationId
    ) {
        notificationService.readNotification(notificationId, userId);
        return ApiResponse.response(HttpStatus.OK, "알림을 읽음 처리했습니다.");
    }

    @AuthGuard
    @PatchMapping("/notifications/read")
    public ApiResponse<Void> readAllNotifications(@LoginUserId Long userId) {
        notificationService.readAllNotifications(userId);
        return ApiResponse.response(HttpStatus.OK, "모든 알림을 읽음 처리했습니다.");
    }

}
