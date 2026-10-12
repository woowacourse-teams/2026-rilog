package kr.rilog.domain.notification.service.dto.command;

public record NotificationSearchCommand(
        NotificationFilter filter,
        int page,
        int size
) {
    public boolean isUnreadFilter() {
        return filter == NotificationFilter.UNREAD;
    }
}
