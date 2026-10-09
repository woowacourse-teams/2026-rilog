package kr.rilog.domain.notification.service.content;

public sealed interface NotificationContent permits InlineCommentNotificationContent {

    NotificationSourceStatus status();

}
