package kr.rilog.domain.notification.repository;

import kr.rilog.domain.notification.entity.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("""
            SELECT notification
            FROM Notification notification
            WHERE notification.recipientId = :recipientId
              AND (:unreadOnly = false OR notification.readAt IS NULL)
            ORDER BY notification.createdAt DESC, notification.id DESC
            """)
    Slice<Notification> findAllByRecipientId(
            @Param("recipientId") Long recipientId,
            @Param("unreadOnly") boolean unreadOnly,
            Pageable pageable
    );

}
