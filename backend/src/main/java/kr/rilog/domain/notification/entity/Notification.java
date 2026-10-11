package kr.rilog.domain.notification.entity;

import jakarta.persistence.*;
import kr.rilog.domain.notification.entity.enums.NotificationSourceType;
import kr.rilog.domain.notification.entity.enums.NotificationType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "notification")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Long recipientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64, updatable = false)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32, updatable = false)
    private NotificationSourceType sourceType;

    @Column(nullable = false, updatable = false)
    private Long sourceId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime readAt;

    public static Notification create(Long recipientId, NotificationType type, Long sourceId, LocalDateTime createdAt) {
        Notification notification = new Notification();
        notification.recipientId = recipientId;
        notification.type = type;
        notification.sourceType = type.getSourceType();
        notification.sourceId = sourceId;
        notification.createdAt = createdAt;
        return notification;
    }

    public boolean isRecipient(Long userId) {
        return recipientId.equals(userId);
    }

    public void markAsRead(LocalDateTime readAt) {
        if (isRead()) {
            return;
        }
        this.readAt = readAt;
    }

    public boolean isRead() {
        return readAt != null;
    }

}
